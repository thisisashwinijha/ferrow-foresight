-- Ferrow Foresight: Supabase schema (run first in SQL Editor, in BOTH ferrow-dev and ferrow-prod)
-- Safe to re-run: drops and recreates all tables.

drop table if exists agent_runs, work_orders, alerts, observations, pm_plan, kpi_snapshots, maintenance_log,
  sensor_readings, production_schedule, spares, technician_skills, certifications, technicians,
  knowledge_library, machines, lines, plants cascade;

create table plants (
  id text primary key, name text, location text, city text, country text, region text,
  status text check (status in ('pilot','shadow','not_onboarded')), pilot boolean default false,
  lines_count int, machine_count int, sensor_pct numeric, onboarded_machines int,
  downtime_hours_last_month numeric, downtime_cost_usd_last_month numeric, availability_pct numeric, open_alerts int
);
create table lines (id text primary key, plant_id text references plants(id), name text, product text);

create table machines (
  id text primary key, name text, type text, line_id text references lines(id),
  criticality text check (criticality in ('A','B','C')), has_sensors boolean,
  make text, install_year int, strategy text check (strategy in ('BM','PM','CBM','RBM')),
  pm_interval_days int, status text default 'running', plant_id text references plants(id),
  vibration_baseline numeric, temperature_baseline numeric,
  health_score numeric, risk_score numeric, updated_at timestamptz default now()
);

create table technicians (id text primary key, plant_id text references plants(id), name text, role text, years_experience int, shift text, available boolean default true);
create table certifications (id bigserial primary key, technician_id text references technicians(id), certification text, valid_until date);
create table technician_skills (id bigserial primary key, technician_id text references technicians(id), skill text, level int, target_level int);

create table spares (
  id text primary key, plant_id text references plants(id), part_no text, name text, category text, compatible_types text[], stock int, min_level int,
  lead_time_days int, unit_cost_usd numeric, critical boolean, reserved int default 0
);

create table production_schedule (
  id text primary key, line_id text references lines(id), date date, shift text,
  window_type text check (window_type in ('run','changeover','low_load','planned_shutdown')),
  order_no text, product text, planned_units int, priority text
);

create table sensor_readings (
  id bigserial primary key, machine_id text references machines(id), date date,
  vibration_mm_s numeric, temperature_c numeric, data_quality text
);
create index on sensor_readings (machine_id, date);
create index on machines (plant_id, line_id);

create table maintenance_log (
  id text primary key, machine_id text references machines(id), date date,
  type text check (type in ('BM','PM','CBM','RBM')), finding text, failure_mode text,
  downtime_hours numeric, unplanned boolean, technician_id text, notes text, cost_usd numeric
);

create table kpi_snapshots (
  month text, plant_id text, breakdowns int, breakdown_hours numeric, downtime_cost_usd numeric,
  mtbf_hours numeric, mttr_hours numeric, availability_pct numeric, planned_maintenance_pct numeric,
  pm_compliance_pct numeric, wasted_pm_pct numeric, false_alarm_rate_pct numeric,
  spares_stockouts int, backlog_weeks numeric, primary key (month, plant_id)
);

create table pm_plan (
  id text primary key, machine_id text references machines(id), task text, due_date date, interval_days int,
  ai_suggestion text check (ai_suggestion in ('keep','defer','pull_forward')), ai_reason text,
  status text default 'open', decided_by text
);

create table observations (
  id text primary key, machine_id text references machines(id), technician_id text references technicians(id),
  created_at timestamptz default now(), symptom_tags text[], note text, source text,
  structured jsonb, processed boolean default false, plant_id text references plants(id)
);

create table knowledge_library (
  id text primary key, machine_type text, failure_mode text, sound text, smell text, feel_visual text,
  captured_from text, captured_at_plant text, verified boolean
);

create table alerts (
  id text primary key, machine_id text references machines(id), plant_id text references plants(id), created_at timestamptz default now(),
  trigger text, risk_score numeric, failure_mode text, confidence numeric, urgency text,
  insufficient_evidence boolean default false, evidence jsonb, reasoning text, recommended_action text,
  action_type text, required_certifications text[], loto_required boolean,
  assigned_technician text, shadow_technician text, proposed_window jsonb, spares_check jsonb,
  est_failure_cost_usd numeric, est_intervention_cost_usd numeric,
  guardrail_result jsonb,
  status text check (status in ('pending','approved','rejected','needs_review','suppressed')) default 'pending',
  decided_by text, decision_reason text, source text default 'live', prompt_version text
);

create table work_orders (
  id text primary key, alert_id text references alerts(id), machine_id text references machines(id), plant_id text references plants(id),
  type text, priority text,
  status text check (status in ('raised','approved','scheduled','loto_applied','in_progress','closed')),
  assigned_technician text, shadow_technician text, scheduled_window jsonb, spares_reserved jsonb,
  checklist jsonb, loto_permit_no text, closure_notes text, root_cause text, downtime_hours numeric,
  created_at timestamptz default now(), closed_at timestamptz
);

create table agent_runs (
  id bigserial primary key, alert_id text, created_at timestamptz default now(), step text, model text,
  prompt_version text, latency_ms int, input_tokens int, output_tokens int,
  input jsonb, output jsonb, schema_valid boolean, guardrail_pass boolean, error text
);

-- Row level security: browser (anon key) can READ everything, cannot WRITE.
-- All writes go through server API routes using the service role key.
do $$ declare t text; begin
  foreach t in array array['plants','lines','machines','technicians','certifications','technician_skills','spares',
    'production_schedule','sensor_readings','maintenance_log','kpi_snapshots','pm_plan','observations',
    'knowledge_library','alerts','work_orders','agent_runs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select using (true)', t);
  end loop;
end $$;

-- Explicit Data API access (auto-expose is OFF in project settings)
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Realtime for live UI updates
alter publication supabase_realtime add table alerts, work_orders, observations;
