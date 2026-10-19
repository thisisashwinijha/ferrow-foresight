import { describe, it, expect } from 'vitest';
import {
  checkSchemaValid,
  checkEvidenceIdsExist,
  checkConfidenceThreshold,
  checkCertifications,
  checkLotoEnforced,
  checkSparesStock,
  checkCriticalityARouting,
  checkShiftMatch,
  checkPmDueDate,
  runAllGuardrails,
} from '../lib/guardrails';
import { getSeedData } from '../lib/data/db';

describe('Guardrail System: Rule 1 - Schema Valid', () => {
  const validPayload = {
    machine_id: 'P07-M03',
    failure_mode: 'bearing_wear',
    confidence: 0.85,
    urgency: 'P1',
    alert: true,
    insufficient_evidence: false,
    evidence: [{ id: 'E1', type: 'sensor', text: 'Vibration 6.1 mm/s' }],
    reasoning: 'Bearing degradation indicated by E1.',
    action_type: 'replace',
    recommended_action: 'Replace bearing under LOTO.',
    loto_required: true,
    required_certifications: ['Mechanical', 'LOTO'],
    assigned_technician: 'P07-T01',
    shadow_technician: 'P07-T07',
    proposed_window: {
      line_id: 'P07-L1',
      date: '2026-10-18',
      shift: 'A',
      window_type: 'planned_shutdown',
    },
    spares_check: [
      {
        part_id: 'SP-003',
        stock: 1,
        status: 'available',
        action: 'reserve',
      },
    ],
    spares_blocked: false,
    est_failure_cost_usd: 144000,
    est_intervention_cost_usd: 1450,
  };

  it('passes on a valid triage output schema', () => {
    const res = checkSchemaValid(validPayload);
    expect(res.pass).toBe(true);
    expect(res.rule).toBe('schema_valid');
  });

  it('fails when required fields are missing', () => {
    const invalid = { ...validPayload, machine_id: undefined };
    const res = checkSchemaValid(invalid);
    expect(res.pass).toBe(false);
    expect(res.failBehavior).toBe('needs_review');
    expect(res.detail).toContain('machine_id');
  });

  it('fails on invalid enum value', () => {
    const invalid = { ...validPayload, failure_mode: 'not_a_mode' };
    const res = checkSchemaValid(invalid);
    expect(res.pass).toBe(false);
    expect(res.detail).toContain('failure_mode');
  });
});

describe('Guardrail System: Rule 2 - Evidence IDs Exist', () => {
  it('passes when all cited IDs in reasoning exist in evidence list', () => {
    const reasoning = 'Based on high vibration in E1 and oil debris in E2, wear is imminent.';
    const evidence = [
      { id: 'E1', type: 'sensor', text: 'vibration' },
      { id: 'E2', type: 'observation', text: 'debris' },
    ];
    const res = checkEvidenceIdsExist(reasoning, evidence);
    expect(res.pass).toBe(true);
  });

  it('fails when reasoning cites an evidence ID that does not exist', () => {
    const reasoning = 'Confirmed by E1, E2, and unexpected rise in E3.';
    const evidence = [
      { id: 'E1', type: 'sensor', text: 'vibration' },
      { id: 'E2', type: 'observation', text: 'debris' },
    ];
    const res = checkEvidenceIdsExist(reasoning, evidence);
    expect(res.pass).toBe(false);
    expect(res.failBehavior).toBe('needs_review');
    expect(res.detail).toContain('E3');
  });

  it('fails when evidence list is empty', () => {
    const res = checkEvidenceIdsExist('General observation of motor noise.', []);
    expect(res.pass).toBe(false);
    expect(res.failBehavior).toBe('needs_review');
  });

  it('passes when alert has evidence items and reasoning contains no cited IDs', () => {
    const res = checkEvidenceIdsExist('Bearing wear observed during vibration round.', [
      { id: 'E1', type: 'sensor', text: 'vibration' },
    ]);
    expect(res.pass).toBe(true);
  });

  it('verifies that AL-1001 to AL-1008 all pass checkEvidenceIdsExist', () => {
    const seed = getSeedData();
    const alerts = (seed.alerts as any[]).slice(0, 8);
    for (const alert of alerts) {
      const res = checkEvidenceIdsExist(alert.reasoning, alert.evidence || []);
      expect(res.pass, `Alert ${alert.id} failed evidence check: ${res.detail}`).toBe(true);
    }
  });
});

