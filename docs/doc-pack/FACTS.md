# Ferrow Foresight: Product & Technical Facts

*Source of truth extracted directly from code (`lib/workflow.ts`, `lib/guardrails.ts`, `lib/risk.ts`, `lib/pmOptimiserService.ts`, `lib/agents/`) and data (`data/seed_data.json`).*

---

## 1. 9-Stage Industrial Maintenance Lifecycle Workflow

The lifecycle is defined in `lib/workflow.ts` as an end-to-end deterministic state machine spanning 9 discrete stages:

| Stage # | Stage Name | Assigned Role | Entry Condition | Exit Action | What Blocks It |
|---|---|---|---|---|---|
| **1** | **Detect** | Technician / IoT Sensor | Raw sensor vibration exceeds ISO 10816 threshold (> 4.5 mm/s alarm band) OR technician logs sensory observation on `/capture`. | Observation or telemetry event recorded in database; triggers triage agent. | Observations restricted to maintenance roles (Technician, Planner, Plant Head). |
| **2** | **AI Triage** | AI Agent | New sensory observation or telemetry anomaly ingested. | Structured JSON alert generated (failure mode, confidence, urgency, evidence array, recommended action, LOTO requirement, required certs, assigned technician, proposed window, cost of failure vs intervention). Alert stored in `pending` or `needs_review`. | Blocked/suppressed if schema validation fails or confidence < 0.70 (unless flagged `insufficient_evidence`). |
| **3** | **Planner Review** | Maintenance Planner | Alert in `pending` or `needs_review` state with guardrail evaluation completed. | **P2/P3**: Planner approves directly, generating scheduled work order. <br>**P1 Criticality A**: Planner verifies failure mode and technician qualifications, then clicks "Send to Plant Head" (`decision_reason = 'sent_to_plant_head'`). | 1. Non-Planner roles blocked.<br>2. Direct approval of P1 Criticality A alerts blocked for Planners (must forward to Plant Head).<br>3. Failed technical guardrails (uncertified technician, expired cert, or shift mismatch) block approval until resolved in "Correct and re-check".<br>4. Shadow mode plants block dispatch. |
| **4** | **Plant Head Approval** | Plant Head | P1 Criticality A alert forwarded by Maintenance Planner (`decision_reason = 'sent_to_plant_head'`). | Plant Head clicks "Approve Work Order" (status -> `approved`, work order created in `approved` state) or "Reject" with reason. | 1. Non-Plant Head roles blocked.<br>2. Alert not yet forwarded by Planner.<br>3. Shadow mode plants block dispatch. |
| **5** | **Spares Readiness** | Stores In-charge | Work order generated from approved alert; `spares_reserved` is unconfirmed (`isSparesConfirmed == false`). | Stores In-charge inspects stock level vs safety buffer and clicks "Confirm Reservation" (or "Raise PR" if stockout). | 1. Non-Stores In-charge roles blocked.<br>2. Out-of-stock items (stock = 0) strictly block reservation.<br>3. Pre-execution invariant: Work order cannot proceed to execution without confirmed spares. |
| **6** | **Production Window** | Production Manager | Work order approved and spares confirmed or concurrently scheduled; window unconfirmed (`isWindowConfirmed == false`). | Production Manager reviews 14-day line schedule and clicks "Confirm Window" (or "Request Another Window" / "Request Reschedule"). | 1. Non-Production Manager roles blocked.<br>2. Window conflicts or production blackout periods.<br>3. Pre-execution invariant: Work order cannot proceed to execution without confirmed production window. |
| **7** | **LOTO & Execution** | Technician (Assigned) | Spares confirmed (Stage 5) **AND** Maintenance Window confirmed (Stage 6). | 1. Assigned technician verifies all 6 zero-energy LOTO steps; permit issued (`LOTO-P07-XXXX`).<br>2. Maintenance task checklist steps unlocked and completed.<br>3. Technician completes Closure Form with verified root cause and downtime hours, then clicks "Complete & Close Work Order". | 1. Unconfirmed spares or window blocks execution.<br>2. Phase 2 task checklist strictly locked until all 6 LOTO steps are verified and permit issued.<br>3. Closure blocked if any task steps remain unchecked.<br>4. Actions restricted strictly to the assigned technician.<br>5. Shadow plants block physical execution. |
| **8** | **Knowledge & Verification** | Training Coordinator | Work order closed (`status = 'closed'`). AI Knowledge Agent automatically extracts tacit failure signature from closure report. | Training Coordinator reviews synthesized failure signature and clicks "Verify & Publish Knowledge Card" (`verified = true`), adding card to plant knowledge library. | 1. Non-Training Coordinator roles blocked.<br>2. Work order not yet closed. |
| **9** | **Restored to Normal** | System / Completed | Work order closed **AND** tacit knowledge card verified (`knowledgeVerified == true`). | Asset health restored to 100% nominal running baseline in Control Room; telemetry trends reset; 9-step Flow Tracker reflects 100% complete across all stages. | Incomplete prior stages (open work order or unverified knowledge card). |

