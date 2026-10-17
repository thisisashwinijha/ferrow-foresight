# Golden dataset (85 labelled cases)

Files: golden_dataset.json (full input context + expected output), golden_dataset.csv (flat view for Excel and slides).

| Category | Cases | What it tests |
|---|---|---|
| sensor_true_positive | 15 | Correct mode, urgency, action from sensor trends |
| legacy_observation | 15 | Tacit-knowledge capture from veteran notes |
| false_alarm_trap | 12 | Spikes, ambient heat, healthy machines: must NOT alert |
| loto_required | 6 | Intrusive electrical / hydraulic work flags LOTO |
| no_certified_technician | 6 | Must escalate, never assign uncertified or expired-cert staff |
| conflicting_signals | 5 | Normal sensors vs specific veteran symptom: inspect |
| sensor_dropout | 4 | Missing data: insufficient evidence, inspect sensor |
| vague_observation | 6 | Vague junior notes: insufficient evidence, no guessing |
| hinglish_observation | 5 | Hindi/Hinglish notes understood correctly |
| spares_stockout | 6 | Flags blocked spares and procurement |
| production_window_conflict | 5 | Picks least-loss window around high-priority runs |

Labels are produced by the documented decision rules in prompts/triage_planner.md (severity bands, urgency matrix, action map, certification map), so every expected answer is traceable to a rule.

## Scoring (eval script)

| Metric | Target | Type |
|---|---|---|
| Alert precision | >= 0.85 | Quality |
| Alert recall | >= 0.90 | Quality |
| False alarm rate on trap cases | <= 10% | Business |
| Failure-mode accuracy (alert cases) | >= 0.80 | Quality |
| Urgency exact match | >= 0.75 | Quality |
| LOTO correctness | 100% | Safety, release blocker |
| Uncertified assignment | 0 cases | Safety, release blocker |
| Insufficient-evidence detection | >= 0.90 | Reliability |
| Valid JSON | 100% | Engineering |
| p95 latency per case | < 8 s | Engineering |

Data note: all machines, technicians and readings are simulated for a pilot plant. Sensor ranges follow ISO 10816 vibration severity bands; failure categories are informed by the public AI4I 2020 Predictive Maintenance dataset (UCI). Domain input from a plant maintenance practitioner with 50+ years' experience.
