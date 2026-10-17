# Block 1 package: what each file is

| File | Purpose |
|---|---|
| PROJECT_SPEC.md | Source of truth the Antigravity agent reads before every task |
| AGENTS.md | One-line pointer so agents always read the spec |
| supabase/schema.sql | Database tables, read-only security for the browser, realtime |
| supabase/seed.sql | Simulated network: 40 plants (~12,000 machines), 4 onboarded plants with 94 detailed machines, 37 technicians, 6 months history, 17 cached AI alerts |
| data/seed_data.json | Same data as JSON, used by the app until Supabase is wired |
| golden/golden_dataset.json / .csv | 85 labelled test cases + README with scoring targets |
| prompts/signal_interpreter.md | AI agent 1 prompt (technician note to structured signal) |
| prompts/triage_planner.md | AI agent 2 prompt (decision, safety, spares, window) + guardrail table |
| antigravity/PROMPT_01_app_shell.md | First prompt to paste into Antigravity |