---

## 2. Role Permission Matrix

Defined in `checkWorkflowPermission` in `lib/workflow.ts`. Every action is strictly validated against the user's active operational persona:

| Action | Head of Plant Operations | Plant Head | Maintenance Planner | Technician | Production Manager | Stores In-charge | Training Coordinator | Blocked Reason When Disallowed |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **detect** (log observation) | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | "Only technicians and maintenance staff can log floor observations." |
| **planner_review** / **planner_approve** | ❌ | ❌ | ✅* | ❌ | ❌ | ❌ | ❌ | "Only Maintenance Planner can review and approve maintenance alerts." (*P1 Crit A requires Plant Head) |
| **send_to_plant_head** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | "Only Maintenance Planner can forward Criticality A alerts to Plant Head." |
| **plant_head_approve** / **reject** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | "Only Plant Head has authority to approve P1 alerts on Criticality A assets." |
| **confirm_spares** / **raise_purchase_request** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | "Only Stores In-charge can confirm inventory reservations or raise purchase requests." |
| **confirm_window** / **request_another_window** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | "Only Production Manager can authorize or reschedule line maintenance windows." |
| **apply_loto** | ❌ | ❌ | ❌ | ✅** | ❌ | ❌ | ❌ | "Only assigned Technicians can execute LOTO." (**Restricted to assigned technician) |
| **execute_task** | ❌ | ❌ | ❌ | ✅** | ❌ | ❌ | ❌ | "Only assigned Technicians can perform maintenance tasks." |
| **close_work_order** | ❌ | ❌ | ❌ | ✅** | ❌ | ❌ | ❌ | "Only assigned Technicians can log root cause and close work orders." |
| **verify_knowledge** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | "Only Training Coordinator can verify failure signatures and publish learning cards." |

*Special Invariant: Facilities in Shadow Mode (Stuttgart P-03, Monterrey P-12, Suzhou P-21) strictly block all dispatch and execution actions (`planner_approve`, `plant_head_approve`, `confirm_spares`, `confirm_window`, `apply_loto`, `execute_task`, `close_work_order`). Recommendations are logged for comparison with technician outcomes only.*

---

## 3. Comprehensive Guardrail Specification

All 9 guardrail checks are executed by `runAllGuardrails` in `lib/guardrails.ts`:

