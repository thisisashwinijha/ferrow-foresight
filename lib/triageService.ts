import { Alert, Observation, Machine, AlertUrgency } from './types';
import { getMachineByIdSync } from './data/machines';
import { addLocalAlert, addLocalObservation } from './data/localStore';
import { getSupabaseAdminClient } from './supabaseAdmin';

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
 * (Will plug into the Make Agent in subsequent builds seamlessly).
 */
export async function triageService(input: TriageInput): Promise<TriageResult> {
  const machine = getMachineByIdSync(input.machine_id) || {
    id: input.machine_id,
    plant_id: input.plant_id,
    line_id: 'P07-L1',
    criticality: 'B',
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

  // 2. Rule-based failure mode & urgency synthesis
  const tags = input.symptom_tags.map((t) => t.toLowerCase());
  const noteLower = input.note.toLowerCase();

  let failureMode = 'Mechanical wear & loose assembly';
  let urgency: AlertUrgency = 'P3';
  let actionType: any = 'inspect';
  let recommendedAction = 'Conduct thorough visual inspection, retorque structural bolts, and check alignment.';

  if (tags.includes('heat') || noteLower.includes('overheat') || noteLower.includes('hot')) {
    failureMode = 'Bearing overheating & lubrication breakdown';
    urgency = machine.criticality === 'A' ? 'P1' : 'P2';
    actionType = 'replace';
    recommendedAction = 'Apply LOTO. Inspect bearing raceway for spalling, check thermal degradation, and repack or replace bearing assembly.';
  } else if (tags.includes('smell') || noteLower.includes('burn') || noteLower.includes('smoke')) {
    failureMode = 'Drive belt slippage & friction thermal breakdown';
    urgency = 'P1';
    actionType = 'replace';
    recommendedAction = 'Apply LOTO immediately. Isolate electrical feed, inspect drive belts for friction wear, and replace tensioner pully.';
  } else if (tags.includes('vibration') || noteLower.includes('shake') || noteLower.includes('grinding')) {
    failureMode = 'Motor coupling misalignment & shaft eccentricity';
    urgency = machine.criticality === 'A' ? 'P1' : 'P2';
    actionType = 'repair';
    recommendedAction = 'Apply LOTO. Perform dial-indicator shaft alignment check, inspect spider insert, and realign motor-to-gearbox coupling.';
  } else if (tags.includes('sound') || noteLower.includes('rattl') || noteLower.includes('clank')) {
    failureMode = 'Acoustic anomaly: loose transmission element';
    urgency = machine.criticality === 'A' ? 'P2' : 'P3';
    actionType = 'inspect';
    recommendedAction = 'Apply LOTO. Remove safety guards, check chain slack and guide rail clearance, and lubricate transmission chain.';
  }

  // 3. Create Alert
  const alert: Alert = {
    id: alertId,
    machine_id: input.machine_id,
    plant_id: input.plant_id,
    created_at: now,
    trigger: `Sensory capture: ${input.symptom_tags.join(', ')}`,
    risk_score: urgency === 'P1' ? 84 : urgency === 'P2' ? 68 : 42,
    failure_mode: failureMode,
    confidence: 0.88,
    urgency,
    insufficient_evidence: false,
    evidence: [
      {
        id: obsId,
        type: 'observation',
        text: `${input.note} (Tags: ${input.symptom_tags.join(', ')})`,
      },
    ],
    reasoning: `Field observation reported ${input.symptom_tags.join(', ')} on asset ${input.machine_id}. Physical symptoms match known degradation signatures for ${failureMode}.`,
    recommended_action: recommendedAction,
    action_type: actionType,
    required_certifications: ['Mechanical Level 2', 'LOTO Certified'],
    loto_required: true,
    assigned_technician: input.technician_id || 'P07-T01',
    shadow_technician: 'P07-T02',
    proposed_window: {
      line_id: (machine as any).line_id || 'P07-L1',
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      shift: 'Shift 2 (14:00 - 22:00)',
      window_type: 'changeover',
      production_loss_units: 0,
      note: 'Changeover window aligned to minimize downtime impact',
    },
    spares_check: [],
    est_failure_cost_usd: machine.criticality === 'A' ? 24000 : 12000,
    est_intervention_cost_usd: 950,
    status: 'pending',
    decided_by: null,
    decision_reason: null,
    source: 'technician_capture',
    prompt_version: 'v2.1',
  };

  // 4. Save locally
  addLocalObservation(observation);
  addLocalAlert(alert);

  // 5. If Supabase is reachable, persist
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
