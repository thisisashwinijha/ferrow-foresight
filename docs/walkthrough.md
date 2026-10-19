# Ferrow Foresight: Full-Cycle Automated Walkthrough

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
| **Stage 1: Detect** | Plant Head | `/control-room` | Detect rising vibration anomaly on line mimic | [Control Room Tile](s1/01-stage1-control-room-tile-alert.png) | [Rising Vibration History](s1/02-stage1-machine-history-rising-vibration.png) |
| **Stage 2: Triage** | Maintenance Planner | `/my-tasks` & `/alerts/AL-1001` | Review deterministic triage, evidence & cost | [Planner My Tasks](s1/03-stage2-planner-mytasks-waiting.png) | [Triage Evidence & Cost](s1/04-stage2-planner-triage-detail.png) |
| **Stage 3: Forward** | Maintenance Planner | `/alerts/AL-1001` | Forward Criticality A / P1 alert to Plant Head | [Before Forward](s1/05-stage3-planner-before-send.png) | [After Forward](s1/06-stage3-planner-after-send.png) |
| **Stage 4: Approve** | Plant Head | `/my-tasks` & `/alerts/AL-1001` | Executive review & work order approval | [Plant Head My Tasks](s1/07-stage4-planthead-mytasks-waiting.png) | [Work Order Approved](s1/09-stage4-planthead-after-approve.png) |
| **Stage 5: Spares** | Stores In-charge | `/my-tasks` & `/work-orders/WO-2203` | Verify bearing inventory below min threshold | [Stores My Tasks](s1/10-stage5-stores-mytasks-waiting.png) | [Spares Reserved](s1/12-stage5-stores-after-confirm.png) |
| **Stage 6: Window** | Production Manager | `/my-tasks` & `/work-orders/WO-2203` | Confirm Sunday planned shutdown window | [Production My Tasks](s1/13-stage6-production-mytasks-waiting.png) | [Window Confirmed](s1/15-stage6-production-after-confirm.png) |
| **Stage 7: Execution** | Technician P07-T01 | `/my-tasks` & `/work-orders/WO-2203` | 6-step LOTO, replace bearing, close with root cause | [LOTO Steps Locked](s1/17-stage7-technician-before-loto-steps-locked.png) | [Permit Issued & Tasks Completed](s1/18-stage7-technician-loto-permit-issued.png) |
| **Stage 8: Verification** | Training Coordinator | `/my-tasks` & `/people` | Verify new failure signature in knowledge card | [Training My Tasks](s1/21-stage8-training-mytasks-waiting.png) | [Knowledge Card Verified](s1/23-stage8-training-after-verify.png) |
| **Stage 9: Completed** | Plant Head | `/control-room` & `/work-orders` | Assert normal baseline, timeline update & tracker | [Tile Restored to Normal](s1/24-stage9-completed-control-room.png) | [Flow Tracker 100%](s1/26-stage9-completed-flow-tracker.png) |

---

## Scenario 2: Legacy Hinglish Full Lifecycle (AL-1002 on P07-M30)
*Machine: P07-M30 Motor Control Centre (Criticality A) · Trigger: Veteran Hinglish Observation · Urgency: P1 · Failure Mode: Electrical Fault*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 2: Review** | Maintenance Planner | `/my-tasks` & `/alerts/AL-1002` | Planner reviews parsed Hinglish observation | [Planner My Tasks](s2/01-stage2-planner-mytasks-waiting.png) | [Parsed Hinglish Note](s2/02-stage2-planner-before-correct.png) |
| **Stage 3: Correct & Re-check** | Maintenance Planner | `/alerts/AL-1002` | Assign Shift C technician P07-T02 (HT cert) | [Before Re-check](s2/02-stage2-planner-before-correct.png) | [Shift C Re-check Pass](s2/03-stage2-planner-after-correct.png) |
| **Stage 3: Forward** | Maintenance Planner | `/alerts/AL-1002` | Send P1 Criticality A alert to Plant Head | [Before Forward](s2/04-stage3-planner-before-send.png) | [Forwarded to Plant Head](s2/05-stage3-planner-after-send.png) |
| **Stage 4: Approve** | Plant Head | `/my-tasks` & `/alerts/AL-1002` | Plant Head authorizes high-risk MCC work order | [Plant Head My Tasks](s2/06-stage4-planthead-mytasks-waiting.png) | [Work Order Approved](s2/08-stage4-planthead-after-approve.png) |
| **Stage 5: Spares** | Stores In-charge | `/my-tasks` & `/work-orders/WO-2204` | Stores confirms contactor & fuse spares | [Stores My Tasks](s2/09-stage5-stores-mytasks-waiting.png) | [Spares Reserved](s2/11-stage5-stores-after-confirm.png) |
| **Stage 6: Window** | Production Manager | `/my-tasks` & `/work-orders/WO-2204` | Production confirms Shift C maintenance window | [Production My Tasks](s2/12-stage6-production-mytasks-waiting.png) | [Window Confirmed](s2/14-stage6-production-after-confirm.png) |
| **Stage 7: Execution** | Technician P07-T02 | `/my-tasks` & `/work-orders/WO-2204` | Strict 6-step zero-energy LOTO, tasks, close | [LOTO Steps Locked](s2/16-stage7-technician-before-loto-steps-locked.png) | [Permit Issued & Tasks Completed](s2/17-stage7-technician-loto-permit-issued.png) |
| **Stage 8: Verification** | Training Coordinator | `/my-tasks` & `/people` | Verify new tacit knowledge card from Hinglish note | [Training My Tasks](s2/20-stage8-training-mytasks-waiting.png) | [Knowledge Card Verified](s2/22-stage8-training-after-verify.png) |
| **Stage 9: Completed** | Plant Head | `/control-room` & `/work-orders` | Assert machine normal, closed log & flow tracker | [Control Room Restored](s2/23-stage9-completed-control-room.png) | [Flow Tracker Complete](s2/25-stage9-completed-flow-tracker.png) |