| # | Guardrail Name | Rule Identifier | Evaluation Logic & Threshold | Consequence on Failure |
|---|---|---|---|---|
| **1** | **Schema Validity** | `schema_valid` | Validates model response against `TriageOutputSchema` (Zod). All required fields must exist; `failure_mode`, `urgency`, and `action_type` must match exact enum values. | Alert status set to `needs_review`. Human supervisor must review payload. |
| **2** | **Evidence IDs Exist** | `evidence_ids_exist` | Every evidence identifier cited in `reasoning` (e.g. `E1`, `E2`) must exist in the `evidence` array, and the array must contain >= 1 item. | Alert status set to `needs_review`. Prevents hallucinated evidence citations. |
| **3** | **Confidence Threshold** | `confidence_threshold` | When `alert == true`, model `confidence` must be >= 0.70 (70%). Waived if `insufficient_evidence == true` or `alert == false`. | Alert status set to `suppressed`. Treated as transient anomaly / false alarm. |
| **4** | **Certification Match & Expiry** | `certification_match` | The `assigned_technician` must possess all certifications listed in `required_certifications`, and none can be expired against reference date `2026-10-18`. | Technician assignment is cleared (`assigned_technician = null`); status set to `needs_review`. |
| **5** | **Mandatory LOTO Enforcement** | `loto_enforced` | If `action_type` is `repair` or `replace`, or `failure_mode` is `electrical_fault`, `loto_required` must be `true` and `'LOTO'` must be in `required_certifications`. | Guardrail automatically forces `loto_required = true`, appends `'LOTO'` to certifications, and injects the 6-step zero-energy LOTO checklist. |
| **6** | **Live Spares Inventory Re-check** | `spares_checked` | Cross-references each part in `spares_check` against live inventory in the database. If available stock <= 0, spare is flagged. | `spares_blocked` is forced to `true`. Execution cannot proceed until purchase request is raised. |
| **7** | **Criticality A Dual Authorization** | `criticality_a_p1` | If machine criticality is `A` and alert urgency is `P1`, alert requires explicit authorization from Plant Head. | Alert cannot be directly approved by Maintenance Planner; routed to Plant Head (`route_plant_head`). |
| **8** | **Shift-Window Alignment** | `shift_match` | Assigned technician's rostered shift (`Shift A`, `Shift B`, or `Shift C`) must match the shift of the `proposed_window`. | Technician assignment is cleared (`assigned_technician = null`); status set to `needs_review`. |
| **9** | **PM Due Date Monotonicity** | `pm_due_date_rule` | For PM schedule optimizations, a `pull_forward` or `keep` decision may **never** move a due date later than the original due date (`newDueDate <= originalDueDate`). | Schedule modification rejected; forced back to original `due_date`. |

---

## 4. Operational & Engineering Formulas

### 4.1 ISO 10816 Vibration Severity Bands
Defined in `lib/risk.ts`:
- **Good (Normal)**: `< 2.8 mm/s` (equipment operates smoothly)
- **Watch**: `2.8 mm/s to 4.5 mm/s` (early wear or imbalance detected)
- **Alarm**: `4.5 mm/s to 7.1 mm/s` (significant deterioration; maintenance required)
- **Critical**: `> 7.1 mm/s` (danger of catastrophic structural failure)

### 4.2 Temperature Rise Severity Bands
Relative to calibrated machine baseline temperature (`lib/risk.ts`):
- **Normal**: `< 10 °C` rise over baseline
- **Watch**: `10 °C to 20 °C` rise over baseline
- **Alarm**: `> 20 °C` rise over baseline

### 4.3 Deterministic Urgency Matrix
Maps asset criticality (`A`, `B`, `C`) and combined sensory severity to operational urgency (`lib/risk.ts`):

$$\begin{array}{|l|c|c|c|}
\hline
\textbf{Combined Severity} & \textbf{Criticality A} & \textbf{Criticality B} & \textbf{Criticality C} \\
\hline
\text{Critical} & \text{P1} & \text{P1} & \text{P2} \\
\text{Alarm} & \text{P1} & \text{P2} & \text{P3} \\
\text{Watch} & \text{P3} & \text{P3} & \text{None (Monitor)} \\
\text{Normal} & \text{None} & \text{None} & \text{None} \\
\hline
\end{array}$$

### 4.4 Risk Score & Machine Health Formulas
Computed dynamically in `lib/risk.ts`:

$$\text{Likelihood} = \text{Severity Factor} \times \text{Confidence}$$

- Severity Factors: $\text{Critical/P1} = 1.0$, $\text{Alarm/P2} = 0.8$, $\text{Watch/P3} = 0.5$, $\text{Normal/None} = 0.2$
- Consequence Factors: $\text{Criticality A} = 1.0$, $\text{Criticality B} = 0.6$, $\text{Criticality C} = 0.3$

