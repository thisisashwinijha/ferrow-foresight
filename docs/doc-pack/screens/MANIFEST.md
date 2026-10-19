# Screenshot Catalog & Manifest

This manifest documents the curated collection of 22 screenshots selected and captured for Ferrow Foresight product documents: **Product Requirements Document (PRD)**, **Functional Specification Document (FSD)**, **Functional Testing (FT)**, and the **System Explanation Document**.

All screenshots were captured in high-contrast light mode at 1440x900 baseline resolution, with the demo state reset, cached AI responses enabled, no video caption overlays, and resampled to a standardized **1400 px width**.

---

## Screenshot Manifest Table

| # | File Name | Document | Target Section | One-Line Caption (What the Reader Should Notice) | Scenario / Role / Stage |
|---|---|---|---|---|---|
| **01** | `01-network-overview.png` | **PRD** | 1. Fleet Operations & Rollout | Notice the multi-plant rollout progress bar (1 pilot live, 3 in shadow mode, 36 not onboarded) and top-level network metrics ($720k downtime cost across ~12,000 machines). | Fleet Network / Head of Plant Operations / Global Fleet |
| **02** | `02-control-room.png` | **PRD** | 2. Plant Control Room & Triage | Notice the prominent "Needs your attention" card strip highlighting actionable P1 alerts above the plant line mimic, establishing immediate supervisory focus. | Control Room / Plant Head / Plant Operations |
| **03** | `03-alert-detail-cost.png` | **PRD** | 3. Economic Impact & ROI Analysis | Notice the supporting evidence list paired with the financial ROI model ($144,000 unplanned downtime risk vs $1,450 intervention cost = +$142,550 net savings). | S1 / Maintenance Planner / Stage 2 (Triage Detail) |
| **04** | `04-capture-midflow.png` | **PRD** | 4. Frontline Observation Wizard | Notice the 5-step technician capture flow midway through logging, showing technician profile, machine selector, and multi-modal sensory symptom tags (vibration, heat, sound). | S8 / Technician (P07-T03) / Stage 1 (Capture Wizard) |
| **05** | `05-live-ai-triage.png` | **PRD / FT** | 5. Production Live AI Triage | Notice the instant AI triage confirmation returned by the live Make.com/Gemini webhook, identifying bearing wear with 88% confidence and recommending immediate LOTO. | Live Webhook / Technician / Stage 2 (AI Triage Result) |
| **06** | `06-flow-tracker-stage3.png` | **FSD** | 1. 9-Stage Lifecycle Flow Tracker | Notice the 9-stage Flow Tracker header at Stage 3 showing Detect and Triage green-checked, Planner review active, and an explicit "Waiting for: Maintenance Planner" badge. | S1 / Maintenance Planner / Stage 3 (Planner Review) |
| **07** | `07-planner-send-to-plant-head.png` | **FSD** | 2. Dual Authorization Enforcement | Notice that when viewed by a non-planner role, "Send to Plant Head" is disabled with an inline explanation: "Only Maintenance Planner can forward Criticality A alerts to Plant Head." | S1 / Plant Head / Stage 3 (Authorization Gate) |
| **08** | `08-guardrail-verification.png` | **FSD** | 3. Automated Guardrail Verification | Notice the comprehensive 8-check guardrail verification panel showing pass status for schema, evidence IDs, confidence, LOTO enforcement, certs, shift, and spares. | S1 / Maintenance Planner / Stage 3 (Guardrail Panel) |
| **09** | `09-correct-and-recheck-s2.png` | **FSD** | 4. Correct & Re-Check Override | Notice the Planner override section displaying the qualifying technician dropdown, resolving a certification failure by assigning certified Shift C HT Electrician Suresh Nair. | S2 / Maintenance Planner / Stage 3 (Correct & Re-Check) |
| **10** | `10-stores-confirming-spares.png` | **FSD** | 5. Spares Reservation Clearance | Notice the Pre-Execution Clearance section where Stores In-charge confirms the spherical roller bearing reservation, alerting that current stock (1) is below safety buffer (2). | S1 / Stores In-charge / Stage 5 (Spares Readiness) |
| **11** | `11-production-timeline-confirm-window.png` | **FSD** | 6. Production Maintenance Slot | Notice the Stage 6 Pre-Execution Clearance card displaying the booked Sunday planned shutdown slot with the Production Manager "Confirm Window" action button. | S1 / Production Manager / Stage 6 (Window Clearance) |
| **12** | `12-work-order-loto-locked.png` | **FSD** | 7. Zero-Energy Execution Gating | Notice that Phase 2 maintenance execution steps are strictly locked with a padlock icon until all 6 Phase 1 LOTO zero-energy safety steps are verified. | S1 / Technician (P07-T01) / Stage 7 (Pre-LOTO Lockout) |
| **13** | `13-loto-completed-permit.png` | **FSD** | 8. Safety Isolation Permit Issuance | Notice that upon verifying all 6 LOTO steps, active safety permit `LOTO-P07-2678` is issued, instantly unlocking Phase 2 maintenance task checklist steps. | S1 / Technician (P07-T01) / Stage 7 (Permit Issued) |
| **14** | `14-close-form-root-cause.png` | **FSD** | 9. Work Order Closure & Root Cause | Notice the post-maintenance closure form requiring the technician to document verified root cause ("Spherical roller bearing spalling"), downtime hours, and completion notes. | S1 / Technician (P07-T01) / Stage 7 (Closure Form) |
| **15** | `15-knowledge-card-verification.png` | **FSD** | 10. AI Knowledge Verification | Notice the draft tacit knowledge card synthesized by the AI Knowledge Agent from the closure notes, awaiting Training Coordinator review with "Verify & Publish" action. | S1 / Training Coordinator / Stage 8 (Knowledge Gate) |
| **16** | `16-machine-history-iso10816.png` | **FSD** | 11. Machine History & ISO 10816 | Notice the live telemetry chart with color-coded ISO 10816 vibration severity zones (good <2.8, watch 2.8-4.5, alarm 4.5-7.1, critical >7.1 mm/s) tracking P07-M03's rising baseline. | Machine History / Plant Head / Telemetry Health |
| **17** | `17-planning-table-recommendations.png` | **FSD** | 12. PM Optimiser Schedule Planning | Notice the AI-driven PM plan table showing condition-based keep, defer, and pull-forward recommendations, rationales, and the aggregate 27.5 technician hours saved. | PM Planning / Maintenance Planner / PM Optimiser |
| **18** | `18-role-navigation-composite.png` | **FSD** | 13. Role-Based Persona Navigation | Notice the side-by-side comparison of persona-tailored navigation menus: Technician (My tasks, Capture, Work orders) vs Maintenance Planner (My tasks, Alerts, Planning, Work orders). | App Shell / Multiple Personas / Navigation Menus |
| **19** | `19-s1-completed.png` | **FT** | 1. S1 End-to-End Restoration | Notice the 9-stage Flow Tracker at 100% completion across all stages, with the work order closed, knowledge card verified, and machine health fully restored. | S1 / Plant Head / Stage 9 (Restored to Normal) |
| **20** | `20-s3-false-alarm-filtered.png` | **FT** | 2. S3 Transient Spike Filtering | Notice alert AL-1003 on Palletiser Robot PR-1 suppressed by the AI signal interpreter with 31% confidence, preventing an unwarranted production stoppage. | S3 / Maintenance Planner / Stage 2 (False Alarm Filter) |
| **21** | `21-s4-stockout-blocking.png` | **FT** | 3. S4 Stockout Gating & PR Requisition | Notice work order execution strictly blocked due to zero stock of critical servo motor SP-015 (45-day lead time), with urgent purchase requisition logged in Stores. | S4 / Technician / Stage 7 (Execution Blocked) |
| **22** | `22-s6-shadow-mode-no-dispatch.png` | **FT** | 4. S6 Shadow Mode Non-Dispatch | Notice the Stuttgart plant alert AL-2001 operating in Shadow Mode with "Compare with outcome" replacing "Approve", verifying safety guardrails prevent accidental dispatch. | S6 / Head of Plant Operations / Stage 3 (Shadow Rollout) |

---

## Reused Architectural Figures (Explanation Document)

To preserve the strict 22-screenshot maximum within `docs/doc-pack/screens/`, the **System Explanation Document** reuses the existing canonical system architecture and observability figures located in `docs/screenshots/`:

1. **System Architecture Diagram**: Reuses `docs/screenshots/18-about-system-architecture.png`  
   *Notice the end-to-end industrial data pipeline from factory floor sensors and brownfield mobile observations through the Make.com / Gemini orchestrator, guardrails engine, and Supabase Postgres database.*
2. **Agent Console & Observability**: Reuses `docs/screenshots/15-agent-console-observability.png`  
   *Notice the real-time execution telemetry tracking token consumption, latency distribution, provider waterfall (Make, Direct Gemini, Cached), schema validity, and golden-set accuracy scorecards.*
