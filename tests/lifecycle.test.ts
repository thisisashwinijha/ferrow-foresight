import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getDerivedMachineTileState,
  getBaselineRiskScore,
  getBaselineHealthScore,
  getRecentActivityEvents,
} from '@/lib/lifecycle';
import { triageService } from '@/lib/triageService';
import { Machine, Alert, WorkOrder } from '@/lib/types';

describe('Machine Lifecycle State Derivation', () => {
  const baseMachine: any = {
    id: 'P07-M03',
    name: 'Roughing Stand 1',
    plant_id: 'P-07',
    line_id: 'L-01',
    type: 'Roughing Stand',
    tier: 'sensor_rich',
    has_sensors: true,
    status: 'running',
    criticality: 'A',
    strategy: 'CBM',
    pm_interval_days: 60,
    health_score: 86,
    risk_score: 14,
    vibration_baseline: 1.8,
    temperature_baseline: 55,
  };

  const p1Alert: any = {
    id: 'AL-1001',
    machine_id: 'P07-M03',
    plant_id: 'P-07',
    trigger: 'telemetry_anomaly',
    failure_mode: 'bearing_inner_race_fault',
    urgency: 'P1',
    est_failure_hours: 48,
    est_failure_cost_usd: 125000,
    confidence: 0.94,
    recommended_action: 'Replace drive-end spherical roller bearing',
    required_certifications: ['Vibration Analysis Level II'],
    loto_required: true,
    assigned_technician: 'P07-T01',
    status: 'pending',
    created_at: '2026-10-18T06:00:00Z',
  };

  const inProgressWO: any = {
    id: 'WO-1001',
    alert_id: 'AL-1001',
    machine_id: 'P07-M03',
    plant_id: 'P-07',
    status: 'in_progress',
    priority: 'P1',
    assigned_technician: 'P07-T01',
    loto_permit_no: 'LOTO-P07-1001',
    loto_steps_completed: [0, 1, 2, 3, 4],
    task_steps_completed: [0],
    created_at: '2026-10-18T07:00:00Z',
  };

  const scheduledWO: any = {
    id: 'WO-1002',
    machine_id: 'P07-M03',
    plant_id: 'P-07',
    status: 'scheduled',
    priority: 'P2',
    assigned_technician: 'P07-T01',
    scheduled_window: {
      date: '2026-10-19',
      shift: 'A',
      line_id: 'L-01',
    },
    created_at: '2026-10-18T07:00:00Z',
  };

  it('priority 1: open alert overrides active work order and normal running', () => {
    const tile = getDerivedMachineTileState(baseMachine, [p1Alert], [inProgressWO]);
    expect(tile.state).toBe('alert');
    expect(tile.urgency).toBe('P1');
    expect(tile.isAbnormal).toBe(true);
    expect(tile.iconType).toBe('alert');
    expect(tile.colorClasses.tileBg).toContain('alarm');
  });

  it('priority 2: in_progress or loto_applied work order renders wrench and NEVER alarm colours', () => {
    // When alert is no longer pending (e.g. approved)
    const approvedAlert: Alert = { ...p1Alert, status: 'approved' };
    const tile = getDerivedMachineTileState(baseMachine, [approvedAlert], [inProgressWO]);
    expect(tile.state).toBe('in_progress');
    expect(tile.iconType).toBe('wrench');
    expect(tile.isAbnormal).toBe(true);
    // Crucial rule: under maintenance NEVER uses alarm colours
    expect(tile.colorClasses.tileBg).toBe('bg-surface-2');
    expect(tile.colorClasses.text).toBe('text-ink');
    expect(tile.colorClasses.tileBg).not.toContain('alarm');
    expect(tile.colorClasses.tileBg).not.toContain('critical');
  });

  it('priority 3: scheduled/approved work order renders neutral calendar icon', () => {
    const approvedAlert: Alert = { ...p1Alert, status: 'approved' };
    const tile = getDerivedMachineTileState(baseMachine, [approvedAlert], [scheduledWO]);
    expect(tile.state).toBe('scheduled');
    expect(tile.iconType).toBe('calendar');
    expect(tile.isAbnormal).toBe(false);
    expect(tile.detailLabel).toContain('WO-1002');
  });

  it('priority 4: closed work order returns machine tile to normal nominal state', () => {
    const closedWO: WorkOrder = { ...inProgressWO, status: 'closed', closed_at: '2026-10-18T10:00:00Z' };
    const resolvedAlert: Alert = { ...p1Alert, status: 'resolved' };
    const tile = getDerivedMachineTileState(baseMachine, [resolvedAlert], [closedWO]);
    expect(tile.state).toBe('normal');
    expect(tile.badgeLabel).toBe('Running');
    expect(tile.iconType).toBe('normal');
    expect(tile.isAbnormal).toBe(false);
  });
});