describe('Guardrail System: Rule 3 - Confidence Threshold', () => {
  it('passes when confidence is at or above 0.70', () => {
    const res = checkConfidenceThreshold(true, 0.75, false);
    expect(res.pass).toBe(true);
  });

  it('suppresses alert when confidence is below 0.70', () => {
    const res = checkConfidenceThreshold(true, 0.62, false);
    expect(res.pass).toBe(false);
    expect(res.failBehavior).toBe('suppressed');
  });

  it('waives threshold check when insufficient_evidence is true', () => {
    const res = checkConfidenceThreshold(true, 0.45, true);
    expect(res.pass).toBe(true);
  });

  it('waives threshold check when alert is false', () => {
    const res = checkConfidenceThreshold(false, 0.30, false);
    expect(res.pass).toBe(true);
  });
});

describe('Guardrail System: Rule 4 - Certification Match with Expiry', () => {
  const referenceDate = '2026-10-18';
  const certs = [
    { technician_id: 'P07-T01', certification: 'Mechanical', valid_until: '2027-09-28' },
    { technician_id: 'P07-T01', certification: 'LOTO', valid_until: '2027-03-31' },
    { technician_id: 'P07-T04', certification: 'Mechanical', valid_until: '2027-01-15' },
    { technician_id: 'P07-T04', certification: 'LOTO', valid_until: '2026-09-30' }, // EXPIRED
  ];

  it('passes when technician holds all required certifications and none are expired', () => {
    const res = checkCertifications(
      'P07-T01',
      ['Mechanical', 'LOTO'],
      certs,
      referenceDate
    );
    expect(res.pass).toBe(true);
    expect(res.valid).toBe(true);
    expect(res.assignmentRemoved).toBe(false);
  });

  it('fails and removes assignment when technician has an expired certification', () => {
    const res = checkCertifications(
      'P07-T04',
      ['Mechanical', 'LOTO'],
      certs,
      referenceDate
    );
    expect(res.pass).toBe(false);
    expect(res.failBehavior).toBe('needs_review');
    expect(res.assignmentRemoved).toBe(true);
    expect(res.detail).toContain('expired');
  });

  it('fails and removes assignment when technician is missing a certification', () => {
    const res = checkCertifications(
      'P07-T01',
      ['Mechanical', 'Electrical HT'],
      certs,
      referenceDate
    );
    expect(res.pass).toBe(false);
    expect(res.assignmentRemoved).toBe(true);
    expect(res.detail).toContain('missing: Electrical HT');
  });
});

describe('Guardrail System: Rule 5 - LOTO Enforced', () => {
  it('enforces loto_required = true for repair', () => {
    const res = checkLotoEnforced('repair', 'bearing_wear', false, ['Mechanical']);
    expect(res.pass).toBe(false);
    expect(res.forcedLoto).toBe(true);
    expect(res.updatedCerts).toContain('LOTO');
  });

  it('enforces loto_required = true for replace', () => {
    const res = checkLotoEnforced('replace', 'belt_wear', false, []);
    expect(res.pass).toBe(false);
    expect(res.forcedLoto).toBe(true);
    expect(res.updatedCerts).toContain('LOTO');
  });

  it('enforces loto_required = true for electrical_fault', () => {
    const res = checkLotoEnforced('inspect', 'electrical_fault', false, ['Electrical LV']);
    expect(res.pass).toBe(false);
    expect(res.forcedLoto).toBe(true);
  });

  it('passes when loto_required is already true and LOTO cert present', () => {
    const res = checkLotoEnforced('repair', 'bearing_wear', true, ['Mechanical', 'LOTO']);
    expect(res.pass).toBe(true);
    expect(res.forcedLoto).toBe(false);
  });
});

describe('Guardrail System: Rule 6 - Spares Stock Re-checked Against Database', () => {
  const liveSpares = [
    { id: 'SP-001', stock: 5, part_no: 'PART-001' },
    { id: 'SP-002', stock: 0, part_no: 'PART-002' },
  ];

  it('passes when required spares are in stock', () => {
    const res = checkSparesStock([{ part_id: 'SP-001', stock: 1 }], liveSpares, false);
    expect(res.pass).toBe(true);
    expect(res.sparesBlocked).toBe(false);
  });

  it('overwrites spares_blocked to true when live database stock is 0', () => {
    const res = checkSparesStock([{ part_id: 'SP-002', stock: 1 }], liveSpares, false);
    expect(res.pass).toBe(false);
    expect(res.failBehavior).toBe('recheck_spares');
    expect(res.sparesBlocked).toBe(true);
    expect(res.detail).toContain('SP-002');
  });
});