$$\text{Risk Score} = \min(100, \max(0, \text{round}(\text{Likelihood} \times \text{Consequence Factor} \times 100)))$$

$$\text{Machine Health Score} = 100 - \text{Risk Score}$$

*Example*: P07-M03 (Criticality A = 1.0, Alarm = 0.8, Confidence = 0.86):
$\text{Likelihood} = 0.8 \times 0.86 = 0.688 \implies \text{Risk} = 69\%, \text{Health} = 31\%$.

### 4.5 Financial Cost of Failure vs. Intervention
- **Network Baseline Cost**: $\text{USD } 18,000 \text{ per hour per production line}$.
- **Estimated Unplanned Failure Cost**:
  $$\text{est\_failure\_cost\_usd} = (\text{Estimated Downtime Hours} \times \$18,000) + \text{Secondary Damage Cost}$$
  *Example (AL-1001)*: $(7.0\text{ h} \times \$18,000) + \$18,000 = \$144,000$.
- **Estimated Planned Intervention Cost**:
  $$\text{est\_intervention\_cost\_usd} = \text{Parts Replacement Cost} + (\text{Technician Hours} \times \$75/\text{h})$$
  *Example (AL-1001)*: $\$1,200 \text{ (bearing)} + (8\text{ h} \times \$75) = \$1,800$.
- **Net Avoided Cost & Return on Intervention (ROI)**:
  $$\text{Net Avoided Cost} = \$144,000 - \$1,800 = +\$142,200 \quad (98.8\% \text{ cost avoidance})$$

### 4.6 PM Optimiser Rules & Calculation
Implemented in `lib/pmOptimiserService.ts`:
- **Pull Forward**:
  1. Triggered if machine has an open alert ($\text{confidence} = 0.92$), align date with alert window or pull forward 3 days.
  2. Triggered if sensor vibration $\ge 4.5\text{ mm/s}$ ($\text{confidence} = 0.88$), pull forward 5 days.
  3. Triggered if recent floor observation flags sensory cues ($\text{confidence} = 0.82$), pull forward 4 days.
  4. *Rule 9 Sync*: If task due date $\le 2026-10-18$, maintain date and label `keep` with reason `"due now"`.
- **Defer** (Only if task is not overdue):
  1. *Sensor Machines*: 14-day telemetry confirms vibration $< 3.5\text{ mm/s}$, data quality ok, 0 open defects. Safe deferral: Criticality A = 25 days, Criticality B = 35 days, Criticality C = 45 days ($\text{confidence} = 0.90$).
  2. *Legacy Machines*: Criticality C with clean history and 0 observations. Safe deferral = $\lfloor \text{interval\_days} / 2 \rfloor$ ($\text{confidence} = 0.78$).
- **Keep** (Fallback):
  - Overdue tasks ($\text{due\_date} < 2026-10-18$): cannot defer ($\text{confidence} = 0.95$).
  - Unmonitored Criticality A/B machines: cannot defer without sensors ($\text{confidence} = 0.85$).
- **Savings Aggregations**:
  $$\text{Technician Hours Saved} = \text{Defer Count} \times 2.5\text{ hours}$$
  $$\text{Planned Downtime Hours Saved} = \text{Defer Count} \times 1.5\text{ hours}$$
  $$\text{Visits Avoided} = \text{Defer Count}$$

---

## 5. Industrial AI Agents Specification

