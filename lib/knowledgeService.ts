/**
 * Knowledge Agent Service (prompt version: knowledge-v1.0)
 *
 * Implements rule-based and cached knowledge extraction, learning cards for
 * junior technicians, and veteran-junior mentorship pairings.
 * Wires to live AI agent layer.
 * Adheres strictly to prompts/knowledge_agent.md.
 */

import { executeAgent } from './agents';
import { getLocalStoreData } from './data/localStore';

export interface KnowledgeEntryPayload {
  machine_type: string;
  failure_mode: string;
  sound: string;
  smell: string;
  feel_visual: string;
  early_warning_signs: string[];
  root_cause: string;
  prevention: string;
  source_ids: string[];
  verified: boolean;
}

export interface LearningCardPayload {
  id?: string;
  title: string;
  for_role: string;
  machine_type?: string;
  key_points: string[];
  quick_check_question: string;
  answer: string;
}

export interface SuggestedPairingPayload {
  id?: string;
  shift?: string;
  veteran_id: string;
  veteran_name?: string;
  veteran_role?: string;
  veteran_experience?: number;
  junior_id: string;
  junior_name?: string;
  junior_role?: string;
  junior_experience?: number;
  upcoming_job?: string;
  reason: string;
}

export interface KnowledgeAgentResult {
  decision: 'new' | 'update' | 'duplicate';
  updates_knowledge_id: string | null;
  knowledge_entry: KnowledgeEntryPayload;
  learning_card: LearningCardPayload;
  suggested_pairing: {
    veteran_id: string;
    junior_id: string;
    reason: string;
  };
  provider?: string;
  cached_note?: string;
}

// Cached learning cards designed for junior technicians
export const CACHED_LEARNING_CARDS: LearningCardPayload[] = [
  {
    id: 'LC-01',
    title: 'Recognising early bearing degradation on drives',
    for_role: 'Junior',
    machine_type: 'conveyor_drive',
    key_points: [
      'Early bearing wear creates a low-frequency hum or rhythmic knock that speeds up with motor RPM.',
      'Check temperature with an infrared probe: housing over 65°C or too hot to touch indicates lubrication breakdown.',
      'Always verify machine is in full LOTO with zero energy confirmed before inspecting or applying grease.',
    ],
    quick_check_question:
      'What is the primary indicator of inner raceway bearing fatigue before vibration spike occurs?',
    answer:
      'A rhythmic knock or clicking sound that fades slightly as the bearing warms up, accompanied by localized temperature rise.',
  },
  {
    id: 'LC-02',
    title: 'Zero energy verification in LOTO isolation',
    for_role: 'Trainee',
    machine_type: 'general',
    key_points: [
      'Never rely solely on panel indicator lights or screen readouts to confirm de-energisation.',
      'Perform the try-start test: physically attempt to start the machine using local pushbuttons after lock and tag application.',
      'Bleed stored energy from hydraulic accumulators and pneumatic lines before loosening fittings.',
    ],
    quick_check_question:
      'What must you do immediately after placing your personal padlock and tag on the isolator switch?',
    answer:
      'Attempt to restart the machine using the local start controls to confirm that zero electrical energy reaches the motor (try-start test).',
  },
  {
    id: 'LC-03',
    title: 'Hydraulic cylinder seal failure & rod weeping',
    for_role: 'Junior',
    machine_type: 'hydraulic',
    key_points: [
      'Fluid weeping or droplet formation around the cylinder gland nut signifies seal lip degradation.',
      'Spongy ram travel or failure to hold position under load indicates internal piston seal bypass.',
      'Clean all hose couplings thoroughly before disassembly to prevent particulate contamination entering the valve manifold.',
    ],
    quick_check_question:
      'What is the first physical symptom of hydraulic rod seal extrusion under working pressure?',
    answer:
      'Micro-weeping of fluid along the piston rod surface during extension stroke, accumulating as a puddle over an 8-hour shift.',
  },
];

export const SUGGESTED_PAIRINGS: SuggestedPairingPayload[] = [
  {
    id: 'PAIR-01',
    shift: 'A',
    veteran_id: 'P07-T01',
    veteran_name: 'Ramesh Patil',
    veteran_role: 'Veteran (32 yrs)',
    veteran_experience: 32,
    junior_id: 'P07-T08',
    junior_name: 'Sneha Joshi',
    junior_role: 'Junior (2 yrs)',
    junior_experience: 2,
    upcoming_job: 'P07-M03: Output shaft bearing replacement & laser alignment',
    reason:
      'Shift A pairing: Pair veteran Ramesh with junior Sneha for precision laser dial gauge setup and bearing clearance measurement.',
  },
  {
    id: 'PAIR-02',
    shift: 'B',
    veteran_id: 'P07-T05',
    veteran_name: 'Mohan Iyer',
    veteran_role: 'Veteran (30 yrs)',
    veteran_experience: 30,
    junior_id: 'P07-T07',
    junior_name: 'Rahul Sharma',
    junior_role: 'Junior (3 yrs)',
    junior_experience: 3,
    upcoming_job: 'WO-2201: Hydraulic cylinder seal replacement (P07-M09)',
    reason:
      'Shift B pairing: Pair veteran Mohan with junior Rahul for hydraulic line isolation, pressure bleed-down, and seal replacement.',
  },
  {
    id: 'PAIR-03',
    shift: 'C',
    veteran_id: 'P07-T02',
    veteran_name: 'Suresh Nair',
    veteran_role: 'Veteran (28 yrs)',
    veteran_experience: 28,
    junior_id: 'P07-T12',
    junior_name: 'Arjun Mehta',
    junior_role: 'Junior (2 yrs)',
    junior_experience: 2,
    upcoming_job: 'Line 2 MCC thermal check & busbar inspection',
    reason:
      'Shift C pairing: Pair veteran Suresh with junior Arjun for electrical LV panel inspection and infrared thermal scanning.',
  },
];

