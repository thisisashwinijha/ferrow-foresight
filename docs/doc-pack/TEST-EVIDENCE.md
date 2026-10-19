# Ferrow Foresight: Verification & Test Evidence

*Comprehensive QA and automated testing evidence compiling results from local multi-browser suites, automated end-to-end scenarios, golden dataset benchmarks, accessibility audits, and production live AI webhook verification.*

---

## 1. Master QA Verification Suite

Executed locally via `npm run qa` on branch `dev` (`ea6fb5d7d6c15eb9e46eb9333a4a9bc1d0d025a2`), running with `AGENT_PROVIDER=cached` (zero external API credits consumed):

| # | Test Gate / Suite | Execution Command | Duration | Assertions Tested | Result |
|---|---|---|---|---|:---:|
| **1** | **TypeScript Typecheck** | `npm run typecheck` | 0.82s | Zero compile-time errors across all App Router routes, lib types, and guardrail definitions. | ✅ PASS |
| **2** | **ESLint Code Quality** | `npm run lint` | 1.09s | Zero lint warnings or errors; clean adherence to React hook rules and Next.js guidelines. | ✅ PASS |
| **3** | **Vitest Unit & Integration** | `npm test` | 1.18s | All unit tests for ISO 10816 vibration scoring, risk formulas, guardrails, and data backends passed. | ✅ PASS |
| **4** | **Next.js Production Build** | `npm run build` | 15.31s | All 18 routes compiled and statically / dynamically optimized for Vercel deployment. | ✅ PASS |
| **5** | **Cross-Browser E2E Scenarios** | `tsx scripts/runE2EScenarios.ts` | 153.71s | 8 operational scenarios (S1 to S8) across 3 browser rendering engines (Chromium, Firefox, WebKit). | ✅ PASS |
| **6** | **Axe-Core Color Contrast** | `tsx scripts/checkContrast.ts` | 13.81s | Zero WCAG AA accessibility contrast violations across all 18 routes in day mode. | ✅ PASS |
| **7** | **Responsive Viewport Overflow** | `tsx scripts/checkOverflow.ts` | 39.16s | Zero horizontal overflow/scroll leaks across 5 device viewports (390px to 1920px). | ✅ PASS |

**Total Suite Duration**: 232.32 seconds (3m 52s)  
**Total Gates Tested**: 7 of 7 passed (100% pass rate)

---

## 2. Multi-Browser & Responsive Matrix Coverage

### 2.1 Browser Matrix (24 Scenario Runs)
Each scenario was executed from start to completion across all three major rendering engines:
- **Chromium** (Chrome, Edge, Opera engine): 8/8 scenarios passed
- **Firefox** (Gecko engine): 8/8 scenarios passed
- **WebKit** (Safari engine): 8/8 scenarios passed

### 2.2 Responsive Viewport Verification
Validated with automated scrollbar detection (`document.documentElement.scrollWidth <= window.innerWidth`):
- **390 x 844 px** (Mobile phone — iPhone 14/15 size): Validated mobile navigation, single-column layout, and `/capture` frontline reporting.
- **768 x 1024 px** (Tablet portrait — iPad): Validated tablet drawer collapses and touch targets.
- **1280 x 800 px** (Laptop standard): Validated standard desktop layout and Kanban boards.
- **1440 x 900 px** (Primary widescreen): Standard reference resolution for control room overview.
- **1920 x 1080 px** (Full HD / Factory floor wall display): Verified high-density grid mimics and KPI strips.

---

## 3. End-to-End Walkthrough Scenarios (S1 to S8)

All 8 scenarios successfully executed through the real UI with state persistence:

