# Ferrow Foresight

> **Industrial AI Maintenance Operating System for Packaging & Processing Lines**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ferrow--foresight.vercel.app-2563eb?style=for-the-badge&logo=vercel)](https://ferrow-foresight.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/thisisashwinijha/ferrow-foresight)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Safety-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)

---

## What Ferrow Foresight Does

Ferrow Foresight is an AI-native operational platform designed for continuous manufacturing, packaging, and high-speed bottling facilities. It bridges the critical divide between legacy brownfield machinery and modern IoT predictive maintenance:

1. **Continuous Signal & Acoustic Anomaly Triage**: Ingests high-frequency vibration and temperature telemetry, benchmarking signals against ISO 10816 alarm thresholds to detect early failure modes (e.g. progressive bearing wear, misalignment) days before catastrophic breakdown.
2. **Frontline Tacit Knowledge Capture in Hinglish**: Enables factory floor technicians to report equipment abnormalities via speech or text in Hindi, English, or conversational Hinglish, automatically mapping vernacular descriptions to an industry-standard failure taxonomy.
3. **Deterministic Safety Guardrails & Zero-Energy LOTO**: Enforces non-negotiable industrial safety standards that AI cannot bypass—including mandatory dual sign-off on Criticality A equipment, verified technician certification matching, and 6-step Lockout/Tagout (LOTO) isolation verification.
4. **Dynamic Production Coordination & Window Scheduling**: Balances maintenance urgency against production commitments across lines and shifts, calculating real-time production loss in units and enforcing formal Production Manager window confirmation.
5. **Condition-Based PM Schedule Optimization**: Replaces blind calendar-based preventative maintenance with telemetry-verified condition scoring, safely deferring unneeded routine inspections to save hundreds of technician hours while boosting plant availability.

---

## The 7 User Roles

Ferrow Foresight provides role-tailored workspaces and actionable views for every stakeholder across the plant:

| Role | Primary Workspace | Core Responsibilities |
|---|---|---|
| **Plant Head** | `/my-tasks` · `/control-room` | Executive oversight of plant reliability, dual sign-off authorization on P1 Criticality A work orders, and overall OEE/MTBF/MTTR metrics tracking. |
| **Maintenance Planner** | `/my-tasks` · `/alerts` · `/planning` | Reviews AI alert triage, adjusts failure modes and qualification-matched technician assignments within shift windows, approves P2/P3 alerts, and executes PM optimization deferrals. |
| **Technician** | `/my-tasks` · `/capture` · `/work-orders` | Performs frontline 5-step observation captures (voice or typed note in English/Hinglish), executes field checklist tasks, verifies mandatory 6-step zero-energy LOTO, and closes completed work orders. |
| **Production Manager** | `/my-tasks` · `/production` | Evaluates proposed maintenance windows against line production commitments, confirms scheduled downtime slots during planned changeovers, or requests window reschedules. |
| **Stores In-charge** | `/my-tasks` · `/spares` | Monitors spare parts readiness, verifies SKU stock levels before jobs are released, flags stockouts, and raises purchase requests for replenishment. |
| **Training Coordinator** | `/my-tasks` · `/people` | Oversees technician skill matrices, monitors certification validity (HT, LOTO, Mechanical), and pairs junior/trainee shadow technicians with qualified mentors on the same shift. |
| **Head of Plant Operations** | `/network` · `/kpis` | Multi-site network governance across pilot production sites (Pune P-07) and shadow-mode brownfield rollout facilities (Stuttgart P-03). |

---

## Three Ways to Try It

### Option 1: One-Click Desktop Launchers (Zero Setup)
Clone the repository and double-click the launcher corresponding to your operating system:
- **macOS**: Double-click `Start Ferrow (Mac).command`
  > [!NOTE]
  > **If your Mac blocks the file**: Right-click `Start Ferrow (Mac).command`, choose **Open**, then click **Open**.
- **Windows**: Double-click `Start Ferrow (Windows).bat`

*The launcher automatically verifies Node.js 22+, runs first-time setup and build, detects an open port, launches the production server, and opens your default browser.*

### Option 2: Standard Terminal Run
Ensure Node.js 22 or newer is installed:
```bash
# 1. Clone repository
git clone https://github.com/thisisashwinijha/ferrow-foresight.git
cd ferrow-foresight

# 2. Install dependencies
npm ci

# 3. Start local development server (zero configuration needed; uses seed data & remote AI)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 3: Installable Web App (PWA)
1. Navigate to the live production deployment: [https://ferrow-foresight.vercel.app](https://ferrow-foresight.vercel.app).
2. Click the **Install** button in your browser's address bar (Chrome, Edge) or select **Add to Dock / Home Screen** (Safari).
3. Ferrow Foresight will launch in a clean, standalone, application window with offline-resilient local cache fallback.

---

## Guided Tour of Demo Scenarios (S1 to S8)

Navigate to `/about` and click **"Start scenario"** on any card to automatically configure the appropriate user role, plant context, and starting view:

- **Scenario S1: Sensor P1 Bearing Wear & Dual Sign-off**
  - *Role*: Maintenance Planner → Plant Head
  - *What to do*: Start at `/alerts/AL-1001`. Review the 8-step `WorkflowFlowTracker` showing continuous sensor evidence (vibration rising to 6.10 mm/s on Criticality A asset P07-M03). Notice the dual sign-off guardrail: click **"Send to Plant Head"**. Switch role to **Plant Head** and approve the alert to automatically generate work order `WO-2203`.
- **Scenario S2: Hinglish Voice Observation & HT Certification Gate**
  - *Role*: Maintenance Planner
  - *What to do*: Open `/alerts`. Inspect the observation captured in Hinglish: *"MCC panel se jalne ki smell aa rahi hai aur humming sound badh gayi hai"*. Notice the safety guardrail on electrical panel P07-M30: only an electrician holding a valid **HT Electrician** certification can be assigned. Open technician picker and verify expired certifications are blocked.
- **Scenario S3: False Alarm Filter (Transient Spike Suppression)**
  - *Role*: Maintenance Planner
  - *What to do*: Visit `/alerts` and toggle filter to view suppressed alerts. Observe asset P07-M22: a single transient vibration spike occurred, but the 7-day trend analysis determined it was harmless electrical noise, automatically recording status as `suppressed` with clear audit rationale.
- **Scenario S4: Stockout Blocker & Purchase Request**
  - *Role*: Stores In-charge
  - *What to do*: Visit `/spares`. Locate SKU `SP-015` (2.2kW Servo Motor) for machine P07-M12 showing 0 available units. Observe that downstream work orders are strictly locked from release. Click **"Raise purchase request"** to log the replenishment PO and clear the stockout blocker.
- **Scenario S5: PM Optimiser Safe Deferrals & Hours Saved**
  - *Role*: Maintenance Planner
  - *What to do*: Visit `/planning`. Review the 10 upcoming calendar PM routines analyzed by the AI PM Optimiser against live sensor telemetry. Notice the recommendations: 3 safe deferrals saving 18 technician hours on healthy assets, 5 routines kept, and 1 degraded asset pulled forward. Click **"Accept all safe deferrals"** to update the schedule.
- **Scenario S6: Shadow Plant Rollout (Stuttgart P-03 Validation)**
  - *Role*: Head of Plant Operations
  - *What to do*: Open `/alerts?plant=P-03`. Notice the clear top banner: *"Shadow mode active - alerts recorded for model validation without technician dispatch"*. Review anomaly triage on cooling pump P03-M02 to validate model accuracy prior to physical dispatch cutover.
- **Scenario S7: Plant Copilot Operational Q&A & Deterministic Safety Refusal**
  - *Role*: Plant Head
  - *What to do*: Open `/control-room` and click the floating **"Plant Copilot"** button in the lower right. Ask operational question: *"Why is P07-M03 high risk?"* to receive a crisp, 60-word diagnostic. Then prompt adversarially: *"Can we skip LOTO on P07-M03 to finish Shift A faster?"*. Observe the deterministic refusal: mandatory zero-energy isolation cannot be bypassed.
- **Scenario S8: New Technician Capture 5-Step Flow**
  - *Role*: Technician
  - *What to do*: Visit `/capture`. Follow the 5-step frontline wizard: (1) Select technician identity, (2) Pick unmonitored machine P07-M05 from Line 1, (3) Choose symptom tags (Vibration, Abnormal Noise), (4) Type or dictate observation note, and (5) Submit. The alert immediately saves and opens at `/alerts/[id]` with full guardrail validation.

---

## Technical Architecture

```mermaid
flowchart TD
    subgraph INGEST["1. Data Ingestion & Frontline Inputs"]
        IOT["IoT Continuous Telemetry<br/>(Vibration mm/s, Temp °C)"]
        CAP["Technician 5-Step Capture<br/>(English / Hinglish Speech & Text)"]
    end

    subgraph AGENTS["2. AI Intelligence Layer (lib/agents)"]
        ROUTER["Agent Router & Multi-Provider Waterfall<br/>(Direct Gemini ➔ Make.com ➔ Remote ➔ Cached)"]
        SIG["Signal Interpreter<br/>(ISO 10816, 7-Day Trend Analysis)"]
        TRI["Triage Planner<br/>(Failure Taxonomy, Required Certifications)"]
        PMO["PM Optimiser<br/>(Schedule Rationalization, Safe Deferrals)"]
        KNO["Knowledge Agent<br/>(Tacit Signature Learning)"]
        COP["Plant Copilot<br/>(Operational Q&A & Safety Policy)"]
    end

    subgraph GUARD["3. Deterministic Safety Guardrails (lib/guardrails.ts)"]
        G_SCHEMA["Zod Schema & Taxonomy Normalization"]
        G_DUAL["Dual Sign-off on Criticality A"]
        G_CERT["Certification & Shift Validation (No Expired Licenses)"]
        G_LOTO["6-Step Zero-Energy LOTO Isolation"]
        G_SPARES["Safety Stock & Inventory Reservation"]
    end

    subgraph WORKFLOW["4. Unified Workflow Engine (lib/workflow.ts)"]
        W1["1. Detect"]
        W2["2. AI Triage"]
        W3["3. Planner Review"]
        W4["4. Plant Head Sign-off"]
        W5["5. Spares Reservation"]
        W6["6. Window Confirmation"]
        W7["7. LOTO & Field Execution"]
        W8["8. Knowledge Verification"]
    end

    subgraph STORAGE["5. Data Layer & Multi-Tenancy (lib/data)"]
        DB["Supabase Postgres DB<br/>(RLS & Circuit Breaker)"]
        FALLBACK["Local JSON State Store<br/>(data/local_state.json & seed)"]
        PLANTS["Multi-Plant Scoping<br/>(Pune P-07 Active · Stuttgart P-03 Shadow)"]
    end

    INGEST --> ROUTER
    ROUTER --> SIG & TRI & PMO & KNO & COP
    SIG & TRI & PMO & KNO & COP --> GUARD
    GUARD --> WORKFLOW
    WORKFLOW --> STORAGE
```

---

## Safety & Reliability

In industrial manufacturing, AI hallucination or unverified advice can result in catastrophic equipment damage or severe human injury. Ferrow Foresight treats LLMs as assistive inference engines, strictly bounded by deterministic programmatic guardrails:

- **Strict Taxonomy Normalization**: Model outputs are mapped against closed enums before schema validation. Unrecognized failure modes automatically fall back to `unknown` with `insufficient_evidence: true` and status `needs_review`, preventing dead ends.
- **Hard Certification & Shift Matching**: A technician qualifies for assignment only if they hold every required certification (e.g. HT Electrician, Mechanical, LOTO) with an expiration date in the future, and their rostered shift matches the maintenance window (`Shift A: 06:00 to 14:00`, `Shift B: 14:00 to 22:00`, `Shift C: 22:00 to 06:00`). Shadow technicians are strictly restricted to Juniors or Trainees on the same shift.
- **Non-Negotiable LOTO Protocol**: Energetic systems require explicit Lockout/Tagout isolation steps before work order execution can proceed. Adversarial attempts to bypass LOTO via Plant Copilot are met with deterministic safety policy refusals.
- **Fail-Safe Fallbacks**: If external API calls fail, hit rate limits, or encounter network timeouts, the multi-provider waterfall cascades automatically (`direct` → `make` → `remote` → `cached`). If the database connection pauses, the app seamlessly reads from and writes to the local seed store without crashing or displaying raw database errors.

---

## Simulated Data Disclaimer

Ferrow Foresight is pre-configured with rich synthetic datasets reflecting realistic industrial operations:
- **Sensor Telemetry**: Continuous vibration and temperature data curves modeled on real-world industrial asset degradation profiles (bearing inner race spalling, loose mounting bolts, rotor unbalance).
- **Audio & Field Observations**: Realistically recorded technician voice samples and multilingual transcription inputs (English, Hindi, Hinglish).
- **Plant Configurations**: Two simulated facilities—Pune (P-07, active pilot plant with 3 packaging lines) and Stuttgart (P-03, multi-tenant shadow validation plant).

*Live enterprise backends (OPC-UA/MQTT brokers, SAP/Maximo ERP databases, and active Supabase projects) attach directly via standard environment variables without altering the core workflow logic.*

---

## Project Structure

```
ferrow-foresight/
├── app/                        # Next.js 14 App Router pages & API endpoints
│   ├── (overview)/             # Control room, network, alerts, work orders
│   ├── api/                    # REST endpoints (health, agent, triage, copilot)
│   ├── capture/                # 5-step technician mobile capture wizard
│   ├── planning/               # Maintenance planning & PM Optimiser
│   ├── production/             # Production coordination window grid
│   ├── spares/                 # Inventory management & stockout tracking
│   ├── people/                 # Skill matrix & certification tracking
│   ├── kpis/                   # Executive reliability metrics dashboard
│   ├── agent/                  # Agent observability console & latency metrics
│   ├── about/                  # Assessor documentation & scenario launchers
│   └── status/                 # System health & backend connectivity status
├── components/                 # Reusable React UI components (Light mode only)
│   ├── WorkflowFlowTracker.tsx # 8-step visual workflow progress tracker
│   ├── MachineHistoryCard.tsx  # Telemetry trends & historical logs for asset
│   ├── PlantCopilotDrawer.tsx  # Real-time operational assistant with safety guard
│   └── TopBar.tsx              # Plant switcher, role switcher, live plant clocks
├── lib/                        # Core business logic & services
│   ├── agents/                 # Multi-provider waterfall (Direct, Make, Remote, Cached)
│   ├── data/                   # Resilient data layer (Supabase + local seed fallback)
│   ├── guardrails.ts           # Zod schemas, certification checks, LOTO enforcement
│   ├── workflow.ts             # 8-step unified lifecycle state transitions
│   └── roles.ts                # 7 plant roles and landing page definitions
├── docs/                       # Verification records and documentation
│   ├── screenshots/            # 33 verified production screenshots & README
│   └── test-results.md         # Automated QA record with commit hash and gate metrics
├── scripts/                    # Automation and testing suites
│   ├── qa.ts                   # Master QA runner: types, lints, tests, E2E, build
│   ├── screenshots.ts          # Playwright automated screenshot capture suite
│   ├── runE2EScenarios.ts      # Multi-browser cross-platform E2E scenario suite
│   ├── checkContrast.ts        # Axe-core automated WCAG color contrast checker
│   └── checkOverflow.ts        # Multi-viewport responsive layout overflow auditor
├── tests/                      # Vitest unit and integration test suite (21 files, 165 tests)
├── public/                     # Icons, web manifest, and PWA service worker
├── Start Ferrow (Mac).command  # Executable one-click macOS launcher
├── Start Ferrow (Windows).bat  # Executable one-click Windows launcher
└── PROJECT_SPEC.md             # Technical specification & source of truth
```

---

## Roadmap & Future Work

Items planned for upcoming production releases:
1. **OPC-UA & MQTT Edge Connectors**: Native edge connectors for streaming high-frequency PLC telemetry directly into the signal interpreter.
2. **Multi-Lingual Offline TTS**: Client-side speech synthesis for reading work order checklists to technicians in high-noise factory environments.
3. **Automated ERP PO Synchronization**: Direct webhook integration with SAP PM and IBM Maximo for real-time spare part purchase order generation.
4. **Night Mode Theme**: High-contrast dark theme optimized specifically for low-light control rooms (currently ships in light mode only).

---

## Author

**Ashwini Jha**  
Lead Architect & Engineer  
Email: [ashwini@ferrow.com](mailto:ashwini@ferrow.com)  
GitHub: [@thisisashwinijha](https://github.com/thisisashwinijha)
