import { z } from 'zod';

export const FailureModeEnum = z.enum([
  'bearing_wear',
  'belt_wear',
  'misalignment',
  'lubrication_failure',
  'motor_overheating',
  'hydraulic_leak',
  'seal_failure',
  'electrical_fault',
  'pneumatic_leak',
  'sensor_fault',
  'unknown',
  'none',
]);

export const UrgencyEnum = z.enum(['P1', 'P2', 'P3', 'none']);

export const ActionTypeEnum = z.enum([
  'monitor',
  'inspect',
  'repair',
  'replace',
  'escalate',
]);

export const WindowTypeEnum = z.enum([
  'run',
  'changeover',
  'low_load',
  'planned_shutdown',
]);

// 1. Signal Interpreter Schema
export const InterpreterOutputSchema = z.object({
  observation_id: z.string().nullable().optional(),
  english_summary: z.string().nullable().optional(),
  failure_mode: z.string(),
  severity: z.string().nullable().optional(),
  specific: z.boolean().optional().default(false),
  sensory_cues: z.array(z.string()).optional().default([]),
  matched_knowledge_ids: z.array(z.string()).optional().default([]),
  evidence_strength: z.string().optional().default('none'),
  rationale: z.string().optional().default(''),
});

// 2. Triage Planner Schema
export const TriageEvidenceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  text: z.string().min(1),
});

export const ProposedWindowSchema = z.object({
  line_id: z.string().min(1),
  date: z.string(),
  shift: z.string().min(1),
  window_type: WindowTypeEnum,
  production_loss_units: z.number().optional(),
  note: z.string().optional(),
});

export const SparesCheckItemSchema = z.object({
  part_id: z.string().min(1),
  name: z.string().optional(),
  stock: z.number().int().min(0).optional().default(0),
  min_level: z.number().optional(),
  status: z.string().optional().default('available'),
  action: z.string().optional().default(''),
});

export const TriagePlannerOutputSchema = z.object({
  machine_id: z.string().min(1),
  failure_mode: FailureModeEnum,
  confidence: z.number().min(0).max(1),
  urgency: UrgencyEnum,
  alert: z.boolean(),
  insufficient_evidence: z.boolean(),
  evidence: z.array(TriageEvidenceSchema),
  reasoning: z.string().min(1),
  action_type: ActionTypeEnum,
  recommended_action: z.string().min(1),
  loto_required: z.boolean(),
  required_certifications: z.array(z.string()),
  assigned_technician: z.string().nullable(),
  shadow_technician: z.string().nullable().optional(),
  proposed_window: ProposedWindowSchema.nullable().optional(),
  spares_check: z.array(SparesCheckItemSchema).optional().default([]),
  spares_blocked: z.boolean().optional().default(false),
  est_failure_cost_usd: z.number().min(0).optional().default(0),
  est_intervention_cost_usd: z.number().min(0).optional().default(0),
});

// 3. PM Optimiser Schema
export const PmDecisionSchema = z.object({
  pm_task_id: z.string().min(1),
  machine_id: z.string().min(1),
  decision: z.enum(['keep', 'defer', 'pull_forward']),
  current_due_date: z.string(),
  new_due_date: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  evidence_ids: z.array(z.string()).optional().default([]),
  risk_if_wrong: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

export const PmOptimiserSummarySchema = z.object({
  tasks_reviewed: z.number().int().min(0),
  keep: z.number().int().min(0),
  defer: z.number().int().min(0),
  pull_forward: z.number().int().min(0),
  visits_avoided: z.number().min(0).optional().default(0),
  technician_hours_saved: z.number().min(0).optional().default(0),
  planned_downtime_hours_saved: z.number().min(0).optional().default(0),
  headline: z.string().optional().default(''),
});

export const PmOptimiserOutputSchema = z.object({
  plant_id: z.string().min(1),
  summary: PmOptimiserSummarySchema,
  decisions: z.array(PmDecisionSchema),
});

// 4. Copilot Schema
export const CopilotOutputSchema = z.object({
  answer: z.string().min(1),
  cited_ids: z.array(z.string()).optional().default([]),
  confidence: z.number().min(0).max(1).optional().default(0.9),
  answer_found_in_context: z.boolean().optional().default(true),
  follow_up_suggestions: z.array(z.string()).optional().default([]),
});

// 5. Knowledge Agent Schema
export const KnowledgeEntrySchema = z.object({
  machine_type: z.string().min(1),
  failure_mode: z.string().min(1),
  sound: z.string().optional().default(''),
  smell: z.string().optional().default(''),
  feel_visual: z.string().optional().default(''),
  early_warning_signs: z.array(z.string()).optional().default([]),
  root_cause: z.string().optional().default(''),
  prevention: z.string().optional().default(''),
  source_ids: z.array(z.string()).optional().default([]),
  verified: z.boolean().optional().default(false),
});

export const LearningCardSchema = z.object({
  title: z.string().min(1),
  for_role: z.string().optional().default('Junior'),
  key_points: z.array(z.string()).min(1),
  quick_check_question: z.string().min(1),
  answer: z.string().min(1),
});

export const SuggestedPairingSchema = z.object({
  veteran_id: z.string().min(1),
  junior_id: z.string().min(1),
  reason: z.string().min(1),
});

export const KnowledgeOutputSchema = z.object({
  decision: z.enum(['new', 'update', 'duplicate']),
  updates_knowledge_id: z.string().nullable().optional(),
  knowledge_entry: KnowledgeEntrySchema,
  learning_card: LearningCardSchema,
  suggested_pairing: SuggestedPairingSchema,
});
