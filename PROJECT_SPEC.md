# Ferrow Foresight: Project Spec (source of truth for every build step)

AI coding agents: read this whole file before every task. Never change the stack, folder structure, data model or design system without being explicitly told to. If a request conflicts with this file, stop and ask.

## 1. Product

Ferrow Foresight is a maintenance operating system for Ferrow Industrial (40 plants, about 12,000 machines worldwide). It moves maintenance from breakdown (BM) to planned (PM), condition-based (CBM) and risk-based (RBM) maintenance. An AI triage agent reads sensor trends (sensor machines) and technician observations (legacy machines without sensors), then recommends the right intervention, technician, spares and production window. A human approves every recommendation.

Rollout state shown in the product (all data simulated):

| Status | Plants | What the app shows |
|---|---|---|
| Pilot (live) | P-07 Pune, India: 30 machines in pilot scope, 3 lines | Full module depth, agent recommendations can be approved and executed |
| Shadow mode | P-03 Stuttgart, P-12 Monterrey, P-21 Suzhou | Full drill-down. Agent runs and logs recommendations, but they are compared with technician outcomes, not dispatched. Approve is replaced by "Compare with outcome" |
| Not onboarded | 36 other plants | Summary row only on the Network page (machines, sensor %, downtime, availability). Not selectable |

Network figures must match the case: about 12,000 machines, about 40 unplanned downtime hours per month across the network, USD 18,000 per hour per line.

Asset IDs are plant-scoped: plant P-07, line P07-L2, machine P07-M03, technician P07-T01. Spares rows are per plant (id P07-SP-003) with a global part_no (SP-003).

Core loop to demo: Detect -> Triage (AI) -> Approve -> Schedule in production window -> Reserve spares -> Execute with LOTO -> Close -> Update history card -> Learn.

## 2. Roles and context selection

| Role | Lands on | Main jobs |
|---|---|---|
| Head of Plant Operations | /network | Network health across 40 plants, rollout status, downtime cost |
| Plant Head | / (Control Room, selected plant) | Plant risk, approve P1 alerts, KPIs |
| Maintenance Planner | /planning | Approve alerts, adjust PM plan, schedule work |
| Technician | /capture | Log observations, own work orders, LOTO checklist |
| Production Manager | /production | Agree maintenance windows vs production plan |
| Stores In-charge | /spares | Spares readiness, reservations, reorders |
| Training Coordinator | /people | Skill matrix, certification expiry, pairings |

Role switcher (top bar, no real login in MVP) changes landing page, highlighted nav and enabled actions. All pages viewable by all roles.

Context selection (top bar, persistent across pages):
- Plant selector: "All plants (Network)" plus the 4 onboarded plants with a status badge (Pilot / Shadow). Not-onboarded plants appear greyed out with "Not onboarded". Default: P-07.
- Line filter chips on plant-level pages: All lines, then each line of the selected plant.
- Machine search (Cmd+K / Ctrl+K and a search icon on mobile): find any machine in the selected plant by ID or name, jump to its history card.
- Selection lives in the URL (?plant=P-07&line=P07-L2) so any view can be shared as a link, and survives refresh.
- Every data function takes plantId and optional lineId.

## 3. Modules and routes