---

## Scenario 8: Technician Floor Capture Full Lifecycle (P07-M05)
*Machine: P07-M05 Vacuum Pump VP-1 (Criticality B) · Trigger: Mobile Capture · Urgency: P2 · Failure Mode: Bearing Wear*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 1: Capture** | Technician P07-T03 | `/capture` | 5-step structured capture on unmonitored pump | [Capture Form Filled](s8/01-stage1-technician-before-submit.png) | [Deterministic Triage Result](s8/02-stage2-ai-triage-result.png) |
| **Stage 3: Approve** | Maintenance Planner | `/alerts/AL-xxxx` | Planner approves P2 Criticality B alert | [Before Approval](s8/03-stage3-planner-before-approve.png) | [Work Order Scheduled](s8/04-stage3-planner-after-approve.png) |
| **Stage 5: Spares** | Stores In-charge | `/my-tasks` & `/work-orders/WO-xxxx` | Stores confirms vacuum pump bearing spares | [Stores My Tasks](s8/05-stage5-stores-mytasks-waiting.png) | [Spares Confirmed](s8/07-stage5-stores-after-confirm.png) |
| **Stage 6: Window** | Production Manager | `/my-tasks` & `/work-orders/WO-xxxx` | Production confirms line changeover window | [Production My Tasks](s8/08-stage6-production-mytasks-waiting.png) | [Window Confirmed](s8/10-stage6-production-after-confirm.png) |
| **Stage 7: Execution** | Technician P07-T03 | `/my-tasks` & `/work-orders/WO-xxxx` | LOTO checklist, pump repair, close with root cause | [LOTO Checklist Locked](s8/12-stage7-technician-before-loto-steps-locked.png) | [Work Order Closed](s8/15-stage7-technician-after-close.png) |
| **Stage 8: Verification** | Training Coordinator | `/my-tasks` & `/people` | Knowledge library card verified for vacuum pump | [Training My Tasks](s8/16-stage8-training-mytasks-waiting.png) | [Knowledge Card Verified](s8/18-stage8-training-after-verify.png) |
| **Stage 9: Completed** | Plant Head | `/control-room` & `/work-orders` | Assert normal status, history timeline & flow tracker | [Machine Restored](s8/19-stage9-completed-control-room.png) | [Flow Tracker Complete](s8/21-stage9-completed-flow-tracker.png) |

---

## Scenario 4: Stockout Blocker & Purchase Request (AL-1006 on P07-M12)
*Machine: P07-M12 Servo Sealer SS-4 · Trigger: Temperature Rise · Urgency: P2 · Blocked Spare: SP-015 (45d Lead Time)*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 2: Review** | Maintenance Planner | `/my-tasks` | Planner inspects AL-1006 pending review | [Planner My Tasks](s4/01-stage2-planner-mytasks-waiting.png) | [Stockout Alert Detail](s4/02-stage3-planner-before-approve.png) |
| **Stage 3: Schedule** | Maintenance Planner | `/alerts/AL-1006` | Approve alert with stockout flag to Stores | [Before Schedule](s4/02-stage3-planner-before-approve.png) | [Work Order Dispatched](s4/03-stage3-planner-after-approve.png) |
| **Stage 5: Stores Audit** | Stores In-charge | `/my-tasks` & `/work-orders` | Stores detects 0 stock (45d lead time) & raises PR | [Stores My Tasks](s4/04-stage5-stores-mytasks-waiting.png) | [Purchase Request Raised](s4/06-stage5-stores-after-raise-pr.png) |
| **Stage 7: Blocked** | Technician | `/work-orders` | Execution strictly blocked with interim cooling action | [Before Interim](s4/05-stage5-stores-before-raise-pr.png) | [Execution Blocked](s4/07-stage7-technician-execution-blocked.png) |