| Agent Name | Primary Purpose | Trigger | Inputs | Outputs | Prompt Version | Fallback Chain & Timeouts |
|---|---|---|---|---|---|---|
| **Triage Agent** | Ingests sensor trends and legacy observations; synthesizes root cause, urgency, LOTO, parts, and production window. | Floor observation on `/capture`; sensor anomaly trigger; "Re-run AI triage" button. | Machine metadata, telemetry trends, observations, shift schedules, spares inventory. | Structured `TriageOutput` JSON matching Zod schema v1. | `triage-v1.0` (`make/system_triage.txt`) | 1. Make.com Webhook (25s)<br>2. Direct Gemini 2.5 Flash (20s)<br>3. Fallback Gemini (15s)<br>4. Remote Agent (20s)<br>5. Cached Provider (instant) |
| **Signal Interpreter** | Converts unstructured technician notes in English, Hindi, or Hinglish into structured symptom vectors. | Form submission on `/capture`; alert re-evaluation with technician notes. | Raw unstructured text, technician language selection, machine type. | Parsed symptoms, standardized failure cues, and evidence IDs. | `interp-v1.0` (`make/system_interpreter.txt`) | Same fallback waterfall (Make -> Direct -> Fallback -> Cached). |
| **PM Optimiser** | Evaluates calendar PM plan against real-time condition to safely defer healthy tasks and pull forward urgent ones. | User navigates to `/planning` or triggers `/api/pm-optimiser`. | Scheduled PM tasks, 14-day telemetry trends, open alerts, machine criticalities. | Array of `keep`, `defer`, `pull_forward` decisions, dates, rationales, and net hours saved. | `pm-v1.0` (`make/system_pm_optimiser.txt`) | Same fallback waterfall (Make -> Direct -> Fallback -> Cached). |
| **Plant Copilot** | Conversational operational assistant answering equipment health queries and enforcing safety refusals. | User opens Copilot drawer on `/control-room` or top bar. | User query, plant context, machine history, live alerts, LOTO policy. | Grounded response with citations and direct links, OR deterministic LOTO bypass refusal. | `copilot-v1.0` (`make/system_copilot.txt`) | Same fallback waterfall (Make -> Direct -> Fallback -> Cached). |
| **Knowledge Agent** | Harvests tacit knowledge from closed work order root causes and notes to create reusable failure signatures. | Work order closure form submitted on `/work-orders/[id]`. | Closed work order details, technician closure notes, root cause, replaced parts. | Draft Knowledge Library card (`title`, `symptoms`, `root_cause`, `action`, `verified: false`). | `knowledge-v1.0` (`make/system_knowledge.txt`) | Same fallback waterfall (Make -> Direct -> Fallback -> Cached). |

### Agent Governance, Caching & Rate Limits
- **Response Cache**: 24-hour TTL in-memory LRU cache keyed by SHA-256 hash of agent name, prompt version, and context payload.
- **Client IP Rate Limiting**: Maximum 10 live LLM calls per hour per client IP (sliding window). Excess calls gracefully served by cached baseline.
- **Global Daily Cap**: Configured via `LIVE_AGENT_DAILY_CAP` (default 150 live calls/day) to prevent cost overruns.
- **Sanitized Execution**: All user prompt inputs are strictly truncated to 1,000 characters and isolated within JSON context blocks to prevent prompt injection.

---

## 6. Seed Data & Simulated Environment

Data counts verified against `data/seed_data.json`:

