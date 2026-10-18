import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getLocalStoreData,
  resetLocalStoreData,
  mutateLocalAlert,
  addLocalWorkOrder,
} from '@/lib/data/localStore';
import { triageService } from '@/lib/triageService';
import { runAllGuardrails, checkEvidenceIdsExist, FailureModeEnum } from '@/lib/guardrails';
import { Machine, Alert, WorkOrder } from '@/lib/types';
import { formatObservationTag } from '@/lib/lifecycle';
import { getAlertById } from '@/lib/data/alerts';
import { normalizeFailureMode, parseAgentResponse } from '@/lib/agents/parser';

describe('STEP 0: Fix approval on captured alerts', () => {
  beforeEach(() => {
    resetLocalStoreData();
  });

  it('captures observation on sensor machine P07-M03 with valid taxonomy, real sensor evidence, and passes guardrails', async () => {
    const result = await triageService({
      machine_id: 'P07-M03',
      plant_id: 'P-07',
      symptom_tags: ['sound:grinding', 'vibration:unusual_rattle'],
      note: 'Noticeable grinding vibration on motor-gearbox coupling interface during run.',
      technician_id: 'P07-T01',
    });

    expect(result.observation).toBeDefined();
    expect(result.observation!.id).toMatch(/^OBS-/);

    expect(result.alert).toBeDefined();
    expect(result.alert.id).toMatch(/^AL-/);

    // a) failure_mode must be strictly in taxonomy
    const taxonomyParse = FailureModeEnum.safeParse(result.alert.failure_mode);
    expect(taxonomyParse.success).toBe(true);
    expect(result.alert.failure_mode).toBe('misalignment');

    // Descriptive title must be in reasoning, NOT in failure_mode
    expect(result.alert.failure_mode).not.toContain('&');
    expect(result.alert.reasoning).toContain('Motor coupling misalignment & shaft eccentricity');

    // Must cite real evidence ids: observation id and sensor telemetry for sensor machine
    expect(result.alert.evidence.length).toBeGreaterThanOrEqual(2);
    expect(result.alert.evidence[0].id).toBe('E1');
    expect(result.alert.evidence[0].text).toContain(result.observation!.id);
    expect(result.alert.evidence[1].id).toBe('E2');
    expect(result.alert.evidence[1].type).toBe('sensor');
    expect(result.alert.evidence[1].text).toContain('vibration');

    // Reasoning cites E1 and E2
    expect(result.alert.reasoning).toContain('E1');
    expect(result.alert.reasoning).toContain('E2');

    // P07-M03 is Criticality A with P1 urgency, which requires Plant Head approval,
    // so initial status is needs_review per Rule 7 / Step 0 (b).
    expect(result.alert.status).toBe('needs_review');

    // When evaluated in Plant Head role context, guardrails pass completely
    const guardrailOutcome = runAllGuardrails(result.alert, {
      machineCriticality: 'A',
      technicianShift: 'A',
      technicianCerts: getLocalStoreData().certifications,
      liveSpares: getLocalStoreData().spares,
      userRole: 'Plant Head',
    });
    expect(guardrailOutcome.pass).toBe(true);
  });

  it('captures observation on legacy machine P07-M04 without sensors and creates valid alert', async () => {
    const result = await triageService({
      machine_id: 'P07-M04',
      plant_id: 'P-07',
      symptom_tags: ['heat:hot_to_touch', 'sound:rattle'],
      note: 'Thermal glue reservoir casing abnormally hot; mild acoustic rattle.',
      technician_id: 'P07-T01',
    });

    expect(result.observation).toBeDefined();
    expect(result.alert).toBeDefined();

    // Taxonomy check
    const taxonomyParse = FailureModeEnum.safeParse(result.alert.failure_mode);
    expect(taxonomyParse.success).toBe(true);

    // Legacy machine: cites observation E1
    expect(result.alert.evidence.length).toBe(1);
    expect(result.alert.evidence[0].id).toBe('E1');
    expect(result.alert.evidence[0].text).toContain(result.observation!.id);
    expect(result.alert.reasoning).toContain('E1');
    expect(result.alert.status).toBe('pending');
  });

  it('end-to-end approves a captured alert', async () => {
    const triage = await triageService({
      machine_id: 'P07-M03',
      plant_id: 'P-07',
      symptom_tags: ['sound:grinding', 'vibration:unusual_rattle'],
      note: 'Coupling misalignment suspected from grinding noise.',
      technician_id: 'P07-T01',
    });

    const alertId = triage.alert.id;

    // Approve the alert
    const approvedAlert = mutateLocalAlert(alertId, {
      status: 'approved',
      decided_by: 'Plant Head',
      decision_reason: 'Confirmed coupling realignment necessary',
    });
    expect(approvedAlert?.status).toBe('approved');

    // Generate Work Order
    const wo: any = {
      id: `WO-${alertId.replace('AL-', '')}`,
      alert_id: alertId,
      machine_id: triage.alert.machine_id,
      plant_id: triage.alert.plant_id,
      status: 'scheduled',
      priority: triage.alert.urgency,
      assigned_technician: triage.alert.assigned_technician,
      scheduled_window: triage.alert.proposed_window,
      created_at: new Date().toISOString(),
    };
    addLocalWorkOrder(wo);

    const store = getLocalStoreData();
    const storedAlert = store.alerts.find((a: any) => a.id === alertId);
    const storedWO = store.work_orders.find((w: any) => w.id === wo.id);

    expect(storedAlert.status).toBe('approved');
    expect(storedWO).toBeDefined();
    expect(storedWO.alert_id).toBe(alertId);
    expect(storedWO.status).toBe('scheduled');
  }, 15000);

  it('enforces that zero evidence IDs check fails with needs_review', () => {
    const zeroEvidence = checkEvidenceIdsExist('No evidence cited here.', []);
    expect(zeroEvidence.pass).toBe(false);
    expect(zeroEvidence.failBehavior).toBe('needs_review');

    const uncitedEvidence = checkEvidenceIdsExist('Some explanation.', [
      { id: 'E1', type: 'observation', text: 'Detail' } as any,
    ]);
    expect(uncitedEvidence.pass).toBe(false);
    expect(uncitedEvidence.failBehavior).toBe('needs_review');
  });

  it('formats observation tags into readable chips', () => {
    expect(formatObservationTag('sound:grinding')).toBe('Sound: grinding');
    expect(formatObservationTag('heat:hot_to_touch')).toBe('Heat: hot to touch');
    expect(formatObservationTag('vibration:unusual_rattle')).toBe('Vibration: unusual rattle');
    expect(formatObservationTag('#visual:smoke')).toBe('Visual: smoke');
    expect(formatObservationTag('noise')).toBe('Noise');
  });

  describe('STEP 1: Triage validation & missing alert fixes', () => {
    it('normalises failure mode variations and synonyms properly without schema errors', () => {
      expect(normalizeFailureMode('electrical').mode).toBe('electrical_fault');
      expect(normalizeFailureMode('ELECTRICAL FAULT').mode).toBe('electrical_fault');
      expect(normalizeFailureMode('overheating').mode).toBe('motor_overheating');
      expect(normalizeFailureMode('motor-overheating').mode).toBe('motor_overheating');
      expect(normalizeFailureMode('bearing wear').mode).toBe('bearing_wear');
      expect(normalizeFailureMode('none').mode).toBe('none');
      expect(normalizeFailureMode('sensor_fault').mode).toBe('sensor_fault');
      expect(normalizeFailureMode('unknown').mode).toBe('unknown');

      // Unrecognized string falls back to unknown with normalized: false
      const unrecognized = normalizeFailureMode('completely_random_defect');
      expect(unrecognized.mode).toBe('unknown');
      expect(unrecognized.normalized).toBe(false);
    });

    it('captures typed observation on P07-M05, alert immediately opens via getAlertById, and can be approved', async () => {
      const result = await triageService({
        machine_id: 'P07-M05',
        plant_id: 'P-07',
        symptom_tags: ['sound:squeal', 'vibration:unusual_rattle'],
        note: 'Drive belt squeal and loose pulley vibration noticed on wrapper motor.',
        technician_id: 'P07-T03',
      });

      expect(result.alert).toBeDefined();
      expect(result.alert.id).toMatch(/^AL-/);

      // Must be immediately readable at getAlertById
      const openedAlert = await getAlertById(result.alert.id, 'P-07');
      expect(openedAlert).toBeDefined();
      expect(openedAlert?.id).toBe(result.alert.id);
      expect(openedAlert?.machine_id).toBe('P07-M05');

      // Planner approves alert
      const approved = mutateLocalAlert(result.alert.id, {
        status: 'approved',
        decided_by: 'Maintenance Planner',
        decision_reason: 'Verified drive belt tension and wear on-site',
      });
      expect(approved?.status).toBe('approved');
    });

    it('captures Hinglish note on P07-M30 (MCC-3), routes to HT electrician on Shift C, opens and can be approved', async () => {
      const result = await triageService({
        machine_id: 'P07-M30',
        plant_id: 'P-07',
        symptom_tags: ['smell:burning', 'sound:hiss'],
        note: 'Panel ke paas jalne ki smell aa rahi hai, contactor bhinbhina raha hai.',
        technician_id: 'P07-T01',
      });

      expect(result.alert).toBeDefined();
      expect(result.alert.failure_mode).toBe('electrical_fault');
      expect(result.alert.urgency).toBe('P1');
      expect(result.alert.required_certifications).toContain('Electrical HT');

      // Must be immediately readable at getAlertById
      const openedAlert = await getAlertById(result.alert.id, 'P-07');
      expect(openedAlert).toBeDefined();
      expect(openedAlert?.id).toBe(result.alert.id);

      // P1 on Criticality A MCC requires Plant Head approval
      const approved = mutateLocalAlert(result.alert.id, {
        status: 'approved',
        decided_by: 'Plant Head',
        decision_reason: 'Approved for urgent MCC contactor replacement by HT Electrician',
      });
      expect(approved?.status).toBe('approved');
    });

    it('captures observation on sensor machine P07-M03, immediately opens via getAlertById, and can be approved', async () => {
      const result = await triageService({
        machine_id: 'P07-M03',
        plant_id: 'P-07',
        symptom_tags: ['sound:grinding', 'vibration:unusual_rattle'],
        note: 'Heavy grinding vibration in main bearing housing.',
        technician_id: 'P07-T01',
      });

      expect(result.alert).toBeDefined();
      const openedAlert = await getAlertById(result.alert.id, 'P-07');
      expect(openedAlert).toBeDefined();
      expect(openedAlert?.id).toBe(result.alert.id);

      // P07-M03 is Criticality A -> Plant Head approves
      const approved = mutateLocalAlert(result.alert.id, {
        status: 'approved',
        decided_by: 'Plant Head',
        decision_reason: 'Approved bearing replacement on main case packer drive',
      });
      expect(approved?.status).toBe('approved');
    });
  });
});
