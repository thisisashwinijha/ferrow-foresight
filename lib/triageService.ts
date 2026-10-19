import { Alert, Observation, Machine, AlertUrgency, FailureMode } from './types';
import { getMachineByIdSync } from './data/machines';
import { getSensorReadingsForMachineSync } from './data/sensorReadings';
import {
  addLocalAlert,
  addLocalObservation,
  getLocalStoreData,
  mutateLocalAlert,
} from './data/localStore';
import { runAllGuardrails } from './guardrails';
import { executeAgent, AgentExecutionResult } from './agents';
import {
  getEligibleShadowTechnicians,
  normalizeAlertShadowTechnician,
} from './technicianAssignment';
import { calculateLiveRiskScore } from './risk';

export interface TriageInput {
  machine_id: string;
  plant_id: string;
  symptom_tags?: string[];
  note?: string;
  technician_id?: string;
  alert_id?: string;
  forceLive?: boolean;
  clientIp?: string;
}

export interface TriageResult {
  observation?: Observation;
  alert: Alert;
  execution?: AgentExecutionResult;
}

function computeRuleBasedTriage(
  machine: any,
  input: TriageInput,
  obsId: string,
  alertId: string,
  now: string,
  store: any
): { observation: Observation; alert: Alert } {
  const observation: Observation = {
    id: obsId,
    machine_id: input.machine_id,
    technician_id: input.technician_id || 'P07-T01',
    created_at: now,
    symptom_tags: input.symptom_tags || [],
    note: input.note || 'Observation recorded during inspection.',
    source: 'technician_capture',
    plant_id: input.plant_id,
    processed: true,
  };

  const tags = (input.symptom_tags || []).map((t) => t.toLowerCase());
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
    noteLower.includes('tripping') ||
    noteLower.includes('jalne') ||
    noteLower.includes('contactor') ||
    noteLower.includes('bhinbhina') ||
    noteLower.includes('paas')
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
      const isMcc = machine.type === 'mcc' || machine.id === 'P07-M30' || noteLower.includes('mcc') || noteLower.includes('contactor');
      descriptiveTitle = isMcc
        ? 'MCC contactor contact degradation & electrical insulation breakdown'
        : 'Electrical contact degradation & contactor overheating';
      urgency = 'P1';
      actionType = isMcc ? 'escalate' : 'replace';
      recommendedAction = isMcc
        ? 'Apply LOTO immediately. Isolate incoming feeder to MCC-3. Inspect main contactor contacts for pitting and replace degraded contactor assembly.'
        : 'Apply LOTO immediately. Isolate electrical feed, inspect contactors and thermal overload relay, and replace degraded components.';
      requiredCerts = isMcc ? ['Electrical HT', 'LOTO'] : ['Electrical LV', 'LOTO'];
      assignedTechId = 'P07-T02';
      assignedShift = 'C';
      const sp = allSpares.find((s) => s.part_no === 'SP-012' || s.id === 'P07-SP-012');
      if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-012', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
    }
  } else if (
    tags.some((t) => t.includes('fluid') || t.includes('leak')) ||
    noteLower.includes('leak') ||
    noteLower.includes('drip') ||
    noteLower.includes('oil') ||
    noteLower.includes('puddle') ||
    noteLower.includes('weep')
  ) {
    if (noteLower.includes('seal') || noteLower.includes('weep')) {
      failureMode = 'seal_failure';
      descriptiveTitle = 'Rotary shaft lip seal wear & fluid weeping';
      actionType = 'replace';
      recommendedAction = 'Apply LOTO. Clean shaft surface, depressurize circuit, and replace degraded Viton lip seal.';
    } else {
      failureMode = 'hydraulic_leak';
      descriptiveTitle = 'High-pressure hydraulic fitting seepage';
      actionType = 'repair';
      recommendedAction = 'Apply LOTO. Depressurize hydraulic circuit, inspect O-ring seals, and torque cylinder hose fittings.';
    }
    urgency = machine.criticality === 'A' ? 'P1' : 'P2';
    requiredCerts = ['Hydraulics', 'LOTO'];
    assignedTechId = 'P07-T01';
    assignedShift = 'A';
    const sp = allSpares.find((s) => s.part_no === 'SP-007' || s.id === 'P07-SP-007');
    if (sp) sparesCheck = [{ part_id: sp.part_no || 'SP-007', name: sp.name, stock: sp.stock, status: sp.stock > 0 ? 'available' : 'stockout', action: 'reserve 1' }];
  } else if (tags.some((t) => t.includes('sound')) || noteLower.includes('sound') || noteLower.includes('noise')) {
    if (noteLower.includes('hiss') || noteLower.includes('air') || noteLower.includes('pneumatic')) {
      failureMode = 'pneumatic_leak';
      descriptiveTitle = 'Pneumatic line micro-fissure & pressure drop';
      actionType = 'repair';
      recommendedAction = 'Isolate pneumatic feed, perform ultrasonic leak detection, and replace leaking push-in fittings.';
      urgency = 'P3';
      requiredCerts = ['Pneumatics', 'LOTO'];
      assignedTechId = 'P07-T03';
      assignedShift = 'A';
    } else {
      failureMode = 'bearing_wear';
      descriptiveTitle = 'Early acoustic harmonic anomaly';
      actionType = 'inspect';
      recommendedAction = 'Perform ultrasonic acoustic inspection on drive-end bearing to verify raceway degradation.';
      urgency = 'P3';
      requiredCerts = ['Mechanical'];
      assignedTechId = 'P07-T01';
      assignedShift = 'A';
    }
  } else {
    failureMode = 'unknown';
    descriptiveTitle = 'Sensory cue variance requiring exploratory inspection';
    urgency = 'P3';
    actionType = 'inspect';
    recommendedAction = 'Perform on-site physical inspection to gather additional sensory evidence.';
    insufficientEvidence = true;
    confidence = 0.55;
    requiredCerts = ['Mechanical'];
    assignedTechId = 'P07-T01';
    assignedShift = 'A';
  }

  const evidence: Array<{ id: string; type: string; text: string }> = [
    {
      id: 'E1',
      type: 'observation',
      text: `Observation ${obsId}: ${input.note || 'Sensory notes'} (Tags: ${(input.symptom_tags || []).join(', ')})`,
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

  const reasoning = `Technician observation cited in E1 (${obsId}) reported sensory cues [${(input.symptom_tags || []).join(', ')}] on asset ${input.machine_id}.${sensorCitation} Diagnostic findings indicate ${descriptiveTitle}.`;

  const eligibleShadows = getEligibleShadowTechnicians({
    plantId: machine.plant_id || input.plant_id || 'P-07',
    assignedTechnicianShift: assignedShift,
    assignedTechnicianId: assignedTechId,
  });
  const shadowTechId = eligibleShadows.length > 0 ? eligibleShadows[0].id : null;

  const alertCandidate: Alert = {
    id: alertId,
    machine_id: input.machine_id,
    plant_id: input.plant_id,
    created_at: now,
    trigger: input.symptom_tags?.length
      ? `Sensory capture: ${input.symptom_tags.join(', ')}`
      : 'Sensor threshold',
    risk_score: calculateLiveRiskScore({
      criticality: machine.criticality,
      severityOrUrgency: urgency,
      confidence,
    }).risk,
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
    shadow_technician: shadowTechId,
    proposed_window: {
      line_id: machine.line_id || 'P07-L1',
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
    source: 'cached',
    prompt_version: 'triage-v1.0',
  };

  const guardrailOutcome = runAllGuardrails(alertCandidate, {
    machineCriticality: machine.criticality,
    technicianShift: assignedShift,
    technicianCerts: store.certifications || [],
    liveSpares: store.spares || [],
    userRole: 'Maintenance Planner',
    referenceDate: '2026-10-18',
  });

  const finalStatus = guardrailOutcome.pass
    ? 'pending'
    : guardrailOutcome.status === 'suppressed'
    ? 'suppressed'
    : 'needs_review';

  const alert: Alert = {
    ...alertCandidate,
    status: finalStatus,
    guardrail_result: {
      pass: guardrailOutcome.pass,
      checks: guardrailOutcome.checks,
    },
    assigned_technician: guardrailOutcome.modifiedData.assigned_technician,
    loto_required: guardrailOutcome.modifiedData.loto_required,
    required_certifications: guardrailOutcome.modifiedData.required_certifications,
    spares_blocked: guardrailOutcome.modifiedData.spares_blocked,
  };

  return { observation, alert };
}

/**
 * Single server function for triage.
 * Runs live AI triage via agent layer (Make -> Direct -> Fallback -> Cached).
 */
export async function triageService(input: TriageInput): Promise<TriageResult> {
  const machine = getMachineByIdSync(input.machine_id) || {
    id: input.machine_id,
    plant_id: input.plant_id,
    name: `Machine ${input.machine_id}`,
    line_id: 'P07-L1',
    criticality: 'B',
    has_sensors: false,
    type: 'conveyor_drive',
  };

  const store = getLocalStoreData();
  const now = new Date().toISOString();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const obsId = `OBS-${randomSuffix}`;
  const alertId = input.alert_id || `AL-${randomSuffix}`;

  // Build structured observation
  const observation: Observation = {
    id: obsId,
    machine_id: input.machine_id,
    technician_id: input.technician_id || 'P07-T01',
    created_at: now,
    symptom_tags: input.symptom_tags || [],
    note: input.note || '',
    source: 'technician_capture',
    plant_id: input.plant_id,
    processed: true,
  };

  // Build sensor summary
  let sensorData: any = null;
  if (machine.has_sensors) {
    const readings = getSensorReadingsForMachineSync(input.machine_id, 14);
    const latest = readings[readings.length - 1];
    if (latest) {
      sensorData = {
        vibration_mm_s_now: latest.vibration_mm_s,
        vibration_baseline: (machine as any).vibration_baseline || 1.8,
        vibration_7d_trend_pct: 12.0,
        temperature_c_now: latest.temperature_c,
        temperature_baseline: (machine as any).temp_baseline || 55.0,
        data_quality: latest.data_quality || 'ok',
      };
    }
  }

  // Build interpreter_input
  const interpreterInput = {
    machine: {
      id: machine.id,
      name: machine.name,
      type: (machine as any).type || 'conveyor_drive',
      line_id: machine.line_id,
      criticality: machine.criticality,
      has_sensors: machine.has_sensors,
    },
    observation: input.note
      ? {
          id: obsId,
          technician_id: observation.technician_id,
          symptom_tags: observation.symptom_tags,
          note: observation.note,
          source: observation.source,
          created_at: observation.created_at,
        }
      : null,
    knowledge_library_matches: (store.knowledge_library || []).slice(0, 3),
  };

  // Build triage_context
  const triageContext = {
    current_time: now,
    current_shift: 'A',
    machine: interpreterInput.machine,
    sensor: sensorData,
    observation: interpreterInput.observation,
    recent_history: (store.maintenance_log || [])
      .filter((l: any) => l.machine_id === input.machine_id)
      .slice(0, 3),
    spares: (store.spares || []).slice(0, 6),
    technicians: (store.technicians || []).slice(0, 10),
    production_windows: (store.production_schedule || []).slice(0, 8),
    knowledge_library_matches: (store.knowledge_library || []).slice(0, 3),
  };

  // Execute Agent Layer
  const agentExecution = await executeAgent({
    agent: 'triage',
    request_id: alertId,
    plant_id: input.plant_id,
    machine_id: input.machine_id,
    trigger: input.symptom_tags?.length
      ? `Sensory capture: ${input.symptom_tags.join(', ')}`
      : 'sensor_threshold',
    prompt_version: 'triage-v1.0',
    interpreter_input: interpreterInput,
    triage_context: triageContext,
    context: triageContext,
    user_text: input.note,
    clientIp: input.clientIp,
    skipLive: Boolean(process.env.DEMO_MODE === 'true' && !input.forceLive),
    ruleBasedFallback: () => {
      const fallback = computeRuleBasedTriage(
        machine,
        input,
        obsId,
        alertId,
        now,
        store
      );
      return fallback.alert;
    },
  });

  const parsedAlert = agentExecution.data;

  const liveRiskScore = calculateLiveRiskScore({
    criticality: machine.criticality,
    severityOrUrgency: parsedAlert.urgency || 'P3',
    confidence: parsedAlert.confidence ?? 0.85,
  });

  // Synthesize final alert entity
  const alert: Alert = {
    id: alertId,
    machine_id: input.machine_id,
    plant_id: input.plant_id,
    created_at: now,
    trigger: input.symptom_tags?.length
      ? `Sensory capture: ${input.symptom_tags.join(', ')}`
      : 'Sensor threshold',
    risk_score: liveRiskScore.risk,
    failure_mode: parsedAlert.failure_mode || 'unknown',
    confidence: parsedAlert.confidence ?? 0.85,
    urgency: parsedAlert.urgency || 'P3',
    insufficient_evidence: Boolean(parsedAlert.insufficient_evidence),
    evidence: parsedAlert.evidence || [],
    reasoning: parsedAlert.reasoning || '',
    recommended_action: parsedAlert.recommended_action || '',
    action_type: parsedAlert.action_type || 'inspect',
    required_certifications: parsedAlert.required_certifications || ['Mechanical'],
    loto_required: Boolean(parsedAlert.loto_required),
    assigned_technician: parsedAlert.assigned_technician || null,
    shadow_technician: parsedAlert.shadow_technician || null,
    proposed_window: parsedAlert.proposed_window || {
      line_id: machine.line_id || 'P07-L1',
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      shift: 'A',
      window_type: 'changeover',
      production_loss_units: 0,
      note: 'Changeover window aligned to shift schedule',
    },
    spares_check: parsedAlert.spares_check || [],
    spares_blocked: Boolean(parsedAlert.spares_blocked),
    est_failure_cost_usd: parsedAlert.est_failure_cost_usd ?? (machine.criticality === 'A' ? 24000 : 12000),
    est_intervention_cost_usd: parsedAlert.est_intervention_cost_usd ?? 950,
    status: parsedAlert.status || 'pending',
    guardrail_result: parsedAlert.guardrail_result || {
      pass: agentExecution.guardrail_pass,
      checks: [],
    },
    decided_by: null,
    decision_reason: null,
    source: agentExecution.provider,
    prompt_version: agentExecution.prompt_version,
  };

  const finalAlert = normalizeAlertShadowTechnician(alert);

  // If this was an existing alert re-run, update it
  if (input.alert_id) {
    mutateLocalAlert(input.alert_id, finalAlert);
  } else {
    // New observation + alert
    addLocalObservation(observation);
    addLocalAlert(finalAlert);
  }

  // Update machine risk and health scores based on live alert
  const machines = (store.machines as any[]) || [];
  const mIndex = machines.findIndex((m: any) => m.id === input.machine_id);
  if (mIndex !== -1) {
    machines[mIndex].risk_score = liveRiskScore.risk;
    machines[mIndex].health_score = liveRiskScore.health;
    if (liveRiskScore.risk > 70) {
      machines[mIndex].status = 'alarm';
    } else if (liveRiskScore.risk > 40 && machines[mIndex].status !== 'alarm') {
      machines[mIndex].status = 'warning';
    }
  }

  // Sync to Supabase if connected
  try {
    const { getSupabaseAdminClient } = await import('./supabaseAdmin');
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { spares_blocked, ...supabaseAlert } = finalAlert as any;
      if (input.alert_id) {
        await admin.from('alerts').update(supabaseAlert).eq('id', input.alert_id);
      } else {
        await admin.from('observations').insert(observation);
        await admin.from('alerts').insert(supabaseAlert);
      }
      await admin.from('machines').update({
        risk_score: liveRiskScore.risk,
        health_score: liveRiskScore.health,
      }).eq('id', input.machine_id);
    }
  } catch (e) {
    // Expected in testing environments without server-only
  }

  return {
    observation: input.alert_id ? undefined : observation,
    alert: finalAlert,
    execution: agentExecution,
  };
}