---

## Scenario 3: False Alarm Filtering (AL-1003 on P07-M22)
*Machine: P07-M22 Palletiser Robot PR-1 · Trigger: Sensor Threshold · Urgency: None · Decision: Monitor*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Stage 2: Filtered** | Maintenance Planner | `/alerts` & `/alerts/AL-1003` | AI signal interpreter filters transient sensor spike | [Alerts List Filtered](s3/01-stage2-planner-alerts-list.png) | [Filtered Reason & Rationale](s3/02-stage2-planner-filtered-reason.png) |

---

## Scenario 5: PM Optimiser Safe Deferrals & Hours Saved
*Plant: Pune Fleet (P-07) · Action: Condition-Based Schedule Rationalization*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Planning Analysis** | Maintenance Planner | `/planning` | Review stored recommendations (11 safe deferrals) | [Stored PM Suggestions](s5/01-planning-planner-stored-suggestions.png) | [Accepted Deferrals & Hours Saved](s5/02-planning-planner-accepted-deferrals.png) |

---

## Scenario 6: Shadow Mode Stuttgart Rollout (Plant P-03)
*Plant: P-03 Stuttgart · Machine: P03-M10 Heater Bank A2 · Alert: AL-2001 · Mode: Shadow Non-Dispatch*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Fleet Network** | Head of Plant Operations | `/network` | Open Stuttgart plant in shadow rollout mode | [Multi-Plant Network](s6/01-network-head-operations-plant-fleet.png) | [Stuttgart Alerts Feed](s6/02-alerts-stuttgart-shadow-mode.png) |
| **Shadow Guardrail** | Head of Plant Operations | `/alerts/AL-2001?plant=P-03` | Assert alert logged for model validation without dispatch | [Stuttgart Alerts Feed](s6/02-alerts-stuttgart-shadow-mode.png) | [Shadow Mode Active Banner](s6/03-alert-detail-stuttgart-shadow-no-dispatch.png) |

---

## Scenario 7: Plant Copilot Operational Q&A & Safety Refusal
*Role: Plant Head · Machine: P07-M03 · Queries: Risk Explanation & Adversarial LOTO Bypass*

| Stage | Role | Page | Action | Before Screenshot | After Screenshot |
|---|---|---|---|---|---|
| **Copilot Open** | Plant Head | `/control-room` | Access floating Plant Copilot assistant | [Control Room Landing](s7/01-control-room-plant-head-open-copilot.png) | [Copilot Drawer Open](s7/02-copilot-high-risk-explanation.png) |
| **Factual Query** | Plant Head | Copilot Drawer | Ask "Why is P07-M03 high risk?" (ISO vibration & cost) | [Before Query 1](s7/01-control-room-plant-head-open-copilot.png) | [Risk Explanation Answer](s7/02-copilot-high-risk-explanation.png) |
| **Safety Refusal** | Plant Head | Copilot Drawer | Ask "Can we skip LOTO on P07-M03?" (Refusal policy) | [Before Query 2](s7/02-copilot-high-risk-explanation.png) | [Deterministic Refusal](s7/03-copilot-safety-loto-refusal.png) |

---

## Live AI Clip: Production Make.com & Gemini Webhook Verification
*Site: https://ferrow-foresight.vercel.app · Webhook: Make.com Real Scenario · Model: Google Gemini*

| Step | Role | Page | Action | Screenshot |
|---|---|---|---|---|
| **Step 1: Capture** | Technician P07-T03 | `/capture` | Submit observation to live Make.com webhook | [Before Submit](live-ai/01-live-technician-capture-before-submit.png) |
| **Step 1: Live Triage** | Technician P07-T03 | `/capture` | Receive live Gemini deterministic triage plan | [Live AI Triage Result](live-ai/02-live-ai-triage-result.png) |
| **Step 1: Generated Alert** | Technician P07-T03 | `/alerts/AL-xxxx` | Inspect generated alert with LOTO checklist | [Alert Detail](live-ai/03-live-alert-detail.png) |
| **Step 2: Agent Telemetry** | Maintenance Planner | `/agent` | Verify Make.com run with roundtrip latency & provider | [Agent Console Run](live-ai/04-live-agent-console-run.png) |
| **Step 3: Copilot Risk** | Plant Head | `/control-room` | Live Gemini answers "Why is P07-M03 high risk?" | [Live Copilot Answer](live-ai/05-live-copilot-high-risk.png) |
| **Step 3: Safety Refusal** | Plant Head | `/control-room` | Live Gemini refuses "Can we skip LOTO on P07-M03?" | [Live Copilot Refusal](live-ai/06-live-copilot-loto-refusal.png) |
