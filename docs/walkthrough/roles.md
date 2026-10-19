# Operational Role Matrix & Page Tours

Comprehensive matrix of all 7 operational roles in Ferrow Foresight, detailing their actions across all 8 walkthrough scenarios and full page tours.

---

## 1. Technician
**Primary Persona**: Field Maintenance Specialist (e.g. Vikram Singh P07-T03, Priya Kulkarni P07-T06, Suresh Nair P07-T02)
**Responsibilities**: Mobile-first tacit observation capture, LOTO zero-energy physical isolation execution, corrective maintenance task execution, work order closure with verified root cause.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 7: Execution | `/my-tasks` & `/work-orders/WO-2203` | My tasks waiting: inspect scheduled P1 work order | [My tasks Waiting](../s1/16-stage7-technician-mytasks-waiting.png) |
| **S1** | Stage 7: Execution | `/work-orders/WO-2203` | Verify strict safety lock (task steps locked until LOTO verified) | [LOTO Steps Locked](../s1/17-stage7-technician-before-loto-steps-locked.png) |
| **S1** | Stage 7: Execution | `/work-orders/WO-2203` | Complete 6-step LOTO zero energy verification & obtain permit | [Permit Active](../s1/18-stage7-technician-loto-permit-issued.png) |
| **S1** | Stage 7: Execution | `/work-orders/WO-2203` | Replace bearing, fill closure form with verified root cause | [Work Order Closed](../s1/20-stage7-technician-after-close.png) |
| **S2** | Stage 7: Execution | `/my-tasks` & `/work-orders/WO-2204` | Shift C technician P07-T02 inspects MCC work order | [My tasks Waiting](../s2/15-stage7-technician-mytasks-waiting.png) |
| **S2** | Stage 7: Execution | `/work-orders/WO-2204` | Sequential 6-step zero energy isolation procedure | [Permit Active](../s2/17-stage7-technician-loto-permit-issued.png) |
| **S2** | Stage 7: Execution | `/work-orders/WO-2204` | Complete electrical repair & close work order | [Work Order Closed](../s2/19-stage7-technician-after-close.png) |
| **S8** | Stage 1: Capture | `/capture` | 5-step mobile observation capture on vacuum pump P07-M05 | [Observation Submitted](../s8/01-stage1-technician-before-submit.png) |
| **S8** | Stage 7: Execution | `/work-orders/WO-xxxx` | Execute LOTO, replace degraded seal & close work order | [Work Order Closed](../s8/15-stage7-technician-after-close.png) |
| **S4** | Stage 7: Execution | `/work-orders/WO-1006` | Intrusive execution strictly blocked due to servo motor stockout | [Execution Blocked](../s4/07-stage7-technician-execution-blocked.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | `/my-tasks` | Technician actionable tasks queue (assigned active work orders) | [My tasks Tour](roles/technician/01-landing-mytasks.png) |
| **Capture** | `/capture` | 5-step structured tacit observation capture form | [Capture Tour](roles/technician/02-capture.png) |
| **Work orders** | `/work-orders` | Execution Kanban board filtered by assigned technician | [Work orders Tour](roles/technician/03-work-orders.png) |

---

## 2. Maintenance Planner
**Primary Persona**: Plant Maintenance Planner & Reliability Engineer
**Responsibilities**: Triage alert review, AI evidence & guardrail validation, "Correct and re-check" shift/qualification alignment, forwarding high-risk alerts to Plant Head, condition-based PM calendar rationalization.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 2: Triage | `/my-tasks` & `/alerts/AL-1001` | Review deterministic triage, telemetry evidence & cost avoid | [Planner Triage Detail](../s1/04-stage2-planner-triage-detail.png) |
| **S1** | Stage 3: Forward | `/alerts/AL-1001` | Forward Criticality A / P1 alert to Plant Head | [Forwarded to Plant Head](../s1/06-stage3-planner-after-send.png) |
| **S2** | Stage 2: Triage | `/alerts/AL-1002` | Inspect failed qualification guardrail on parsed Hinglish note | [Parsed Hinglish Note](../s2/02-stage2-planner-before-correct.png) |
| **S2** | Stage 3: Correct | `/alerts/AL-1002` | Correct and re-check: assign Shift C technician P07-T02 | [Shift C Re-check Pass](../s2/03-stage2-planner-after-correct.png) |
| **S2** | Stage 3: Forward | `/alerts/AL-1002` | Forward corrected P1 Criticality A alert to Plant Head | [Forwarded to Plant Head](../s2/05-stage3-planner-after-send.png) |
| **S8** | Stage 3: Approve | `/alerts/AL-xxxx` | Approve P2 Criticality B alert and dispatch work order | [Work Order Scheduled](../s8/04-stage3-planner-after-approve.png) |
| **S4** | Stage 3: Schedule | `/alerts/AL-1006` | Plan work order with servo motor stockout flag to Stores | [Scheduled with Stockout](../s4/03-stage3-planner-after-approve.png) |
| **S3** | Stage 2: Filter | `/alerts/AL-1003` | Audit false-alarm filter on transient vibration spike | [Filtered Reason](../s3/02-stage2-planner-filtered-reason.png) |
| **S5** | Planning | `/planning` | Accept all 11 safe deferrals, saving 16.5 technician hours | [Safe Deferrals Accepted](../s5/02-planning-planner-accepted-deferrals.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | `/my-tasks` | Planner approval queue & pending triage interventions | [My tasks Tour](roles/maintenance-planner/01-landing-mytasks.png) |
| **Alerts** | `/alerts` | Full triage feed, guardrail status & filter controls | [Alerts Tour](roles/maintenance-planner/02-alerts.png) |
| **Planning** | `/planning` | Strategy mix, 3x3 risk matrix, AI PM Optimiser | [Planning Tour](roles/maintenance-planner/03-planning.png) |
| **Work orders** | `/work-orders` | Plant execution Kanban across all lines & statuses | [Work orders Tour](roles/maintenance-planner/04-work-orders.png) |

---

## 3. Plant Head
**Primary Persona**: Plant Director & Operational Head
**Responsibilities**: Plant overview monitoring on line mimic, high-risk work order authorization (Criticality A / P1), natural language operational querying via Plant Copilot, safety policy enforcement.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 1: Detect | `/control-room` | Detect rising vibration anomaly on line mimic | [Control Room Tile](../s1/01-stage1-control-room-tile-alert.png) |
| **S1** | Stage 4: Approve | `/my-tasks` & `/alerts/AL-1001` | Plant Head authorizes P1 work order on FM-1 | [Work Order Approved](../s1/09-stage4-planthead-after-approve.png) |
| **S1** | Stage 9: Complete | `/control-room` | Verify line mimic tile restored to nominal baseline | [Control Room Restored](../s1/24-stage9-completed-control-room.png) |
| **S2** | Stage 4: Approve | `/my-tasks` & `/alerts/AL-1002` | Executive authorization of high-risk MCC work order | [MCC Approved](../s2/08-stage4-planthead-after-approve.png) |
| **S7** | Copilot Q&A | `/control-room` | Ask "Why is P07-M03 high risk?" (ISO telemetry & cost) | [Risk Explanation](../s7/02-copilot-high-risk-explanation.png) |
| **S7** | Safety Refusal | `/control-room` | Ask "Can we skip LOTO on P07-M03?" (Refusal policy) | [Safety Refusal](../s7/03-copilot-safety-loto-refusal.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | `/my-tasks` | Executive authorization queue (P1 Criticality A approvals) | [My tasks Tour](roles/plant-head/01-landing-mytasks.png) |
| **Control Room** | `/control-room` | Real-time line mimic, machine tiles, live alert feed | [Control Room Tour](roles/plant-head/02-control-room.png) |
| **Alerts** | `/alerts` | Comprehensive alert triage logs and guardrail audit | [Alerts Tour](roles/plant-head/03-alerts.png) |
| **KPIs** | `/kpis` | Executive reliability metrics (MTBF, MTTR, availability) | [KPIs Tour](roles/plant-head/04-kpis.png) |

---

## 4. Stores In-charge
**Primary Persona**: Inventory & Spares Operations Specialist
**Responsibilities**: Pre-execution spare parts confirmation (Stage 5), safety threshold monitoring, urgent purchase order logging for critical stockouts.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 5: Spares | `/my-tasks` & `/work-orders/WO-2203` | Confirm bearing reservation (flagged below min) | [Spares Reserved](../s1/12-stage5-stores-after-confirm.png) |
| **S2** | Stage 5: Spares | `/my-tasks` & `/work-orders/WO-2204` | Confirm contactor & fuse inventory reservation | [Spares Reserved](../s2/11-stage5-stores-after-confirm.png) |
| **S8** | Stage 5: Spares | `/my-tasks` & `/work-orders/WO-xxxx` | Confirm vacuum pump bearing spare reservation | [Spares Confirmed](../s8/07-stage5-stores-after-confirm.png) |
| **S4** | Stage 5: Stockout | `/my-tasks` & `/work-orders/WO-1006` | Audit 0 stock on SP-015 & raise urgent purchase request | [Purchase Request Raised](../s4/06-stage5-stores-after-raise-pr.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | `/my-tasks` | Spares clearance queue for scheduled work orders | [My tasks Tour](roles/stores-in-charge/01-landing-mytasks.png) |
| **Spares** | `/spares` | Inventory catalog, stock vs min, lead time, purchase requests | [Spares Tour](roles/stores-in-charge/02-spares.png) |

---

## 5. Production Manager
**Primary Persona**: Manufacturing Operations & Line Scheduler
**Responsibilities**: Pre-execution maintenance window clearance (Stage 6), downtime minimization, coordination around high-priority production runs.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 6: Window | `/my-tasks` & `/work-orders/WO-2203` | Confirm Sunday planned shutdown window (0 loss) | [Window Confirmed](../s1/15-stage6-production-after-confirm.png) |
| **S2** | Stage 6: Window | `/my-tasks` & `/work-orders/WO-2204` | Confirm Shift C electrical changeover window | [Window Confirmed](../s2/14-stage6-production-after-confirm.png) |
| **S8** | Stage 6: Window | `/my-tasks` & `/work-orders/WO-xxxx` | Confirm vacuum pump changeover window | [Window Confirmed](../s8/10-stage6-production-after-confirm.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | `/my-tasks` | Maintenance window clearance queue | [My tasks Tour](roles/production-manager/01-landing-mytasks.png) |
| **Production** | `/production` | 14-day x 3-line grid with color-coded slots & loss estimates | [Production Tour](roles/production-manager/02-production.png) |

---

## 6. Training Coordinator
**Primary Persona**: Technical Capability & Workforce Development Lead
**Responsibilities**: Post-closure knowledge library verification (Stage 8), technician certification tracking, skills matrix monitoring, veteran-junior pairing.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S1** | Stage 8: Verify | `/my-tasks` & `/people` | Verify new failure signature card for bearing wear | [Knowledge Card Verified](../s1/23-stage8-training-after-verify.png) |
| **S2** | Stage 8: Verify | `/my-tasks` & `/people` | Verify tacit knowledge card captured from Hinglish observation | [Knowledge Card Verified](../s2/22-stage8-training-after-verify.png) |
| **S8** | Stage 8: Verify | `/my-tasks` & `/people` | Verify vacuum pump knowledge card from floor capture | [Knowledge Card Verified](../s8/18-stage8-training-after-verify.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **My tasks** | `/my-tasks` | Unverified knowledge cards queue from closed work orders | [My tasks Tour](roles/training-coordinator/01-landing-mytasks.png) |
| **People** | `/people` | Skill matrix heatmap, certification expiry, tacit knowledge library | [People Tour](roles/training-coordinator/02-people.png) |

---

## 7. Head of Plant Operations
**Primary Persona**: Multi-Site VP / Global Manufacturing Director
**Responsibilities**: Multi-plant network monitoring across 40 sites, shadow rollout telemetry validation, cross-plant KPI benchmarking.

### Actions Across Scenarios
| Scenario | Stage | Page | Action | Screenshot |
|---|---|---|---|---|
| **S6** | Fleet Overview | `/network` | Inspect 40-plant network and locate Stuttgart (P-03) shadow site | [Multi-Plant Network](../s6/01-network-head-operations-plant-fleet.png) |
| **S6** | Shadow Validation | `/alerts?plant=P-03` | Review shadow telemetry alerts logged without technician dispatch | [Stuttgart Alerts Feed](../s6/02-alerts-stuttgart-shadow-mode.png) |
| **S6** | Non-Dispatch Guardrail | `/alerts/AL-2001?plant=P-03` | Verify shadow model validation banner | [Shadow Mode Active](../s6/03-alert-detail-stuttgart-shadow-no-dispatch.png) |

### Page Tour
| Page | Route | Description | Screenshot |
|---|---|---|---|
| **Network** | `/network` | 40-plant global fleet overview with status badges & metrics | [Network Tour](roles/head-of-plant-operations/01-landing-network.png) |
| **KPIs** | `/kpis` | Global fleet reliability, MTBF, availability, cost benchmarking | [KPIs Tour](roles/head-of-plant-operations/02-kpis.png) |
