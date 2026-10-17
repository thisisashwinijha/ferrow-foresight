export type PlantStatus = 'pilot' | 'shadow' | 'not_onboarded';

export interface Plant {
  id: string;
  name: string;
  location: string;
  city: string;
  country: string;
  region: string;
  status: PlantStatus;
  pilot: boolean;
  lines_count: number;
  machine_count: number;
  sensor_pct: number;
  onboarded_machines: number;
  downtime_hours_last_month: number;
  downtime_cost_usd_last_month: number;
  availability_pct: number;
  open_alerts: number;
}

export interface Line {
  id: string;
  plant_id: string;
  name: string;
  product: string;
}

export type MachineCriticality = 'A' | 'B' | 'C';
export type MaintenanceStrategy = 'BM' | 'PM' | 'CBM' | 'RBM';

export interface Machine {
  id: string;
  name: string;
  type: string;
  line_id: string;
  criticality: MachineCriticality;
  has_sensors: boolean;
  make: string;
  install_year: number;
  strategy: MaintenanceStrategy;
  pm_interval_days: number;
  status: string;
  plant_id: string;
  vibration_baseline: number;
  temperature_baseline: number;
  health_score: number;
  risk_score: number;
  updated_at?: string;
}

export interface Technician {
  id: string;
  plant_id: string;
  name: string;
  role: string;
  years_experience: number;
  shift: string;
  available: boolean;
}

export interface Certification {
  id?: number;
  technician_id: string;
  certification: string;
  valid_until: string;
}

export interface TechnicianSkill {
  id?: number;
  technician_id: string;
  skill: string;
  level: number;
  target_level: number;
}

export interface Spares {
  id: string;
  plant_id: string;
  part_no: string;
  name: string;
  category: string;
  compatible_types: string[];
  stock: number;
  min_level: number;
  lead_time_days: number;
  unit_cost_usd: number;
  critical: boolean;
  reserved: number;
}

export type WindowType = 'run' | 'changeover' | 'low_load' | 'planned_shutdown';

export interface ProductionSchedule {
  id: string;
  line_id: string;
  date: string;
  shift: string;
  window_type: WindowType;
  order_no: string;
  product: string;
  planned_units: number;
  priority: string;
}

export interface SensorReading {
  id: number;
  machine_id: string;
  date: string;
  vibration_mm_s: number;
  temperature_c: number;
  data_quality: 'ok' | 'dropout' | 'spike';
}

export interface MaintenanceLog {
  id: string;
  machine_id: string;
  date: string;
  type: MaintenanceStrategy;
  finding: string;
  failure_mode: string | null;
  downtime_hours: number;
  unplanned: boolean;
  technician_id: string;
  notes: string;
  cost_usd: number;
}

export interface KpiSnapshot {
  month: string;
  plant_id: string;
  breakdowns: number;
  breakdown_hours: number;
  downtime_cost_usd: number;
  mtbf_hours: number;
  mttr_hours: number;
  availability_pct: number;
  planned_maintenance_pct: number;
  pm_compliance_pct: number;
  wasted_pm_pct: number;
  false_alarm_rate_pct: number | null;
  spares_stockouts: number;
  backlog_weeks: number;
}

export interface PmPlan {
  id: string;
  machine_id: string;
  task: string;
  due_date: string;
  interval_days: number;
  ai_suggestion: 'keep' | 'defer' | 'pull_forward';
  ai_reason: string;
  status: string;
  decided_by?: string;
}

export interface Observation {
  id: string;
  machine_id: string;
  technician_id: string;
  created_at: string;
  symptom_tags: string[];
  note: string;
  source: string;
  structured?: any;
  processed?: boolean;
  plant_id: string;
}

export interface KnowledgeLibrary {
  id: string;
  machine_type: string;
  failure_mode: string;
  sound: string;
  smell: string;
  feel_visual: string;
  captured_from: string;
  captured_at_plant: string;
  verified: boolean;
}

export type AlertUrgency = 'P1' | 'P2' | 'P3' | 'none';
export type AlertActionType = 'monitor' | 'inspect' | 'repair' | 'replace' | 'escalate';
export type AlertStatus = 'pending' | 'approved' | 'rejected' | 'needs_review' | 'suppressed';

export interface AlertEvidence {
  id: string;
  type: string;
  text: string;
}

export interface Alert {
  id: string;
  machine_id: string;
  plant_id: string;
  created_at: string;
  trigger: string;
  risk_score: number;
  failure_mode: string;
  confidence: number;
  urgency: AlertUrgency;
  insufficient_evidence: boolean;
  evidence: AlertEvidence[];
  reasoning: string;
  recommended_action: string;
  action_type: AlertActionType;
  required_certifications: string[];
  loto_required: boolean;
  assigned_technician: string | null;
  shadow_technician: string | null;
  proposed_window: {
    line_id: string;
    date: string;
    shift: string;
    window_type: WindowType;
    production_loss_units?: number;
    note?: string;
  } | null;
  spares_check: Array<{
    part_id: string;
    name: string;
    stock: number;
    min_level?: number;
    status: string;
    action: string;
  }>;
  est_failure_cost_usd: number;
  est_intervention_cost_usd: number;
  guardrail_result?: {
    pass: boolean;
    checks: Array<{
      rule: string;
      pass: boolean;
      detail: string;
    }>;
  };
  status: AlertStatus;
  decided_by: string | null;
  decision_reason: string | null;
  source: string;
  prompt_version: string;
}

export type WorkOrderStatus = 'raised' | 'approved' | 'scheduled' | 'loto_applied' | 'in_progress' | 'closed';

export interface WorkOrder {
  id: string;
  alert_id: string;
  machine_id: string;
  plant_id: string;
  type: string;
  priority: string;
  status: WorkOrderStatus;
  assigned_technician: string | null;
  shadow_technician: string | null;
  scheduled_window: any;
  spares_reserved: any;
  checklist: any;
  loto_permit_no: string | null;
  closure_notes: string | null;
  root_cause: string | null;
  downtime_hours: number | null;
  created_at: string;
  closed_at: string | null;
}

export interface AgentRun {
  id: number;
  alert_id: string;
  created_at: string;
  step: string;
  model: string;
  prompt_version: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
}