| Route | Module | Must show |
|---|---|---|
| /network | Network | Totals (plants, machines, sensor %, downtime hours and USD last month, open alerts), rollout status by region, table of all 40 plants with status badges; onboarded rows open that plant's Control Room |
| / | Control Room | KPI strip, line mimic (3 lines, machine tiles), live alert feed, approvals queue, live clock, plant status |
| /machines/[id] | Machine History Card | Asset details, strategy, health and risk, live telemetry chart (sensor machines), observations, maintenance log timeline, MTBF/MTTR, related alerts and work orders, AI summary |
| /alerts/[id] | Alert detail | Evidence list, reasoning, recommended action, guardrail checks, technician, window, spares, cost of failure vs intervention, Approve / Reject with reason |
| /planning | Maintenance Planning | Strategy mix (BM/PM/CBM/RBM), risk matrix (criticality x probability), PM plan with AI keep / defer / pull-forward and reasons, accept or override |
| /work-orders | Execution | Kanban by status: raised, approved, scheduled, loto_applied, in_progress, closed |
| /work-orders/[id] | Work order | LOTO checklist (must complete before task steps unlock), task checklist, technician + shadow, spares, closure form (root cause, notes, downtime) |
| /spares | Spares Readiness | Stock vs min, lead time, critical flag, reserved qty, readiness % per upcoming job, stockout alerts |
| /production | Production Coordination | 14-day x 3-line x 3-shift grid, window types colour-coded, scheduled maintenance overlaid, production loss per proposed slot |
| /kpis | KPI Dashboard | MTBF, MTTR, availability, planned maintenance %, PM compliance, wasted PM %, breakdown hours, downtime cost, false alarm rate, stockouts, backlog |
| /people | Skills and Development | Skill matrix heatmap (level 1 to 4 vs target), certification expiry, knowledge library of veteran failure signatures, suggested veteran + junior pairings |
| /capture | Technician Capture (mobile-first) | Pick machine, symptom tags (sound, smell, heat, vibration, visual, performance), voice or typed note, submit |
| /agent | Agent Console | Agent run log (latency, tokens, schema valid, guardrail pass), prompt versions, golden-set scorecard |
| /about | For assessors | Architecture diagram, demo walkthrough, links to repo and deck |

## 4. Stack (do not change)

- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, Recharts, lucide-react icons, next/font (Google Fonts)
- Data: Supabase Postgres (schema in supabase/schema.sql). Until Supabase is wired, read from data/seed_data.json through the data layer in lib/data. Pages must never import the JSON directly.
- Agent: Make.com scenario called via webhook from a server route. LLM is Gemini (free tier) inside Make. Prompts live in /prompts.
- Hosting: Vercel. Branch dev = preview, main = production.
- No other databases, auth providers, state libraries or UI kits.

## 5. Folder structure

```
app/                 routes (see section 3)
app/api/             server routes: agent trigger, approve, reject, observation submit, reset demo
components/          shared UI (shell, tiles, charts, badges, tables)
lib/data/            data access layer (seed JSON now, Supabase later), one file per entity
lib/types.ts         TypeScript types matching supabase/schema.sql
lib/risk.ts          deterministic risk and severity scoring (ISO 10816 bands)
lib/guardrails.ts    validator for agent output (see prompts/triage_planner.md)
lib/simulator.ts     client-side live telemetry ticker
data/seed_data.json  seed data (simulated pilot plant)
supabase/            schema.sql, seed.sql
prompts/             agent prompts (versioned)
golden/              golden dataset + README
scripts/             eval script
```

## 6. Design system: "Grey is normal. Colour means attention." (Modern Linear / Vercel feel)

Inspired by modern operational tooling (Linear, Vercel dashboard) and ISA-101 high-performance HMI practice: neutral greys and subtle surface tints for normal state, color reserved strictly for abnormal states, so problems immediately draw focus.

Tokens (CSS variables on :root for Day shift default, [data-theme="dark"] for Night shift):

| Token | Day shift (default) | Night shift |
|---|---|---|
| --canvas | #F7F8F9 | #14171A |
| --surface | #FFFFFF | #1C2024 |
| --surface-2 | #F0F2F4 | #24292E |
| --ink | #181B1E | #EDF0F2 |
| --ink-muted | #656F7D | #8B949E |
| --line | #E2E5E8 | #2D3339 |
| --critical (P1) | #C4161C | #E5484D |
| --high (P2) | #D9711C | #F0883E |
| --medium (P3 / watch) | #B89600 | #D9B310 |
| --ok (closed, confirmed) | #2F7A4E | #4CAF78 |
| --agent (AI suggestions) | #3A5DAE | #7C9BE8 |