describe('Guardrail System: Rule 7 - Criticality A with P1 Urgency Routed to Plant Head', () => {
  it('requires Plant Head approval for Criticality A and P1 urgency', () => {
    const res = checkCriticalityARouting('A', 'P1', 'Maintenance Lead');
    expect(res.pass).toBe(false);
    expect(res.requiresPlantHead).toBe(true);
    expect(res.failBehavior).toBe('route_plant_head');
  });

  it('passes when user role is Plant Head', () => {
    const res = checkCriticalityARouting('A', 'P1', 'Plant Head');
    expect(res.pass).toBe(true);
    expect(res.requiresPlantHead).toBe(true);
  });

  it('waives Plant Head routing for Criticality B assets', () => {
    const res = checkCriticalityARouting('B', 'P1', 'Maintenance Lead');
    expect(res.pass).toBe(true);
    expect(res.requiresPlantHead).toBe(false);
  });

  it('waives Plant Head routing for Criticality A assets with P2 urgency', () => {
    const res = checkCriticalityARouting('A', 'P2', 'Maintenance Lead');
    expect(res.pass).toBe(true);
    expect(res.requiresPlantHead).toBe(false);
  });
});

describe('Guardrail System: Rule 8 - Technician Shift Matches Proposed Window Shift', () => {
  it('passes when technician shift matches proposed window shift', () => {
    const res = checkShiftMatch('P07-T01', 'A', 'A');
    expect(res.pass).toBe(true);
    expect(res.assignmentRemoved).toBe(false);
  });

  it('fails and removes assignment when shift does not match', () => {
    const res = checkShiftMatch('P07-T01', 'B', 'A');
    expect(res.pass).toBe(false);
    expect(res.failBehavior).toBe('needs_review');
    expect(res.assignmentRemoved).toBe(true);
  });
});

describe('Guardrail System: Rule 9 - PM Schedule Rule', () => {
  it('passes when pull_forward moves due date earlier', () => {
    const res = checkPmDueDate('pull_forward', '2026-10-25', '2026-10-20');
    expect(res.pass).toBe(true);
  });

  it('fails when pull_forward tries to move due date later', () => {
    const res = checkPmDueDate('pull_forward', '2026-10-25', '2026-10-30');
    expect(res.pass).toBe(false);
    expect(res.failBehavior).toBe('needs_review');
  });

  it('passes when keep maintains original due date', () => {
    const res = checkPmDueDate('keep', '2026-10-25', '2026-10-25');
    expect(res.pass).toBe(true);
  });

  it('fails when keep moves due date later', () => {
    const res = checkPmDueDate('keep', '2026-10-25', '2026-10-28');
    expect(res.pass).toBe(false);
  });

  it('allows defer to move due date later', () => {
    const res = checkPmDueDate('defer', '2026-10-25', '2026-11-05');
    expect(res.pass).toBe(true);
  });
});

describe('Guardrail System: Master Integration (runAllGuardrails)', () => {
  it('processes full alert and applies overrides correctly', () => {
    const sampleAlert = {
      machine_id: 'P07-M03',
      failure_mode: 'bearing_wear',
      confidence: 0.88,
      urgency: 'P1',
      alert: true,
      insufficient_evidence: false,
      evidence: [{ id: 'E1', type: 'sensor', text: 'high vibe' }],
      reasoning: 'Observed rise in E1 indicates wear.',
      action_type: 'replace',
      recommended_action: 'Replace bearing',
      loto_required: false, // will be forced true
      required_certifications: ['Mechanical'],
      assigned_technician: 'P07-T04', // has expired LOTO cert
      proposed_window: {
        line_id: 'P07-L1',
        date: '2026-10-18',
        shift: 'A',
        window_type: 'planned_shutdown',
      },
      spares_check: [{ part_id: 'SP-002', stock: 1 }], // SP-002 has 0 in liveSpares
      spares_blocked: false,
      est_failure_cost_usd: 100000,
      est_intervention_cost_usd: 1500,
    };

    const outcome = runAllGuardrails(sampleAlert, {
      machineCriticality: 'A',
      userRole: 'Maintenance Lead', // Not Plant Head
      technicianShift: 'A',
      technicianCerts: [
        { technician_id: 'P07-T04', certification: 'Mechanical', valid_until: '2027-01-01' },
        { technician_id: 'P07-T04', certification: 'LOTO', valid_until: '2026-09-30' }, // expired
      ],
      liveSpares: [{ id: 'SP-002', stock: 0 }],
      referenceDate: '2026-10-18',
    });

    // 1. Should fail because LOTO was unflagged, technician cert expired, spares out of stock, and Crit A requires Plant Head
    expect(outcome.pass).toBe(false);
    expect(outcome.status).toBe('needs_review');
    expect(outcome.requiresPlantHead).toBe(true);

    // 2. Modified data should have enforced LOTO
    expect(outcome.modifiedData.loto_required).toBe(true);
    expect(outcome.modifiedData.required_certifications).toContain('LOTO');

    // 3. Technician assignment should be removed due to expired cert
    expect(outcome.modifiedData.assigned_technician).toBeNull();

    // 4. Spares blocked should be forced to true
    expect(outcome.modifiedData.spares_blocked).toBe(true);

    // 5. LOTO checklist should be provided
    expect(outcome.modifiedData.loto_checklist).toHaveLength(6);
  });
});
