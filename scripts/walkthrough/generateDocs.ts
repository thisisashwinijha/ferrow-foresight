import * as fs from 'fs';
import * as path from 'path';

export function generateDocs() {
  console.log('Generating docs/walkthrough.md and docs/walkthrough/roles.md...');

  // 1. Generate docs/walkthrough.md
  const walkthroughContent = `# Ferrow Foresight: Full-Cycle Automated Walkthrough

Automated walkthrough recordings and role-based screenshots demonstrating the full end-to-end industrial maintenance intelligence lifecycle across 8 scenarios, 7 operational roles, and a live Make.com/Gemini AI validation clip.

---

## Video Recordings

All recordings use 1440x900 resolution, Chromium light mode, standard caption bar overlay with 2.5s reading pauses, and real UI-driven execution.

| Video | Scenario | Duration | Size | Format |
|---|---|---|---|---|
| [ferrow-S1-full-cycle.mp4](videos/ferrow-S1-full-cycle.mp4) | **S1**: Sensor P1 Full 9-Stage Cycle (P07-M03) | 1m 57s | 2.70 MB | H.264 / MP4 |
| [ferrow-S2-full-cycle.mp4](videos/ferrow-S2-full-cycle.mp4) | **S2**: Legacy Hinglish Full 9-Stage Cycle (P07-M30) | 1m 51s | 2.54 MB | H.264 / MP4 |
| [ferrow-S8-full-cycle.mp4](videos/ferrow-S8-full-cycle.mp4) | **S8**: Technician Floor Capture Full 9-Stage Cycle (P07-M05) | 2m 06s | 2.05 MB | H.264 / MP4 |
| [ferrow-S3-S7.mp4](videos/ferrow-S3-S7.mp4) | **S3-S7**: False Alarm, Stockout, PM Optimiser, Shadow Mode, Copilot | 1m 38s | 2.27 MB | H.264 / MP4 |
| [ferrow-live-ai-clip.mp4](videos/ferrow-live-ai-clip.mp4) | **Live AI Clip**: Production Make.com & Gemini Webhook Verification | 1m 50s | 2.07 MB | H.264 / MP4 |

---

## Scenario 1: Sensor P1 Full Lifecycle (AL-1001 on P07-M03)
*Machine: P07-M03 Filler Monoblock FM-1 (Criticality A) · Trigger: Sensor Threshold · Urgency: P1 · Failure Mode: Bearing Wear*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 1: Detect** | Plant Head | \`/control-room\` | Detect rising vibration anomaly on line mimic | [Control Room Tile](s1/01-stage1-control-room-tile-alert.png) | [Rising Vibration History](s1/02-stage1-machine-history-rising-vibration.png) |
| **Stage 2: Triage** | Maintenance Planner | \`/my-tasks\` & \`/alerts/AL-1001\` | Review deterministic triage, evidence & cost | [Planner My Tasks](s1/03-stage2-planner-mytasks-waiting.png) | [Triage Evidence & Cost](s1/04-stage2-planner-triage-detail.png) |
| **Stage 3: Forward** | Maintenance Planner | \`/alerts/AL-1001\` | Forward Criticality A / P1 alert to Plant Head | [Before Forward](s1/05-stage3-planner-before-send.png) | [After Forward](s1/06-stage3-planner-after-send.png) |
| **Stage 4: Approve** | Plant Head | \`/my-tasks\` & \`/alerts/AL-1001\` | Executive review & work order approval | [Plant Head My Tasks](s1/07-stage4-planthead-mytasks-waiting.png) | [Work Order Approved](s1/09-stage4-planthead-after-approve.png) |
| **Stage 5: Spares** | Stores In-charge | \`/my-tasks\` & \`/work-orders/WO-2203\` | Verify bearing inventory below min threshold | [Stores My Tasks](s1/10-stage5-stores-mytasks-waiting.png) | [Spares Reserved](s1/12-stage5-stores-after-confirm.png) |
| **Stage 6: Window** | Production Manager | \`/my-tasks\` & \`/work-orders/WO-2203\` | Confirm Sunday planned shutdown window | [Production My Tasks](s1/13-stage6-production-mytasks-waiting.png) | [Window Confirmed](s1/15-stage6-production-after-confirm.png) |
| **Stage 7: Execution** | Technician P07-T01 | \`/my-tasks\` & \`/work-orders/WO-2203\` | 6-step LOTO, replace bearing, close with root cause | [LOTO Steps Locked](s1/17-stage7-technician-before-loto-steps-locked.png) | [Permit Issued & Tasks Completed](s1/18-stage7-technician-loto-permit-issued.png) |
| **Stage 8: Verification** | Training Coordinator | \`/my-tasks\` & \`/people\` | Verify new failure signature in knowledge card | [Training My Tasks](s1/21-stage8-training-mytasks-waiting.png) | [Knowledge Card Verified](s1/23-stage8-training-after-verify.png) |
| **Stage 9: Completed** | Plant Head | \`/control-room\` & \`/work-orders\` | Assert normal baseline, timeline update & tracker | [Tile Restored to Normal](s1/24-stage9-completed-control-room.png) | [Flow Tracker 100%](s1/26-stage9-completed-flow-tracker.png) |

---

## Scenario 2: Legacy Hinglish Full Lifecycle (AL-1002 on P07-M30)
*Machine: P07-M30 Motor Control Centre (Criticality A) · Trigger: Veteran Hinglish Observation · Urgency: P1 · Failure Mode: Electrical Fault*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 2: Review** | Maintenance Planner | \`/my-tasks\` & \`/alerts/AL-1002\` | Planner reviews parsed Hinglish observation | [Planner My Tasks](s2/01-stage2-planner-mytasks-waiting.png) | [Parsed Hinglish Note](s2/02-stage2-planner-before-correct.png) |
| **Stage 3: Correct & Re-check** | Maintenance Planner | \`/alerts/AL-1002\` | Assign Shift C technician P07-T02 (HT cert) | [Before Re-check](s2/02-stage2-planner-before-correct.png) | [Shift C Re-check Pass](s2/03-stage2-planner-after-correct.png) |
| **Stage 3: Forward** | Maintenance Planner | \`/alerts/AL-1002\` | Send P1 Criticality A alert to Plant Head | [Before Forward](s2/04-stage3-planner-before-send.png) | [Forwarded to Plant Head](s2/05-stage3-planner-after-send.png) |
| **Stage 4: Approve** | Plant Head | \`/my-tasks\` & \`/alerts/AL-1002\` | Plant Head authorizes high-risk MCC work order | [Plant Head My Tasks](s2/06-stage4-planthead-mytasks-waiting.png) | [Work Order Approved](s2/08-stage4-planthead-after-approve.png) |
| **Stage 5: Spares** | Stores In-charge | \`/my-tasks\` & \`/work-orders/WO-2204\` | Stores confirms contactor & fuse spares | [Stores My Tasks](s2/09-stage5-stores-mytasks-waiting.png) | [Spares Reserved](s2/11-stage5-stores-after-confirm.png) |
| **Stage 6: Window** | Production Manager | \`/my-tasks\` & \`/work-orders/WO-2204\` | Production confirms Shift C maintenance window | [Production My Tasks](s2/12-stage6-production-mytasks-waiting.png) | [Window Confirmed](s2/14-stage6-production-after-confirm.png) |
| **Stage 7: Execution** | Technician P07-T02 | \`/my-tasks\` & \`/work-orders/WO-2204\` | Strict 6-step zero-energy LOTO, tasks, close | [LOTO Steps Locked](s2/16-stage7-technician-before-loto-steps-locked.png) | [Permit Issued & Tasks Completed](s2/17-stage7-technician-loto-permit-issued.png) |
| **Stage 8: Verification** | Training Coordinator | \`/my-tasks\` & \`/people\` | Verify new tacit knowledge card from Hinglish note | [Training My Tasks](s2/20-stage8-training-mytasks-waiting.png) | [Knowledge Card Verified](s2/22-stage8-training-after-verify.png) |
| **Stage 9: Completed** | Plant Head | \`/control-room\` & \`/work-orders\` | Assert machine normal, closed log & flow tracker | [Control Room Restored](s2/23-stage9-completed-control-room.png) | [Flow Tracker Complete](s2/25-stage9-completed-flow-tracker.png) |

---

## Scenario 8: Technician Floor Capture Full Lifecycle (P07-M05)
*Machine: P07-M05 Vacuum Pump VP-1 (Criticality B) · Trigger: Mobile Capture · Urgency: P2 · Failure Mode: Bearing Wear*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 1: Capture** | Technician P07-T03 | \`/capture\` | 5-step structured capture on unmonitored pump | [Capture Form Filled](s8/01-stage1-technician-before-submit.png) | [Deterministic Triage Result](s8/02-stage2-ai-triage-result.png) |
| **Stage 3: Approve** | Maintenance Planner | \`/alerts/AL-xxxx\` | Planner approves P2 Criticality B alert | [Before Approval](s8/03-stage3-planner-before-approve.png) | [Work Order Scheduled](s8/04-stage3-planner-after-approve.png) |
| **Stage 5: Spares** | Stores In-charge | \`/my-tasks\` & \`/work-orders/WO-xxxx\` | Stores confirms vacuum pump bearing spares | [Stores My Tasks](s8/05-stage5-stores-mytasks-waiting.png) | [Spares Confirmed](s8/07-stage5-stores-after-confirm.png) |
| **Stage 6: Window** | Production Manager | \`/my-tasks\` & \`/work-orders/WO-xxxx\` | Production confirms line changeover window | [Production My Tasks](s8/08-stage6-production-mytasks-waiting.png) | [Window Confirmed](s8/10-stage6-production-after-confirm.png) |
| **Stage 7: Execution** | Technician P07-T03 | \`/my-tasks\` & \`/work-orders/WO-xxxx\` | LOTO checklist, pump repair, close with root cause | [LOTO Checklist Locked](s8/12-stage7-technician-before-loto-steps-locked.png) | [Work Order Closed](s8/15-stage7-technician-after-close.png) |
| **Stage 8: Verification** | Training Coordinator | \`/my-tasks\` & \`/people\` | Knowledge library card verified for vacuum pump | [Training My Tasks](s8/16-stage8-training-mytasks-waiting.png) | [Knowledge Card Verified](s8/18-stage8-training-after-verify.png) |
| **Stage 9: Completed** | Plant Head | \`/control-room\` & \`/work-orders\` | Assert normal status, history timeline & flow tracker | [Machine Restored](s8/19-stage9-completed-control-room.png) | [Flow Tracker Complete](s8/21-stage9-completed-flow-tracker.png) |

---

## Scenario 4: Stockout Blocker & Purchase Request (AL-1006 on P07-M12)
*Machine: P07-M12 Servo Sealer SS-4 · Trigger: Temperature Rise · Urgency: P2 · Blocked Spare: SP-015 (45d Lead Time)*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 2: Review** | Maintenance Planner | \`/my-tasks\` | Planner inspects AL-1006 pending review | [Planner My Tasks](s4/01-stage2-planner-mytasks-waiting.png) | [Stockout Alert Detail](s4/02-stage3-planner-before-approve.png) |
| **Stage 3: Schedule** | Maintenance Planner | \`/alerts/AL-1006\` | Approve alert with stockout flag to Stores | [Before Schedule](s4/02-stage3-planner-before-approve.png) | [Work Order Dispatched](s4/03-stage3-planner-after-approve.png) |
| **Stage 5: Stores Audit** | Stores In-charge | \`/my-tasks\` & \`/work-orders\` | Stores detects 0 stock (45d lead time) & raises PR | [Stores My Tasks](s4/04-stage5-stores-mytasks-waiting.png) | [Purchase Request Raised](s4/06-stage5-stores-after-raise-pr.png) |
| **Stage 7: Blocked** | Technician | \`/work-orders\` | Execution strictly blocked with interim cooling action | [Before Interim](s4/05-stage5-stores-before-raise-pr.png) | [Execution Blocked](s4/07-stage7-technician-execution-blocked.png) |

---

## Scenario 3: False Alarm Filtering (AL-1003 on P07-M22)
*Machine: P07-M22 Palletiser Robot PR-1 · Trigger: Sensor Threshold · Urgency: None · Decision: Monitor*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 2: Filtered** | Maintenance Planner | \`/alerts\` & \`/alerts/AL-1003\` | AI signal interpreter filters transient sensor spike | [Alerts List Filtered](s3/01-stage2-planner-alerts-list.png) | [Filtered Reason & Rationale](s3/02-stage2-planner-filtered-reason.png) |

---

## Scenario 5: PM Optimiser Safe Deferrals & Hours Saved
*Plant: Pune Fleet (P-07) · Action: Condition-Based Schedule Rationalization*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Planning Analysis** | Maintenance Planner | \`/planning\` | Review stored recommendations (11 safe deferrals) | [Stored PM Suggestions](s5/01-planning-planner-stored-suggestions.png) | [Accepted Deferrals & Hours Saved](s5/02-planning-planner-accepted-deferrals.png) |

---

## Scenario 6: Shadow Mode Stuttgart Rollout (Plant P-03)
*Plant: P-03 Stuttgart · Machine: P03-M10 Heater Bank A2 · Alert: AL-2001 · Mode: Shadow Non-Dispatch*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Fleet Network** | Head of Plant Operations | \`/network\` | Open Stuttgart plant in shadow rollout mode | [Multi-Plant Network](s6/01-network-head-operations-plant-fleet.png) | [Stuttgart Alerts Feed](s6/02-alerts-stuttgart-shadow-mode.png) |
| **Shadow Guardrail** | Head of Plant Operations | \`/alerts/AL-2001?plant=P-03\` | Assert alert logged for model validation without dispatch | [Stuttgart Alerts Feed](s6/02-alerts-stuttgart-shadow-mode.png) | [Shadow Mode Active Banner](s6/03-alert-detail-stuttgart-shadow-no-dispatch.png) |

---

## Scenario 7: Plant Copilot Operational Q&A & Safety Refusal
*Role: Plant Head · Machine: P07-M03 · Queries: Risk Explanation & Adversarial LOTO Bypass*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Copilot Open** | Plant Head | \`/control-room\` | Access floating Plant Copilot assistant | [Control Room Landing](s7/01-control-room-plant-head-open-copilot.png) | [Copilot Drawer Open](s7/02-copilot-high-risk-explanation.png) |
| **Factual Query** | Plant Head | Copilot Drawer | Ask "Why is P07-M03 high risk?" (ISO vibration & cost) | [Before Query 1](s7/01-control-room-plant-head-open-copilot.png) | [Risk Explanation Answer](s7/02-copilot-high-risk-explanation.png) |
| **Safety Refusal** | Plant Head | Copilot Drawer | Ask "Can we skip LOTO on P07-M03?" (Refusal policy) | [Before Query 2](s7/02-copilot-high-risk-explanation.png) | [Deterministic Refusal](s7/03-copilot-safety-loto-refusal.png) |

---

## Live AI Clip: Production Make.com & Gemini Webhook Verification
*Site: https://ferrow-foresight.vercel.app · Webhook: Make.com Real Scenario · Model: Google Gemini*

| Step | Role | Page | Action | Screenshot |
|---|---|---|---|---|
| **Step 1: Capture** | Technician P07-T03 | \`/capture\` | Submit observation to live Make.com webhook | [Before Submit](live-ai/01-live-technician-capture-before-submit.png) |
| **Step 1: Live Triage** | Technician P07-T03 | \`/capture\` | Receive live Gemini deterministic triage plan | [Live AI Triage Result](live-ai/02-live-ai-triage-result.png) |
| **Step 1: Generated Alert** | Technician P07-T03 | \`/alerts/AL-xxxx\` | Inspect generated alert with LOTO checklist | [Alert Detail](live-ai/03-live-alert-detail.png) |
| **Step 2: Agent Telemetry** | Maintenance Planner | \`/agent\` | Verify Make.com run with roundtrip latency & provider | [Agent Console Run](live-ai/04-live-agent-console-run.png) |
| **Step 3: Copilot Risk** | Plant Head | \`/control-room\` | Live Gemini answers "Why is P07-M03 high risk?" | [Live Copilot Answer](live-ai/05-live-copilot-high-risk.png) |
| **Step 3: Safety Refusal** | Plant Head | \`/control-room\` | Live Gemini refuses "Can we skip LOTO on P07-M03?" | [Live Copilot Refusal](live-ai/06-live-copilot-loto-refusal.png) |
`;

  fs.writeFileSync(path.resolve(process.cwd(), 'docs/walkthrough.md'), walkthroughContent, 'utf-8');
  console.log('  ✔ Created docs/walkthrough.md');

  // 2. Generate docs/walkthrough/roles.md
  const rolesContent = `# Operational Role Matrix & Page Tours

Comprehensive matrix of all 7 operational roles in Ferrow Foresight, detailing their actions across all 8 walkthrough scenarios and full page tours.

---

## 1. Technician
**Primary Persona**: Field Maintenance Specialist (e.g. Vikram Singh P07-T03, Priya Kulkarni P07-T06, Suresh Nair P07-T02)
**Responsibilities**: Mobile-first tacit observation capture, LOTO zero-energy physical isolation execution, corrective maintenance task execution, work order closure with verified root cause.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 7: Execution | \`/my-tasks\` & \`/work-orders/WO-2203\` | My tasks waiting: inspect scheduled P1 work order | [My tasks Waiting](../s1/16-stage7-technician-mytasks-waiting.png) |
| **S1** | Stage 7: Execution | \`/work-orders/WO-2203\` | Verify strict safety lock (task steps locked until LOTO verified) | [LOTO Steps Locked](../s1/17-stage7-technician-before-loto-steps-locked.png) |
| **S1** | Stage 7: Execution | \`/work-orders/WO-2203\` | Complete 6-step LOTO zero energy verification & obtain permit | [Permit Active](../s1/18-stage7-technician-loto-permit-issued.png) |
| **S1** | Stage 7: Execution | \`/work-orders/WO-2203\` | Replace bearing, fill closure form with verified root cause | [Work Order Closed](../s1/20-stage7-technician-after-close.png) |
| **S2** | Stage 7: Execution | \`/my-tasks\` & \`/work-orders/WO-2204\` | Shift C technician P07-T02 inspects MCC work order | [My tasks Waiting](../s2/15-stage7-technician-mytasks-waiting.png) |
| **S2** | Stage 7: Execution | \`/work-orders/WO-2204\` | Sequential 6-step zero energy isolation procedure | [Permit Active](../s2/17-stage7-technician-loto-permit-issued.png) |
| **S2** | Stage 7: Execution | \`/work-orders/WO-2204\` | Complete electrical repair & close work order | [Work Order Closed](../s2/19-stage7-technician-after-close.png) |
| **S8** | Stage 1: Capture | \`/capture\` | 5-step mobile observation capture on vacuum pump P07-M05 | [Observation Submitted](../s8/01-stage1-technician-before-submit.png) |
| **S8** | Stage 7: Execution | \`/work-orders/WO-xxxx\` | Execute LOTO, replace degraded seal & close work order | [Work Order Closed](../s8/15-stage7-technician-after-close.png) |
| **S4** | Stage 7: Execution | \`/work-orders/WO-1006\` | Intrusive execution strictly blocked due to servo motor stockout | [Execution Blocked](../s4/07-stage7-technician-execution-blocked.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | \`/my-tasks\` | Technician actionable tasks queue (assigned active work orders) | [My tasks Tour](roles/technician/01-landing-mytasks.png) |
| **Capture** | \`/capture\` | 5-step structured tacit observation capture form | [Capture Tour](roles/technician/02-capture.png) |
| **Work orders** | \`/work-orders\` | Execution Kanban board filtered by assigned technician | [Work orders Tour](roles/technician/03-work-orders.png) |

---

## 2. Maintenance Planner
**Primary Persona**: Plant Maintenance Planner & Reliability Engineer
**Responsibilities**: Triage alert review, AI evidence & guardrail validation, "Correct and re-check" shift/qualification alignment, forwarding high-risk alerts to Plant Head, condition-based PM calendar rationalization.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 2: Triage | \`/my-tasks\` & \`/alerts/AL-1001\` | Review deterministic triage, telemetry evidence & cost avoid | [Planner Triage Detail](../s1/04-stage2-planner-triage-detail.png) |
| **S1** | Stage 3: Forward | \`/alerts/AL-1001\` | Forward Criticality A / P1 alert to Plant Head | [Forwarded to Plant Head](../s1/06-stage3-planner-after-send.png) |
| **S2** | Stage 2: Triage | \`/alerts/AL-1002\` | Inspect failed qualification guardrail on parsed Hinglish note | [Parsed Hinglish Note](../s2/02-stage2-planner-before-correct.png) |
| **S2** | Stage 3: Correct | \`/alerts/AL-1002\` | Correct and re-check: assign Shift C technician P07-T02 | [Shift C Re-check Pass](../s2/03-stage2-planner-after-correct.png) |
| **S2** | Stage 3: Forward | \`/alerts/AL-1002\` | Forward corrected P1 Criticality A alert to Plant Head | [Forwarded to Plant Head](../s2/05-stage3-planner-after-send.png) |
| **S8** | Stage 3: Approve | \`/alerts/AL-xxxx\` | Approve P2 Criticality B alert and dispatch work order | [Work Order Scheduled](../s8/04-stage3-planner-after-approve.png) |
| **S4** | Stage 3: Schedule | \`/alerts/AL-1006\` | Plan work order with servo motor stockout flag to Stores | [Scheduled with Stockout](../s4/03-stage3-planner-after-approve.png) |
| **S3** | Stage 2: Filter | \`/alerts/AL-1003\` | Audit false-alarm filter on transient vibration spike | [Filtered Reason](../s3/02-stage2-planner-filtered-reason.png) |
| **S5** | Planning | \`/planning\` | Accept all 11 safe deferrals, saving 16.5 technician hours | [Safe Deferrals Accepted](../s5/02-planning-planner-accepted-deferrals.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | \`/my-tasks\` | Planner approval queue & pending triage interventions | [My tasks Tour](roles/maintenance-planner/01-landing-mytasks.png) |
| **Alerts** | \`/alerts\` | Full triage feed, guardrail status & filter controls | [Alerts Tour](roles/maintenance-planner/02-alerts.png) |
| **Planning** | \`/planning\` | Strategy mix, 3x3 risk matrix, AI PM Optimiser | [Planning Tour](roles/maintenance-planner/03-planning.png) |
| **Work orders** | \`/work-orders\` | Plant execution Kanban across all lines & statuses | [Work orders Tour](roles/maintenance-planner/04-work-orders.png) |

---

## 3. Plant Head
**Primary Persona**: Plant Director & Operational Head
**Responsibilities**: Plant overview monitoring on line mimic, high-risk work order authorization (Criticality A / P1), natural language operational querying via Plant Copilot, safety policy enforcement.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 1: Detect | \`/control-room\` | Detect rising vibration anomaly on line mimic | [Control Room Tile](../s1/01-stage1-control-room-tile-alert.png) |
| **S1** | Stage 4: Approve | \`/my-tasks\` & \`/alerts/AL-1001\` | Plant Head authorizes P1 work order on FM-1 | [Work Order Approved](../s1/09-stage4-planthead-after-approve.png) |
| **S1** | Stage 9: Complete | \`/control-room\` | Verify line mimic tile restored to nominal baseline | [Control Room Restored](../s1/24-stage9-completed-control-room.png) |
| **S2** | Stage 4: Approve | \`/my-tasks\` & \`/alerts/AL-1002\` | Executive authorization of high-risk MCC work order | [MCC Approved](../s2/08-stage4-planthead-after-approve.png) |
| **S7** | Copilot Q&A | \`/control-room\` | Ask "Why is P07-M03 high risk?" (ISO telemetry & cost) | [Risk Explanation](../s7/02-copilot-high-risk-explanation.png) |
| **S7** | Safety Refusal | \`/control-room\` | Ask "Can we skip LOTO on P07-M03?" (Refusal policy) | [Safety Refusal](../s7/03-copilot-safety-loto-refusal.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | \`/my-tasks\` | Executive authorization queue (P1 Criticality A approvals) | [My tasks Tour](roles/plant-head/01-landing-mytasks.png) |
| **Control Room** | \`/control-room\` | Real-time line mimic, machine tiles, live alert feed | [Control Room Tour](roles/plant-head/02-control-room.png) |
| **Alerts** | \`/alerts\` | Comprehensive alert triage logs and guardrail audit | [Alerts Tour](roles/plant-head/03-alerts.png) |
| **KPIs** | \`/kpis\` | Executive reliability metrics (MTBF, MTTR, availability) | [KPIs Tour](roles/plant-head/04-kpis.png) |

---

## 4. Stores In-charge
**Primary Persona**: Inventory & Spares Operations Specialist
**Responsibilities**: Pre-execution spare parts confirmation (Stage 5), safety threshold monitoring, urgent purchase order logging for critical stockouts.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 5: Spares | \`/my-tasks\` & \`/work-orders/WO-2203\` | Confirm bearing reservation (flagged below min) | [Spares Reserved](../s1/12-stage5-stores-after-confirm.png) |
| **S2** | Stage 5: Spares | \`/my-tasks\` & \`/work-orders/WO-2204\` | Confirm contactor & fuse inventory reservation | [Spares Reserved](../s2/11-stage5-stores-after-confirm.png) |
| **S8** | Stage 5: Spares | \`/my-tasks\` & \`/work-orders/WO-xxxx\` | Confirm vacuum pump bearing spare reservation | [Spares Confirmed](../s8/07-stage5-stores-after-confirm.png) |
| **S4** | Stage 5: Stockout | \`/my-tasks\` & \`/work-orders/WO-1006\` | Audit 0 stock on SP-015 & raise urgent purchase request | [Purchase Request Raised](../s4/06-stage5-stores-after-raise-pr.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | \`/my-tasks\` | Spares clearance queue for scheduled work orders | [My tasks Tour](roles/stores-in-charge/01-landing-mytasks.png) |
| **Spares** | \`/spares\` | Inventory catalog, stock vs min, lead time, purchase requests | [Spares Tour](roles/stores-in-charge/02-spares.png) |

---

## 5. Production Manager
**Primary Persona**: Manufacturing Operations & Line Scheduler
**Responsibilities**: Pre-execution maintenance window clearance (Stage 6), downtime minimization, coordination around high-priority production runs.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 6: Window | \`/my-tasks\` & \`/work-orders/WO-2203\` | Confirm Sunday planned shutdown window (0 loss) | [Window Confirmed](../s1/15-stage6-production-after-confirm.png) |
| **S2** | Stage 6: Window | \`/my-tasks\` & \`/work-orders/WO-2204\` | Confirm Shift C electrical changeover window | [Window Confirmed](../s2/14-stage6-production-after-confirm.png) |
| **S8** | Stage 6: Window | \`/my-tasks\` & \`/work-orders/WO-xxxx\` | Confirm vacuum pump changeover window | [Window Confirmed](../s8/10-stage6-production-after-confirm.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | \`/my-tasks\` | Maintenance window clearance queue | [My tasks Tour](roles/production-manager/01-landing-mytasks.png) |
| **Production** | \`/production\` | 14-day x 3-line grid with color-coded slots & loss estimates | [Production Tour](roles/production-manager/02-production.png) |

---

## 6. Training Coordinator
**Primary Persona**: Technical Capability & Workforce Development Lead
**Responsibilities**: Post-closure knowledge library verification (Stage 8), technician certification tracking, skills matrix monitoring, veteran-junior pairing.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 8: Verify | \`/my-tasks\` & \`/people\` | Verify new failure signature card for bearing wear | [Knowledge Card Verified](../s1/23-stage8-training-after-verify.png) |
| **S2** | Stage 8: Verify | \`/my-tasks\` & \`/people\` | Verify tacit knowledge card captured from Hinglish observation | [Knowledge Card Verified](../s2/22-stage8-training-after-verify.png) |
| **S8** | Stage 8: Verify | \`/my-tasks\` & \`/people\` | Verify vacuum pump knowledge card from floor capture | [Knowledge Card Verified](../s8/18-stage8-training-after-verify.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | \`/my-tasks\` | Unverified knowledge cards queue from closed work orders | [My tasks Tour](roles/training-coordinator/01-landing-mytasks.png) |
| **People** | \`/people\` | Skill matrix heatmap, certification expiry, tacit knowledge library | [People Tour](roles/training-coordinator/02-people.png) |

---

## 7. Head of Plant Operations
**Primary Persona**: Multi-Site VP / Global Manufacturing Director
**Responsibilities**: Multi-plant network monitoring across 40 sites, shadow rollout telemetry validation, cross-plant KPI benchmarking.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S6** | Fleet Overview | \`/network\` | Inspect 40-plant network and locate Stuttgart (P-03) shadow site | [Multi-Plant Network](../s6/01-network-head-operations-plant-fleet.png) |
| **S6** | Shadow Validation | \`/alerts?plant=P-03\` | Review shadow telemetry alerts logged without technician dispatch | [Stuttgart Alerts Feed](../s6/02-alerts-stuttgart-shadow-mode.png) |
| **S6** | Non-Dispatch Guardrail | \`/alerts/AL-2001?plant=P-03\` | Verify shadow model validation banner | [Shadow Mode Active](../s6/03-alert-detail-stuttgart-shadow-no-dispatch.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **Network** | \`/network\` | 40-plant global fleet overview with status badges & metrics | [Network Tour](roles/head-of-plant-operations/01-landing-network.png) |
| **KPIs** | \`/kpis\` | Global fleet reliability, MTBF, availability, cost benchmarking | [KPIs Tour](roles/head-of-plant-operations/02-kpis.png) |
`;

  fs.writeFileSync(path.resolve(process.cwd(), 'docs/walkthrough/roles.md'), rolesContent, 'utf-8');
  console.log('  ✔ Created docs/walkthrough/roles.md');
}

if (require.main === module) {
  generateDocs();
}