| Entity | Seed Count | Scope & Details |
|---|---|---|
| **Plants** | 40 facilities | 1 Live Pilot (P-07 Pune, 30 machines, 3 lines); 3 Shadow Mode (P-03 Stuttgart, P-12 Monterrey, P-21 Suzhou); 36 Not Onboarded facilities worldwide. |
| **Production Lines** | 13 lines | 3 lines at P-07 (L1 Carton Forming, L2 Filling and Sealing, L3 Wrapping and Palletising); 3 at P-03; 4 at P-12; 3 at P-21. |
| **Machines** | 94 machines | 30 at Pilot Plant P-07 (12 continuous IoT sensor monitored, 18 brownfield legacy manual inspection). Network simulation represents ~12,000 machines. |
| **Technicians** | 37 personnel | 12 at Pilot Plant P-07 (4 per shift across Shift A, Shift B, Shift C; 4 roles: Veteran, Technician, Junior, Trainee). |
| **Certifications** | 94 records | Tracks certifications across LOTO, Vibration Analysis (ISO 18436 Cat I/II/III), HT Electrician, and Mechanical Alignment. |
| **Technician Skills** | 444 records | Competency matrix ratings (Level 1 to 4) across mechanical, electrical, and sensor disciplines. |
| **Spares Inventory** | 120 parts | 30 SKUs at P-07 (global part numbers SP-001 through SP-030). |
| **Production Schedule** | 546 slots | 14-day rolling shift-line coordination matrix (3 shifts x 3 lines x 14 days). |
| **Sensor Telemetry** | 1,879 records | Baseline historical readings for vibration, temperature, and data quality. |
| **Maintenance Logs** | 500 history logs | Historical maintenance interventions, parts used, downtime, and MTBF data. |
| **KPI Snapshots** | 24 records | Historical monthly metrics (April to September 2026) establishing pilot baselines. |
| **PM Plans** | 94 plans | Calendar preventative maintenance schedules with task intervals. |
| **Observations** | 9 records | Frontline floor observations captured with sensory cues. |
| **Knowledge Library** | 12 cards | Validated veteran failure signatures with symptom patterns and recommended remedies. |
| **Active Alerts** | 17 alerts | Seeded scenarios across pilot and shadow plants. |
| **Work Orders** | 6 work orders | Work orders in scheduled, in-progress (mid-LOTO), and closed states. |

### Simulation Mechanisms
- **Telemetry Simulator** (`lib/simulator.ts`): Client-side background ticker updates sensor readings every 3 seconds with bounded Gaussian noise. P07-M03 simulates progressive bearing failure with continuously rising vibration.
- **Demo State Reset** (`/api/demo/reset`): One-click top-bar button completely restores seed data state in memory, resetting telemetry and restoring all seeded work orders and alerts.
- **Provider Fallback**: In cached mode (`AGENT_PROVIDER=cached`), zero external API calls are made; responses are served deterministically from seed templates.

---

## 7. App Routes & Modules

| Route | Module Name | Primary Purpose | Key Components |
|---|---|---|---|
| `/` or `/control-room` | Control Room | Plant-level operational mimic, line health status, hero KPIs, attention section, live clock. | `ControlRoomView`, `AttentionSection`, `LineMimic`, `KpiStrip`, `PlantCopilotDrawer` |
| `/network` | Fleet Network | Multi-plant executive view across 40 plants, rollout progress bar, downtime costs, regional filters. | `NetworkView`, `RolloutProgressBar`, `PlantTable` |
| `/my-tasks` | Role Operational Queue | Persona-filtered task list displaying pending actions assigned specifically to the active role. | `MyTasksView`, `RoleTaskCard`, `WorkflowStageBadge` |
| `/alerts` | Alert Management | Queue of all active, triaged, approved, and suppressed alerts with risk scores and failure taxonomies. | `AlertsListView`, `AlertCard`, `UrgencyBadge` |
| `/alerts/[id]` | Alert Detail View | 9-stage Flow Tracker, sensor evidence, AI reasoning, cost ROI comparison, guardrails, Correct & re-check. | `AlertDetailView`, `WorkflowFlowTracker`, `GuardrailVerificationCard`, `CorrectAndRecheck` |
| `/machines/[id]` | Machine History Card | Asset details, maintenance strategy, live ISO 10816 vibration chart, MTBF/MTTR, maintenance timeline. | `MachineHistoryCard`, `TelemetryChart`, `MaintenanceTimeline` |
| `/planning` | Maintenance Planning | Strategy mix (BM/PM/CBM/RBM), risk matrix (criticality x probability), AI PM Optimiser table. | `PlanningView`, `RiskMatrix`, `PmOptimiserTable` |
| `/work-orders` | Execution Kanban | Kanban board of work orders (scheduled, in_progress, closed) with search and priority filters. | `WorkOrdersKanban`, `WorkOrderCard` |
| `/work-orders/[id]` | Work Order Detail | Pre-execution clearance (spares & window), 6-step LOTO checklist, task checklist, closure form. | `WorkOrderDetailView`, `LotoChecklist`, `TaskExecutionList`, `ClosureForm` |
| `/spares` | Spares Readiness | Real-time inventory vs safety stock, lead times, critical flags, work order reservations, PR modal. | `SparesView`, `StockoutBanner`, `PurchaseRequestModal` |
| `/production` | Production Coordination | 14-day x 3-line x 3-shift grid, colour-coded window types, maintenance overlays, window confirmation. | `ProductionView`, `ShiftScheduleGrid`, `WindowConfirmationModal` |
| `/kpis` | Reliability KPI Dashboard | MTBF, MTTR, availability, planned maintenance %, wasted PM %, breakdown hours, downtime cost. | `KpisView`, `KpiTrendChart`, `PilotTargetComparison` |
| `/people` | Skills & Development | Skill matrix heatmap (level 1-4), certification expiry tracker, veteran failure cards, shadow pairings. | `PeopleView`, `SkillMatrixHeatmap`, `CertExpiryTable`, `KnowledgeCardLibrary` |
| `/capture` | Frontline Capture | Mobile-first 5-step technician wizard: who, machine, symptom tags, voice/text note, submit. | `CaptureWizard`, `SpeechToTextButton`, `SymptomTagSelector` |
| `/agent` | Agent Observability | Live execution log, token counts, latency, provider waterfall, schema validity, golden-set scorecard. | `AgentConsoleView`, `AgentTelemetryTable`, `GoldenScorecardTab` |
| `/status` | Live System Status | Real-time health monitor for Supabase DB, Gemini Direct, Make webhook, quota caps, and errors. | `StatusView`, `HealthCheckStrip`, `ErrorLogStream` |
| `/about` | Assessor Briefing | TPM business case narrative, system architecture diagram, S1-S8 scenario launchers, evaluation rubric. | `AboutView`, `ArchitectureDiagram`, `ScenarioLauncherStrip` |

