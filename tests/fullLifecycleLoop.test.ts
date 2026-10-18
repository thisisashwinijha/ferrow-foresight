import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getLocalStoreData,
  resetLocalStoreData,
  mutateLocalAlert,
  addLocalWorkOrder,
  mutateLocalWorkOrder,
  closeLocalWorkOrder,
} from '@/lib/data/localStore';
import {
  getDerivedMachineTileState,
  getBaselineRiskScore,
  getBaselineHealthScore,
} from '@/lib/lifecycle';
import { triageService } from '@/lib/triageService';
import { Machine, Alert, WorkOrder } from '@/lib/types';
import { STANDARD_LOTO_CHECKLIST } from '@/lib/guardrails';

describe('Full Lifecycle Loop E2E: P07-M03 (Alert -> LOTO -> Tasks -> Close -> Tile Restore)', () => {
  beforeEach(() => {
    resetLocalStoreData();
  });

  it('runs complete lifecycle from alert triage to closure and machine restoration', async () => {
    // STEP 1: Verify Initial State
    const initialData = getLocalStoreData();
    const machine = initialData.machines.find((m: Machine) => m.id === 'P07-M03');
    expect(machine).toBeDefined();

    const alert = initialData.alerts.find((a: Alert) => a.id === 'AL-1001');
    expect(alert).toBeDefined();
    expect(alert.status).toBe('pending');
    expect(alert.urgency).toBe('P1');

    // Initial tile state must be 'alert'
    const tileInitial = getDerivedMachineTileState(machine, [alert], []);
    expect(tileInitial.state).toBe('alert');
    expect(tileInitial.urgency).toBe('P1');
    expect(tileInitial.isAbnormal).toBe(true);

    // STEP 2: Approve Alert -> Work Order Scheduled
    const approvedAlert = mutateLocalAlert('AL-1001', {
      status: 'approved',
      decided_by: 'Plant Head',
      decision_reason: 'Approved for Sunday shutdown',
    });
    expect(approvedAlert?.status).toBe('approved');

    const newWO: any = {
      id: 'WO-1001',
      alert_id: 'AL-1001',
      machine_id: 'P07-M03',
      plant_id: 'P-07',
      status: 'scheduled',
      priority: 'P1',
      assigned_technician: 'P07-T01',
      scheduled_window: {
        date: '2026-10-18',
        shift: 'A',
        line_id: 'L-01',
      },
      task_steps: [
        'Isolate motor drive and tag out breakers',
        'Extract damaged bearing using hydraulic puller',
        'Inspect shaft seating for scoring',
        'Mount replacement spherical roller bearing with induction heater',
        'Verify alignment and test vibration baseline',
      ],
      loto_steps_completed: [],
      task_steps_completed: [],
      created_at: new Date().toISOString(),
    };
    addLocalWorkOrder(newWO);

    // Tile state now scheduled (calendar, neutral, not alarm)
    const tileScheduled = getDerivedMachineTileState(machine, [approvedAlert!], [newWO]);
    expect(tileScheduled.state).toBe('scheduled');
    expect(tileScheduled.iconType).toBe('calendar');
    expect(tileScheduled.isAbnormal).toBe(false);

    // STEP 3: LOTO Sequential Gating
    // Complete steps 0 through 4
    let currentWO: any = newWO;
    for (let stepIdx = 0; stepIdx < STANDARD_LOTO_CHECKLIST.length; stepIdx++) {
      const updatedSteps = [...currentWO.loto_steps_completed, stepIdx];
      const isComplete = updatedSteps.length >= STANDARD_LOTO_CHECKLIST.length;
      currentWO = mutateLocalWorkOrder(currentWO.id, {
        loto_steps_completed: updatedSteps,
        loto_permit_no: isComplete ? 'LOTO-P07-1001' : undefined,
        status: isComplete ? 'loto_applied' : 'scheduled',
      } as any)!;
    }

    expect(currentWO.status).toBe('loto_applied');
    expect(currentWO.loto_permit_no).toBe('LOTO-P07-1001');

    // Tile state under LOTO: in_progress with wrench, NEVER alarm colours
    const tileLoto = getDerivedMachineTileState(machine, [approvedAlert!], [currentWO]);
    expect(tileLoto.state).toBe('in_progress');
    expect(tileLoto.badgeLabel).toBe('LOTO applied');
    expect(tileLoto.iconType).toBe('wrench');
    expect(tileLoto.colorClasses.tileBg).toBe('bg-surface-2');

    // STEP 4: First Task Step Confirmed -> Work Order in_progress
    currentWO = mutateLocalWorkOrder(currentWO.id, {
      task_steps_completed: [0],
      status: 'in_progress',
    } as any)!;
    expect(currentWO.status).toBe('in_progress');

    const tileInProgress = getDerivedMachineTileState(machine, [approvedAlert!], [currentWO]);
    expect(tileInProgress.state).toBe('in_progress');
    expect(tileInProgress.badgeLabel).toBe('In progress');
    expect(tileInProgress.iconType).toBe('wrench');
    expect(tileInProgress.colorClasses.tileBg).toBe('bg-surface-2');

    // STEP 5: Close Work Order
    // Provide root cause, closure notes, downtime hours, parts used
    const closureResult = closeLocalWorkOrder({
      work_order_id: currentWO.id,
      machine_id: 'P07-M03',
      plant_id: 'P-07',
      alert_id: 'AL-1001',
      root_cause: 'Fatigue wear on inner race from excessive axial preload',
      closure_notes: 'Spherical roller bearing replaced, lubricated with ISO VG 220 grease.',
      actual_downtime_hours: 2.5,
      parts_used: [{ spare_id: 'P07-SP-001', quantity: 1 }],
      closed_by: 'P07-T01',
    });

    expect(closureResult?.success).toBe(true);
    expect(closureResult?.workOrder.status).toBe('closed');
    expect(closureResult?.machine.status).toBe('running');

    // Risk score restored to baseline (14 for Crit A), health restored to 86
    expect(closureResult?.machine.risk_score).toBe(getBaselineRiskScore('A'));
    expect(closureResult?.machine.health_score).toBe(getBaselineHealthScore('A'));

    // Spares stock was deducted
    const afterData = getLocalStoreData();
    const spare = afterData.spares.find((s: any) => s.id === 'P07-SP-001');
    expect(spare.stock).toBe(13); // was 14 in seed

    // Maintenance log was created
    const logs = afterData.maintenance_log || afterData.maintenance_logs || [];
    const log = logs.find((l: any) => l.machine_id === 'P07-M03');
    expect(log).toBeDefined();
    expect(log.downtime_hours).toBe(2.5);

    // Alert marked as resolved
    const resolvedAlert = afterData.alerts.find((a: any) => a.id === 'AL-1001');
    expect(resolvedAlert.status).toBe('resolved');

    // CRUCIAL: Machine Tile returns to normal!
    const tileFinal = getDerivedMachineTileState(
      closureResult!.machine,
      [resolvedAlert],
      [closureResult!.workOrder]
    );
    expect(tileFinal.state).toBe('normal');
    expect(tileFinal.badgeLabel).toBe('Running');
    expect(tileFinal.isAbnormal).toBe(false);
  });

  it('captures floor observation on legacy asset and raises pending alert', async () => {
    const result = await triageService({
      machine_id: 'P07-M04',
      plant_id: 'P-07',
      symptom_tags: ['sound:grinding', 'visual:smoke'],
      note: 'Faint smoke and grinding noise detected during walkaround.',
      technician_id: 'P07-T01',
    });

    expect(result.observation).toBeDefined();
    expect(result.alert).toBeDefined();
    expect(result.alert.status).toBe('pending');
    expect(result.alert.machine_id).toBe('P07-M04');

    // Confirm it appears in store alerts
    const store = getLocalStoreData();
    const foundAlert = store.alerts.find((a: any) => a.id === result.alert.id);
    expect(foundAlert).toBeDefined();
    expect(foundAlert.status).toBe('pending');

    // Check Needs Attention filter: pending alert of urgency P1/P2
    const attentionAlerts = store.alerts.filter(
      (a: any) => (a.status === 'pending' || a.status === 'needs_review') && (a.urgency === 'P1' || a.urgency === 'P2')
    );
    expect(attentionAlerts.some((a: any) => a.id === result.alert.id)).toBe(true);
  });

  it('resetLocalStoreData cleanly restores baseline state', () => {
    // Mutate state
    mutateLocalAlert('AL-1001', { status: 'rejected' });
    let store = getLocalStoreData();
    expect(store.alerts.find((a: any) => a.id === 'AL-1001').status).toBe('rejected');

    // Reset
    resetLocalStoreData();
    store = getLocalStoreData();
    expect(store.alerts.find((a: any) => a.id === 'AL-1001').status).toBe('pending');
  });
});
