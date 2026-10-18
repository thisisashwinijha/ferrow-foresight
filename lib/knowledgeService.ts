/**
 * Knowledge Agent Service (prompt version: knowledge-v1.0)
 *
 * Implements rule-based and cached knowledge extraction, learning cards for
 * junior technicians, and veteran-junior mentorship pairings.
 * Adheres strictly to prompts/knowledge_agent.md.
 */

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
  id: string;
  title: string;
  for_role: 'Junior' | 'Trainee';
  machine_type: string;
  key_points: [string, string, string];
  quick_check_question: string;
  answer: string;
}

export interface SuggestedPairingPayload {
  id: string;
  shift: string;
  veteran_id: string;
  veteran_name: string;
  veteran_role: string;
  veteran_experience: number;
  junior_id: string;
  junior_name: string;
  junior_role: string;
  junior_experience: number;
  upcoming_job: string;
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
      'If a hydraulic ram moves sluggishly and the oil smells burnt, what is the most probable condition?',
    answer:
      'Hydraulic oil degradation combined with seal bypass or pump cavitation causing pressure drop.',
  },
  {
    id: 'LC-04',
    title: 'Centrifugal pump cavitation vs mechanical seal leak',
    for_role: 'Junior',
    machine_type: 'pump',
    key_points: [
      'Cavitation sounds like gravel or marbles shaking inside the casing; seal failure creates hissing or dripping.',
      'Mechanical seal leaks show visible wetness around the seal gland and product buildup on the shaft.',
      'Never run a pump dry to test rotation; dry running ruins silicon carbide seal faces within 10 seconds.',
    ],
    quick_check_question:
      'Why does running a pump dry for just a few seconds destroy mechanical seals?',
    answer:
      'Mechanical seal faces depend on a microscopic liquid film between the faces for cooling and lubrication; without fluid, friction destroys them.',
  },
];

// Suggested veteran + junior pairings based on shift and upcoming work orders
export const SUGGESTED_PAIRINGS: SuggestedPairingPayload[] = [
  {
    id: 'PAIR-01',
    shift: 'A',
    veteran_id: 'P07-T03',
    veteran_name: 'Gurpreet Singh',
    veteran_role: 'Veteran (26 yrs)',
    veteran_experience: 26,
    junior_id: 'P07-T08',
    junior_name: 'Sneha Joshi',
    junior_role: 'Junior (2 yrs)',
    junior_experience: 2,
    upcoming_job: 'WO-2202: Compressor bearing clearance & oil flush (P07-M06)',
    reason:
      'Shift A pairing: Pair veteran Gurpreet with junior Sneha for hands-on bearing clearance measurement and vibration sensor calibration.',
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

/**
 * Service function returning cached learning cards for junior technicians
 */
export async function getLearningCards(roleFilter?: 'Junior' | 'Trainee'): Promise<LearningCardPayload[]> {
  if (!roleFilter) return CACHED_LEARNING_CARDS;
  return CACHED_LEARNING_CARDS.filter((c) => c.for_role === roleFilter);
}

/**
 * Service function returning suggested veteran-junior mentorship pairings
 */
export async function getSuggestedPairings(plantId?: string): Promise<SuggestedPairingPayload[]> {
  return SUGGESTED_PAIRINGS;
}

/**
 * Generates a structured Knowledge Agent result matching prompts/knowledge_agent.md schema
 */
export async function knowledgeService(input: {
  work_order_id?: string;
  observation_id?: string;
  machine_type: string;
  failure_mode: string;
  symptoms: string[];
  findings?: string;
  technician_id?: string;
}): Promise<KnowledgeAgentResult> {
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
      verified: false, // Rule 6: All entries stay unverified until a veteran approves them
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
