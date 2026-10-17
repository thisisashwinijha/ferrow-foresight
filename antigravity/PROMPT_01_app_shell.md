# Antigravity Prompt 01: Scaffold, design system, app shell, Control Room

Mode: Planning. Paste everything between the lines.

---------------------------------------------------------------
Read PROJECT_SPEC.md in this folder completely before planning. It is the source of truth. Also look at data/seed_data.json and supabase/schema.sql to understand the data.

Task: set up the project and build the app shell plus the Control Room page.

1. Scaffold a Next.js app (App Router, TypeScript, Tailwind, ESLint, src directory NO, import alias @/*) in THIS folder. This folder already contains data/, supabase/, prompts/, golden/, antigravity/, PROJECT_SPEC.md and AGENTS.md. Do not delete or overwrite them. If create-next-app refuses a non-empty folder, scaffold into a temporary folder, move the files here, then remove the temporary folder.
2. Install and configure shadcn/ui, Recharts and lucide-react. Use next/font to load IBM Plex Sans and IBM Plex Sans Condensed with system fallbacks.
3. Implement the design system from PROJECT_SPEC.md section 6 exactly: CSS variables for Day shift and Night shift, a theme toggle in the top bar, Tailwind config mapped to these variables. Grey is normal, colour only for abnormal states, --agent colour only for AI suggestions.
4. Create lib/types.ts matching supabase/schema.sql, and lib/data/ with one module per entity that reads data/seed_data.json (server-side). Pages and components must only use lib/data functions, never the JSON directly, so we can swap to Supabase later.
5. Create lib/risk.ts with deterministic severity from vibration (ISO 10816 bands in spec section 10) and temperature rise over baseline (under 10 C normal, 10 to 20 C watch, over 20 C alarm).
6. Create lib/simulator.ts: a client-side ticker that every 3 seconds emits a new reading for each sensor machine, continuing from its latest seed reading with small noise. P07-M03 continues rising slowly. P07-M18 stays offline. Each shadow plant's degrading machine continues rising.
7. Build the app shell:
   - Left sidebar nav with all routes in PROJECT_SPEC.md section 3, grouped: Operate (Network, Control Room, Work orders, Capture), Plan (Planning, Production, Spares), Improve (KPIs, People, Agent console), About. Collapses to icons on tablet and a bottom/hamburger menu on phone.
   - Top bar: plant selector (spec section 2: All plants plus the 4 onboarded plants with Pilot / Shadow badges, not-onboarded plants greyed out), live clock in the selected plant's local time zone, green "Live" dot, role switcher (7 roles from spec section 2; switching role navigates to that role's landing page), Demo mode badge, Reset demo button (no-op for now, shows a toast), theme toggle, machine search (Cmd+K / Ctrl+K).
   - Plant and line selection live in the URL query (?plant=P-07&line=P07-L2), default plant P-07, and persist across navigation.
8. Build the Network page (/network) fully, per spec section 3: network totals strip, rollout status by region, and a sortable table of all 40 plants with status badges. Onboarded rows open that plant's Control Room; not-onboarded rows are not clickable.

9. Build the Control Room page (/) fully for the selected plant, with line filter chips (All lines, then each line):
   - KPI strip: Unplanned downtime this month (hours and USD at 18,000 per hour), Availability, MTBF, MTTR, Planned maintenance %, Wasted PM %, Open P1 alerts. Use kpi_snapshots (latest month, selected plant) and alerts. Show change vs previous month.
   - Line mimic: one row per line of the selected plant (respecting the line filter), each a horizontal flow of machine tiles in order. Tile shows machine id, short name, sensor or legacy icon, risk score, and for sensor machines a tiny live sparkline from the simulator. Normal tiles are grey. Tiles linked to a pending or needs_review alert use the urgency colour (P1 critical, P2 high, P3 medium). Machine under maintenance shows a wrench icon. Clicking a tile goes to /machines/[id].
   - Live alert feed (right column): alerts for the selected plant sorted newest first, shadow-mode alerts tagged "Shadow mode", each with machine, failure mode, urgency badge, confidence, status, and an "AI suggestion" tag with the --agent left border. Suppressed alerts appear muted with label "Filtered as false alarm".
   - Approvals queue: alerts with status pending or needs_review, with buttons "Review" (go to /alerts/[id]).
   - Everything responsive per spec section 9.
10. Create every other route from spec section 3 as a page with the proper title, one-line description and an empty state that says "Coming in the next build step". Use the shell layout.
11. Run the dev server, open /network, / (switch between all 4 plants and a line filter) and at least two other routes in the browser, check phone width 375px and desktop 1440px, fix all console errors.
12. Initialise git, add a proper .gitignore (node_modules, .next, .env*, except .env.example), create .env.example with blank NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, MAKE_WEBHOOK_URL, DEMO_MODE=true. Commit with message "Build 01: scaffold, design system, shell, control room". Do not push yet.

When done, give me: a short summary, the list of files created, and screenshots of /network and / (pilot plant) at desktop and phone width, and / for one shadow plant.
---------------------------------------------------------------