export async function getLearningCards(roleFilter?: 'Junior' | 'Trainee'): Promise<LearningCardPayload[]> {
  if (!roleFilter) return CACHED_LEARNING_CARDS;
  return CACHED_LEARNING_CARDS.filter((c) => c.for_role === roleFilter);
}

export async function getSuggestedPairings(plantId?: string): Promise<SuggestedPairingPayload[]> {
  return SUGGESTED_PAIRINGS;
}

export function computeRuleBasedKnowledge(input: {
  work_order_id?: string;
  observation_id?: string;
  machine_type: string;
  failure_mode: string;
  symptoms: string[];
  findings?: string;
  technician_id?: string;
}): KnowledgeAgentResult {
  const sourceId = input.work_order_id || input.observation_id || 'WO-2201';

  return {
    decision: 'new',
    updates_knowledge_id: null,
    knowledge_entry: {
      machine_type: input.machine_type,
      failure_mode: input.failure_mode,
      sound: input.symptoms.find((s) => s.toLowerCase().includes('sound')) || 'High-frequency knocking under load',
      smell: input.symptoms.find((s) => s.toLowerCase().includes('smell')) || 'Hot lubricant odour',
      feel_visual: input.symptoms.find((s) => s.toLowerCase().includes('vibrat') || s.toLowerCase().includes('temp')) || 'Localized housing temperature elevation above 65°C',
      early_warning_signs: [
        'Intermittent vibration spikes during initial morning startup',
        'Gradual temperature divergence between drive-end and non-drive-end bearings',
      ],
      root_cause: input.findings || 'Lubricant starvation caused by clogged grease nipple passage',
      prevention: 'Enforce 500-hour ultrasound-assisted re-greasing routine',
      source_ids: [sourceId],
      verified: false,
    },
    learning_card: {
      id: `LC-${Date.now().toString().slice(-4)}`,
      title: `${input.machine_type.replace(/_/g, ' ')}: ${input.failure_mode.replace(/_/g, ' ')} troubleshooting`,
      for_role: 'Junior',
      machine_type: input.machine_type,
      key_points: [
        `Listen for signature sounds: abnormal pitch changes reveal early mechanical wear before failure.`,
        `Always apply full LOTO and verify zero electrical/mechanical energy before approaching equipment.`,
        `Check spare parts compatibility (e.g. bearing clearance rating and grease type) prior to component disassembly.`,
      ],
      quick_check_question: `What is the first step before removing the guard on this ${input.machine_type.replace(/_/g, ' ')}?`,
      answer: `Confirm LOTO is applied and verify zero energy with an attempted start.`,
    },
    suggested_pairing: {
      veteran_id: 'P07-T01',
      junior_id: 'P07-T07',
      reason: 'Pair veteran Ramesh with junior Rahul for hands-on failure mode diagnosis and zero-energy protocol demonstration.',
    },
  };
}

/**
 * Knowledge Agent service function wired to live AI agent layer.
 */
export async function knowledgeService(input: {
  work_order_id?: string;
  observation_id?: string;
  machine_type: string;
  failure_mode: string;
  symptoms: string[];
  findings?: string;
  technician_id?: string;
  plant_id?: string;
}): Promise<KnowledgeAgentResult> {
  const plantId = input.plant_id || 'P-07';
  const store = getLocalStoreData();

  const context = {
    work_order: input.work_order_id
      ? (store.work_orders || []).find((w: any) => w.id === input.work_order_id) || {
          id: input.work_order_id,
          status: 'closed',
          root_cause: input.findings,
        }
      : null,
    alert: null,
    observation: null,
    machine: {
      type: input.machine_type,
      criticality: 'B',
    },
    existing_knowledge: (store.knowledge_library || []).slice(0, 5),
    technicians: (store.technicians || []).slice(0, 8),
  };

  const agentResult = await executeAgent<KnowledgeAgentResult>({
    agent: 'knowledge',
    plant_id: plantId,
    trigger: 'user_request',
    prompt_version: 'knowledge-v1.0',
    context,
    ruleBasedFallback: () => computeRuleBasedKnowledge(input),
  });

  const finalResult = agentResult.data;

  // Persist to localStore knowledge_library if valid new entry
  if (finalResult && finalResult.knowledge_entry) {
    const newEntry = {
      id: `KL-${Date.now().toString().slice(-4)}`,
      machine_type: finalResult.knowledge_entry.machine_type,
      failure_mode: finalResult.knowledge_entry.failure_mode,
      sound: finalResult.knowledge_entry.sound,
      smell: finalResult.knowledge_entry.smell,
      feel_visual: finalResult.knowledge_entry.feel_visual,
      captured_from: input.technician_id || 'P07-T01',
      captured_at_plant: plantId,
      verified: false,
    };
    if (Array.isArray(store.knowledge_library)) {
      store.knowledge_library.push(newEntry);
    }

    try {
      const { getSupabaseAdminClient } = await import('./supabaseAdmin');
      const admin = getSupabaseAdminClient();
      if (admin) {
        await admin.from('knowledge_library').insert(newEntry);
      }
    } catch (e) {
      // Expected in testing environments without server-only
    }
  }

  return {
    ...finalResult,
    provider: agentResult.provider,
    cached_note: agentResult.cached_note,
  };
}