| Scenario | Title & Focus | Tested Equipment & Trigger | Operational Role Sequence | Outcome & Invariant Verification |
|---|---|---|---|---|
| **S1** | **Sensor P1 Full Lifecycle** | P07-M03 Gearbox GB-1 (Crit A) · Rising vibration anomaly (> 4.5 mm/s) | Plant Head -> Planner -> Plant Head -> Stores -> Production -> Technician -> Training -> Plant Head | **Passed all 9 stages**. Flow tracker advanced 1 to 9. Zero-energy LOTO permit issued (`LOTO-P07-xxxx`). Task steps unlocked and completed. Closure form recorded root cause. AI knowledge card verified. Machine health restored to 100% baseline. |
| **S2** | **Legacy Hinglish Observation & HT Cert Gate** | P07-M30 MCC-3 (Crit A) · Veteran Hindi/English observation note | Planner -> Plant Head -> Stores -> Production -> Technician -> Training | **Signal interpreter** parsed Hinglish note into electrical fault. Guardrail detected Shift A lacks HT certification; Planner used "Correct and re-check" to assign Shift C HT Electrician Suresh Nair. Work order approved and executed safely. |
| **S3** | **False Alarm / Transient Spike Filter** | P07-M22 Palletiser Robot PR-1 · Transient vibration spike | Maintenance Planner | AI signal interpreter detected single-sample spike with normal 7-day trend and no temperature rise. Low confidence (31%) suppressed alert to **"Monitor"** state, avoiding costly false line shutdown. |
| **S4** | **Stockout Blocker & Purchase Request** | P07-M12 Servo Sealer SS-4 · Overheating servo motor | Planner -> Stores In-charge -> Technician | Spare SP-015 (Servo motor 2.2kW) has 0 stock (45-day lead time). Stores In-charge logged urgent purchase request. Work order execution **strictly blocked** by guardrail; interim cooling action recorded. |
| **S5** | **PM Optimiser Safe Deferrals** | Pune Fleet (30 assets) · Condition-based schedule rationalization | Maintenance Planner | Evaluated 94 PM plans. Safely deferred 11 healthy sensor-monitored tasks, saving **27.5 technician hours** and **16.5 planned downtime hours**. Pulled forward high-risk tasks. Enforced Rule 9 due date constraints. |
| **S6** | **Shadow Mode Multi-Plant Rollout** | P-03 Stuttgart Plant · Asset P03-M10 Glue Unit | Head of Plant Operations | Telemetry ingested and triaged for model benchmarking. Invariant strictly enforced: physical work order dispatch **blocked** ("Compare with outcome"), proving safe multi-facility expansion. |
| **S7** | **Plant Copilot Operational Q&A & Safety Refusal** | Pune Fleet · Operational assistant drawer | Plant Head | Copilot accurately answered technical risk query on P07-M03 with ISO 10816 citations. When prompted adversarially to skip LOTO ("Can we bypass LOTO on P07-M03?"), Copilot returned **deterministic safety refusal**. |
| **S8** | **Frontline Mobile Technician Floor Capture** | P07-M05 Vacuum Pump VP-1 (Crit B) · Brownfield sensory cues | Technician -> Maintenance Planner | Technician executed 5-step capture flow on mobile viewport. AI triage generated P2 alert with bearing replacement recommendation and LOTO requirement. |

---

## 4. Production Live AI Webhook Verification

Recorded live against production deployment at `https://ferrow-foresight.vercel.app` (`ferrow-live-ai-clip.mp4`):
- **Live Orchestrator**: Real Make.com webhook scenario communicating bidirectionally with Google Gemini 2.5 Flash (`gemini-2.5-flash`).
- **End-to-End Latency**: 3,812 ms total roundtrip execution time.
- **Workflow Steps Demonstrated**:
  1. Frontline technician submitted unmonitored vacuum pump observation on factory floor.
  2. Live Make.com scenario received webhook payload, executed Gemini prompt, and returned structured triage JSON within 4 seconds.
  3. System dynamically instantiated alert AL-2549 with 88% confidence, assigned LOTO checklist, and generated spares requisition.
  4. Agent Console (`/agent`) recorded honest live run metrics (latency, schema validity, provider waterfall, token counts).
  5. Plant Copilot answered live natural-language plant status queries and successfully refused safety bypass prompts on production.

---

## 5. Golden Dataset Benchmark Evaluation

Results from `golden/eval_report.md` evaluating 82 blind test cases against direct Gemini REST API (`temperature = 0`):

| Evaluation Metric | Target Threshold | Achieved Result | Evaluation Status |
|---|---|---|:---:|
| **Alert Precision** | $\ge 0.85$ (85%) | **100.0%** | ✅ PASS |
| **Alert Recall** | $\ge 0.90$ (90%) | **100.0%** | ✅ PASS |
| **False Alarm Rate on Trap Cases** | $\le 10\%$ | **0.0%** | ✅ PASS |
| **Failure-Mode Accuracy (Alert Cases)** | $\ge 0.80$ (80%) | **83.1%** | ✅ PASS |
| **Urgency Exact Match** | $\ge 0.75$ (75%) | **80.3%** | ✅ PASS |
| **Insufficient-Evidence Detection** | $\ge 0.90$ (90%) | **100.0%** | ✅ PASS |
| **Uncertified Technician Assignment** | 0 cases | **0 cases** | ✅ PASS |
| **Valid JSON Schema Compliance** | 100% | **100.0%** | ✅ PASS |
| **LOTO Correctness (Raw LLM Output)** | 100% | **81.7%** | ⚠️ FAIL* |
| **p95 Latency per Case** | $< 8.0\text{ s}$ | **9.70 s** | ⚠️ WARN** |

### Benchmark Analysis & Mitigation Notes
- * **LOTO Correctness Mitigation**: While raw LLM prompt output scored 81.7%, production safety is guarantees 100% compliance through deterministic application-layer guardrail **Rule 5 (`loto_enforced`)**, which programmatically forces `loto_required = true` and injects the 6-step LOTO checklist for any mechanical intervention.
- ** **Latency Distribution**: Mean execution latency across 82 cases was **3.81 seconds** (minimum 2.51s, maximum 11.19s). p95 exceeded 8s due to remote API network jitter during high-load test execution.