---

## 8. Technical Architecture & Infrastructure

- **Front-End & Application Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui primitives, Lucide React icons, self-hosted IBM Plex Sans fonts via `@fontsource/ibm-plex-sans`.
- **Hosting & Deployment**: Vercel Serverless Edge Platform (`https://ferrow-foresight.vercel.app`). Branch `dev` for preview builds, `main` for production. Fully static and dynamic route optimization.
- **Database & Persistence**:
  - Dual Backend Architecture: Supabase PostgreSQL (`supabase/schema.sql`) with Row-Level Security (RLS) policies.
  - Zero-Setup Local Persistence: Seed JSON (`data/seed_data.json`) disk/memory layer (`lib/data/*`) automatically active if remote database is unreachable.
- **AI Orchestration & LLMs**:
  - External Orchestration: Make.com scenario webhook (`MAKE_WEBHOOK_URL`).
  - Native Direct Fallback: Google Gemini 2.5 Flash (`gemini-2.5-flash`) via Google AI REST API (`temperature = 0`, structured JSON mode).
  - Multi-tier Provider Waterfall: `Make.com -> Direct Gemini -> Fallback Gemini -> Remote Endpoint -> Cached Provider`.
- **Continuous Integration (CI)**: GitHub Actions (`.github/workflows/ci.yml`) on Ubuntu 24.04 with Node 24:
  - Strict TypeScript typechecking (`tsc --noEmit`).
  - ESLint verification.
  - Vitest unit & integration test suite.
  - Production Next.js build verification.
  - Multi-Browser Playwright E2E testing (Chromium, Firefox, WebKit).
  - Axe-Core accessibility color contrast compliance.
  - Responsive viewport overflow checks.
  - Cross-platform launcher smoke tests.
- **One-Click Launchers**:
  - macOS / Linux: `Start Ferrow (Mac).command` (zero-setup terminal script checking Node/npm, pre-warming, opening default browser).
  - Windows: `Start Ferrow (Windows).bat` (defensive batch script with error handling, starting local server and launching browser).
- **Progressive Web App (PWA)**: Installable PWA (`public/manifest.json`, `public/sw.js`), standalone display mode, 192x192 & 512x512 app icons, optimized for factory floor tablets and mobile devices.