describe('Criticality Baseline Calculations', () => {
  it('computes correct baseline risk and health for criticality A', () => {
    expect(getBaselineRiskScore('A')).toBe(14);
    expect(getBaselineHealthScore('A')).toBe(86);
  });

  it('computes correct baseline risk and health for criticality B', () => {
    expect(getBaselineRiskScore('B')).toBe(9);
    expect(getBaselineHealthScore('B')).toBe(91);
  });

  it('computes correct baseline risk and health for criticality C', () => {
    expect(getBaselineRiskScore('C')).toBe(5);
    expect(getBaselineHealthScore('C')).toBe(95);
  });
});

describe('Recent Activity Events', () => {
  it('builds chronological event stream for alerts and work orders', () => {
    const alerts: any[] = [
      {
        id: 'AL-1001',
        machine_id: 'P07-M03',
        plant_id: 'P-07',
        trigger: 'telemetry_anomaly',
        failure_mode: 'bearing_wear',
        urgency: 'P1',
        est_failure_hours: 24,
        est_failure_cost_usd: 80000,
        confidence: 0.92,
        recommended_action: 'Replace bearing',
        status: 'approved',
        created_at: '2026-10-18T05:00:00Z',
      },
    ];

    const workOrders: any[] = [
      {
        id: 'WO-1001',
        alert_id: 'AL-1001',
        machine_id: 'P07-M03',
        plant_id: 'P-07',
        status: 'closed',
        priority: 'P1',
        assigned_technician: 'P07-T01',
        loto_permit_no: 'LOTO-P07-1001',
        closed_at: '2026-10-18T09:30:00Z',
        root_cause: 'Fatigue wear on inner race',
        created_at: '2026-10-18T06:00:00Z',
      },
    ];

    const events = getRecentActivityEvents(alerts, workOrders);
    expect(events.length).toBeGreaterThan(0);

    // Closed work order event
    const closedEvent = events.find((e) => e.type === 'wo_closed');
    expect(closedEvent).toBeDefined();
    expect(closedEvent?.badge.label).toBe('Resolved');

    // LOTO applied event
    const lotoEvent = events.find((e) => e.type === 'loto_applied');
    expect(lotoEvent).toBeDefined();
    expect(lotoEvent?.title).toContain('LOTO-P07-1001');

    // Events sorted descending
    for (let i = 0; i < events.length - 1; i++) {
      expect(events[i].timestamp >= events[i + 1].timestamp).toBe(true);
    }
  });
});

describe('Technician Sensory Capture & Triage Service', () => {
  it('triageService synthesizes sensory tags and creates an observation and triage alert', async () => {
    const result = await triageService({
      machine_id: 'P07-M04',
      plant_id: 'P-07',
      symptom_tags: ['sound:grinding', 'heat:hot_to_touch'],
      note: 'Audible loud grinding noise coming from drive-side bearing. Casing feels hot.',
      technician_id: 'P07-T01',
    });

    expect(result.observation).toBeDefined();
    expect(result.observation!.id).toMatch(/^OBS-/);
    expect(result.observation!.machine_id).toBe('P07-M04');

    expect(result.alert).toBeDefined();
    expect(result.alert.id).toMatch(/^AL-/);
    expect(result.alert.status).toBe('pending');
    expect(['P1', 'P2', 'P3']).toContain(result.alert.urgency);
    expect(result.alert.failure_mode.toLowerCase()).toContain('bearing');
    expect(result.alert.recommended_action).toBeDefined();
  });
});