Rules:
- Surfaces: remove heavy borders. Separate sections with generous spacing and subtle surface tints. Cards radius 12px, buttons and chips 8px. Avoid unnecessary inner divider lines.
- Typography: IBM Plex Sans only, tabular-nums for figures. Monospace only for asset IDs inside tables. No all-caps anywhere; sentence case for every heading, label, and badge. Strong size contrast: page title 28px semibold, hero numbers 32 to 36px light or regular weight, labels 13px muted.
- Badges: soft tinted style (colored text on a 10 to 15% opacity background of the same color), never solid fills except the P1 count.
- Colour use: alarm colors only on things that need attention. The --agent color only as a small "AI" badge or marker, not heavy borders everywhere.
- Spacing: generous. Page padding at least 32px on desktop. Fewer elements per screen to preserve calm and clarity.
- Motion: 150 to 200ms ease transitions on hover, panels, drawers, and tabs. Respect prefers-reduced-motion.
- Navigation: slim icon rail (64px) with tooltips, expandable on toggle or hover. Top bar: plant switcher on left, command search center (Cmd+K), role, demo pill, and theme toggle right. Keep it light, without heavy boxes.
- Detail views: open in a right-side sheet/drawer where sensible instead of new cluttered sections.
- Accessibility: visible keyboard focus, color is never the only signal (always text or icon), respects prefers-reduced-motion.

## 7. Live feel (demo must look real-time)

- Live clock and "Live" indicator in the top bar.
- lib/simulator.ts ticks telemetry every 3 seconds for sensor machines, continuing each machine's trend from its latest reading with small noise. P07-M03 keeps rising.
- Alert feed and work orders update without page reload (Supabase realtime later; local state events now).
- Toast notifications for new alerts, approvals and status changes.
- Skeleton loaders, never blank screens. Empty states say what to do next.

## 8. Demo mode and safety

- DEMO_MODE (default on): agent responses for seeded scenarios come from the cached alerts in seed data. "Run live agent" button calls the real Make webhook, rate-limited per visitor.
- "Reset demo" button in the top bar restores seed state.
- Browser uses only the Supabase anon key (read-only by RLS). All writes go through app/api routes using the service role key on the server.
- Secrets only in .env.local and Vercel environment variables. Never commit keys. Keep .env.example with blank values.

## 9. Cross-platform requirements

- Works in current Chrome, Edge, Safari and Firefox on macOS, Windows, Android and iOS.
- Responsive at 375px (phone), 768px (tablet), 1280px and 1920px (desktop and control-room screen). /capture is designed phone-first; other pages collapse to a single column with a bottom or hamburger nav on phones.
- Voice notes use the browser Web Speech API where supported (Chrome, Edge, Safari). Where not supported (Firefox), hide the mic button and keep typing. Never break the page.
- No OS-specific code, paths or fonts. Fonts load through next/font with system fallbacks.

## 10. Domain rules the UI must respect

- LOTO steps must be completed before task steps unlock on a work order.
- A technician can only be assigned if they hold every required certification and none is expired (P07-T04's LOTO expired 30 Sep 2026; P07-T09's expires 10 Nov 2026 and must show a warning).
- P1 alerts on criticality A machines require Plant Head approval.
- Unplanned downtime cost: USD 18,000 per hour per line (case figure).
- Vibration bands (ISO 10816 guide): below 2.8 good, 2.8 to 4.5 watch, 4.5 to 7.1 alarm, above 7.1 critical (mm/s).

## 11. Working rules for the coding agent

- Work only inside this project folder.
- After each task: run the dev server, open the pages you changed in the browser, fix console errors, then summarise what changed.
- Keep components small and typed. No placeholder lorem ipsum: use seed data.
- Do not delete or rewrite files in data/, supabase/, prompts/, golden/ unless told to.
- Commit with a clear message when told to checkpoint.
