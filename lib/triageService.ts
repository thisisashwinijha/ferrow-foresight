import { Alert, Observation, Machine, AlertUrgency, FailureMode } from './types';
import { getMachineByIdSync } from './data/machines';
import { getSensorReadingsForMachineSync } from './data/sensorReadings';
import { addLocalAlert, addLocalObservation, getLocalStoreData } from './data/localStore';
import { getSupabaseAdminClient } from './supabaseAdmin';
import { runAllGuardrails } from './guardrails';

export interface TriageInput {
  machine_id: string;
  plant_id: string;
  symptom_tags: string[];
  note: string;
  technician_id: string;
}

export interface TriageResult {
  observation: Observation;
  alert: Alert;
}

/**
 * Single server function for triage.
 * Runs rule-based triage on technician sensory capture to synthesize an Alert.
 * Adheres strictly to the prompts/triage_planner.md failure_mode taxonomy
 * and verifies output through guardrails.
 */
export async function triageService(input: TriageInput): Promise<TriageResult> {
  const machine = getMachineByIdSync(input.machine_id) || {
    id: input.machine_id,
    plant_id: input.plant_id,
    line_id: 'P07-L1',
    criticality: 'B',
    has_sensors: false,
  };

  const now = new Date().toISOString();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const obsId = `OBS-${randomSuffix}`;
  const alertId = `AL-${randomSuffix}`;

  // 1. Create Observation
  const observation: Observation = {
    id: obsId,
    machine_id: input.machine_id,
    technician_id: input.technician_id,
    created_at: now,
    symptom_tags: input.symptom_tags,
    note: input.note,
    source: 'technician_capture',
    plant_id: input.plant_id,
    processed: true,
  };

  // 2. Rule-based failure mode taxonomy mapping & urgency synthesis
  // Taxonomy strictly from prompts/triage_planner.md:
  // bearing_wear | belt_wear | misalignment | lubrication_failure | motor_overheating |
  // hydraulic_leak | seal_failure | electrical_fault | pneumatic_leak | sensor_fault | unknown | none
  const tags = input.symptom_tags.map((t) => t.toLowerCase());
  const noteLower = (input.note || '').toLowerCase();

  let failureMode: FailureMode = 'unknown';
  let descriptiveTitle = 'Mechanical degradation and assembly looseness';
  let urgency: AlertUrgency = 'P3';
  let actionType: any = 'inspect';
  let recommendedAction = 'Perform on-site physical inspection to gather additional sensory evidence.';
  let insufficientEvidence = false;
  let confidence = 0.88;
  let requiredCerts = ['Mechanical', 'LOTO'];
  let assignedTechId = 'P07-T01';
  let assignedShift = 'A';
  let sparesCheck: any[] = [];

  const store = getLocalStoreData();
  const allSpares = (store.spares as any[]) || [];

  if (
    tags.some((t) => t.includes('vibration')) ||
    noteLower.includes('misalignment') ||
    noteLower.includes('coupling') ||
    noteLower.includes('eccentricity') ||
    noteLower.includes('grinding') ||
    noteLower.includes('shake')
  ) {
    if (noteLower.includes('bearing') && !noteLower.includes('coupling')) {
      failureMode = 'bearing_wear';
      descriptiveTitle = 'Bearing raceway spalling & fatigue wear';
      actionType = 'replace';
      recommendedAction = 'Apply LOTO. Inspect bearing raceway for spalling and replace worn bearing assembly.';
      const sp = allSpares.find((s) => s.part_no === 'SP-003' || s.id === 'P07-SP-003');
      if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-003', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
    } else {
      failureMode = 'misalignment';
      descriptiveTitle = 'Motor coupling misalignment & shaft eccentricity';
      actionType = 'repair';
      recommendedAction = 'Apply LOTO. Perform dial-indicator shaft alignment check, inspect coupling spider insert, and realign motor-to-gearbox coupling.';
      const sp = allSpares.find((s) => s.part_no === 'SP-011' || s.id === 'P07-SP-011');
      if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-011', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
    }
    urgency = machine.criticality === 'A' ? 'P1' : 'P2';
    requiredCerts = ['Mechanical', 'LOTO'];
    assignedTechId = 'P07-T01';
    assignedShift = 'A';
  } else if (tags.some((t) => t.includes('heat')) || noteLower.includes('overheat') || noteLower.includes('hot')) {
    if (noteLower.includes('motor') || noteLower.includes('casing')) {
      failureMode = 'motor_overheating';
      descriptiveTitle = 'Motor casing thermal elevation & stator stress';
    } else {
      failureMode = 'bearing_wear';
      descriptiveTitle = 'Bearing overheating & lubrication breakdown';
    }
    urgency = machine.criticality === 'A' ? 'P1' : 'P2';
    actionType = 'replace';
    recommendedAction = 'Apply LOTO. Inspect bearing raceway for spalling, check thermal degradation, and repack or replace bearing assembly.';
    requiredCerts = ['Mechanical', 'LOTO'];
    assignedTechId = 'P07-T01';
    assignedShift = 'A';
    const sp = allSpares.find((s) => s.part_no === 'SP-003' || s.id === 'P07-SP-003');
    if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-003', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
  } else if (
    tags.some((t) => t.includes('smell')) ||
    noteLower.includes('burn') ||
    noteLower.includes('smoke') ||
    noteLower.includes('ozone') ||
    noteLower.includes('spark') ||
    noteLower.includes('breaker') ||
    noteLower.includes('tripping')
  ) {
    if (noteLower.includes('belt') || noteLower.includes('pulley') || noteLower.includes('squeal')) {
      failureMode = 'belt_wear';
      descriptiveTitle = 'Drive belt slippage & friction thermal breakdown';
      urgency = 'P1';
      actionType = 'replace';
      recommendedAction = 'Apply LOTO immediately. Isolate electrical feed, inspect drive belts for friction wear, and replace tensioner pulley.';
      requiredCerts = ['Mechanical', 'LOTO'];
      assignedTechId = 'P07-T01';
      assignedShift = 'A';
      const sp = allSpares.find((s) => s.part_no === 'SP-004' || s.id === 'P07-SP-004');
      if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-004', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
    } else {
      failureMode = 'electrical_fault';
      descriptiveTitle = 'Electrical contact degradation & contactor overheating';
      urgency = 'P1';
      actionType = 'replace';
      recommendedAction = 'Apply LOTO immediately. Isolate electrical feed, inspect contactors and thermal overload relay, and replace degraded components.';
      requiredCerts = ['Electrical LV', 'LOTO'];
      assignedTechId = 'P07-T02';
      assignedShift = 'C';
      const sp = allSpares.find((s) => s.part_no === 'SP-012' || s.id === 'P07-SP-012');
      if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-012', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
    }
  } else if (tags.some((t) => t.includes('sound')) || noteLower.includes('rattl') || noteLower.includes('clank') || noteLower.includes('squeal')) {
    if (noteLower.includes('squeal')) {
      failureMode = 'belt_wear';
      descriptiveTitle = 'Drive belt tension loss & pulley slippage';
      requiredCerts = ['Mechanical', 'LOTO'];
      assignedTechId = 'P07-T01';
      assignedShift = 'A';
    } else {
      failureMode = 'bearing_wear';
      descriptiveTitle = 'Acoustic anomaly: transmission bearing fatigue';
      requiredCerts = ['Mechanical', 'LOTO'];
      assignedTechId = 'P07-T01';
      assignedShift = 'A';
    }
    urgency = machine.criticality === 'A' ? 'P2' : 'P3';
    actionType = 'inspect';
    recommendedAction = 'Apply LOTO. Remove safety guards, check transmission play, and inspect bearings for acoustic wear.';
  } else if (tags.some((t) => t.includes('leak')) || noteLower.includes('hydraulic') || noteLower.includes('fluid')) {
    failureMode = 'hydraulic_leak';
    descriptiveTitle = 'Hydraulic pressure line leakage & seal degradation';
    urgency = machine.criticality === 'A' ? 'P1' : 'P2';
    actionType = 'repair';
    recommendedAction = 'Apply LOTO and depressurize hydraulic loop. Inspect high-pressure fittings and replace degraded seals.';
    requiredCerts = ['Hydraulics', 'LOTO'];
    assignedTechId = 'P07-T01';
    assignedShift = 'A';
    const sp = allSpares.find((s) => s.part_no === 'SP-008' || s.id === 'P07-SP-008');
    if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-008', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
  } else if (tags.some((t) => t.includes('hiss')) || noteLower.includes('pneumatic') || noteLower.includes('air')) {
    failureMode = 'pneumatic_leak';
    descriptiveTitle = 'Pneumatic line pressure drop & fitting seal leak';
    urgency = 'P3';
    actionType = 'repair';
    recommendedAction = 'Apply LOTO and bleed air pressure. Replace leaking pneumatic fitting and verify line pressure.';
    requiredCerts = ['Pneumatics', 'LOTO'];
    assignedTechId = 'P07-T03';
    assignedShift = 'A';
    const sp = allSpares.find((s) => s.part_no === 'SP-019' || s.id === 'P07-SP-019');
    if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-019', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
  } else {
    failureMode = 'unknown';
    descriptiveTitle = 'Vague sensory indicators with insufficient diagnostic evidence';
    insufficientEvidence = true;
    confidence = 0.5;
    urgency = 'P3';
    actionType = 'inspect';
    recommendedAction = 'Conduct thorough physical inspection, retorque structural bolts, and log baseline acoustic/thermal readings.';
    requiredCerts = ['Mechanical', 'LOTO'];
    assignedTechId = 'P07-T01';
    assignedShift = 'A';
  }

  // 3. Evidence synthesis: cite real observation id and real sensor readings when available
  const evidence: Array<{ id: string; type: string; text: string }> = [
    {
      id: 'E1',
      type: 'observation',
      text: `Observation ${obsId}: ${input.note} (Tags: ${input.symptom_tags.join(', ')})`,
    },
  ];

  let sensorCitation = '';
  if (machine.has_sensors) {
    const readings = getSensorReadingsForMachineSync(input.machine_id, 1);
    const latest = readings[0];
    if (latest) {
      evidence.push({
        id: 'E2',
        type: 'sensor',
        text: `Sensor telemetry on ${latest.date}: vibration ${latest.vibration_mm_s} mm/s, temperature ${latest.temperature_c}°C (quality: ${latest.data_quality})`,
      });
      sensorCitation = ` Sensor telemetry cited in E2 shows ${latest.vibration_mm_s} mm/s vibration and ${latest.temperature_c}°C temperature.`;
    }
  }

  const reasoning = `Technician observation cited in E1 (${obsId}) reported sensory cues [${input.symptom_tags.join(', ')}] on asset ${input.machine_id}.${sensorCitation} Diagnostic findings indicate ${descriptiveTitle}.`;

  // 4. Create candidate alert
  const alertCandidate: Alert = {
    id: alertId,
    machine_id: input.machine_id,
    plant_id: input.plant_id,
    created_at: now,
    trigger: `Sensory capture: ${input.symptom_tags.join(', ')}`,
    risk_score: urgency === 'P1' ? 84 : urgency === 'P2' ? 68 : 42,
    failure_mode: failureMode,
    confidence,
    urgency,
    insufficient_evidence: insufficientEvidence,
    evidence,
    reasoning,
    recommended_action: recommendedAction,
    action_type: actionType,
    required_certifications: requiredCerts,
    loto_required: true,
    assigned_technician: assignedTechId,
    shadow_technician: assignedShift === 'A' ? 'P07-T08' : 'P07-T07',
    proposed_window: {
      line_id: (machine as any).line_id || 'P07-L1',
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      shift: assignedShift,
      window_type: 'changeover',
      production_loss_units: 0,
      note: 'Changeover window aligned to shift schedule',
    },
    spares_check: sparesCheck,
    est_failure_cost_usd: machine.criticality === 'A' ? 24000 : 12000,
    est_intervention_cost_usd: 950,
    status: 'pending',
    decided_by: null,
    decision_reason: null,
    source: 'technician_capture',
    prompt_version: 'triage-v1.0',
  };

  // 5. Run Guardrail Engine on candidate alert
  const guardrailOutcome = runAllGuardrails(alertCandidate, {
    machineCriticality: machine.criticality,
    technicianShift: assignedShift,
    technicianCerts: store.certifications || [],
    liveSpares: store.spares || [],
    userRole: 'Maintenance Planner',
    referenceDate: '2026-10-18',
  });

  // STEP 0 (b): When guardrails fail, status must be needs_review (never pending)
  const finalStatus = guardrailOutcome.pass ? 'pending' : (guardrailOutcome.status === 'suppressed' ? 'suppressed' : 'needs_review');

  const alert: Alert = {
    ...alertCandidate,
    status: finalStatus,
    assigned_technician: guardrailOutcome.modifiedData.assigned_technician,
    loto_required: guardrailOutcome.modifiedData.loto_required,
    required_certifications: guardrailOutcome.modifiedData.required_certifications,
  };

  // 6. Save locally
  addLocalObservation(observation);
  addLocalAlert(alert);

  // 7. If Supabase is reachable, persist
  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      await admin.from('observations').insert(observation);
      await admin.from('alerts').insert(alert);
    } catch (e) {
      console.warn('Could not sync triage observation/alert to Supabase:', e);
    }
  }

  return { observation, alert };
}
