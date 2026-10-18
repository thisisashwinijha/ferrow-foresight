# Golden Dataset Evaluation Report

**Generated:** 2026-10-18T15:04:09.547Z  
**Provider:** direct  
**Total Cases Evaluated:** 82 (Excluded few-shot: GC-001, GC-031, GC-064)

## 1. Overall Scorecard vs Targets

| Evaluation Metric | Target Threshold | Achieved Result | Status |
|---|---|---|---|
| Alert precision | >= 0.85 | 100.0% | PASS |
| Alert recall | >= 0.90 | 100.0% | PASS |
| False alarm rate on trap cases | <= 10% | 0.0% | PASS |
| Failure-mode accuracy (alert cases) | >= 0.80 | 83.1% | PASS |
| Urgency exact match | >= 0.75 | 80.3% | PASS |
| LOTO correctness | 100% | 81.7% | FAIL |
| Uncertified assignment | 0 cases | 0 cases | PASS |
| Insufficient-evidence detection | >= 0.90 | 100.0% | PASS |
| Valid JSON | 100% | 100.0% | PASS |
| p95 latency per case | < 8 s | 9.70 s | WARN |

## 2. Category Performance Breakdown

| Category | Cases | Alert Match | Failure Mode Match | Urgency Match | LOTO Correct |
|---|---|---|---|---|---|
| `sensor_true_positive` | 14 | 100.0% | 50.0% | 85.7% | 100.0% |
| `legacy_observation` | 15 | 100.0% | 100.0% | 73.3% | 73.3% |
| `false_alarm_trap` | 11 | 100.0% | N/A | N/A | 100.0% |
| `loto_required` | 6 | 100.0% | 100.0% | 83.3% | 83.3% |
| `no_certified_technician` | 6 | 100.0% | 83.3% | 83.3% | 66.7% |
| `conflicting_signals` | 5 | 100.0% | 80.0% | 20.0% | 0.0% |
| `sensor_dropout` | 4 | 100.0% | 100.0% | 100.0% | 100.0% |
| `vague_observation` | 5 | 100.0% | 100.0% | 100.0% | 100.0% |
| `hinglish_observation` | 5 | 100.0% | 100.0% | 60.0% | 60.0% |
| `spares_stockout` | 6 | 100.0% | 83.3% | 100.0% | 83.3% |
| `production_window_conflict` | 5 | 100.0% | 60.0% | 100.0% | 100.0% |

## 3. Latency Distribution

- **Minimum:** 2.51 s
- **Average:** 3.81 s
- **p95:** 9.70 s
- **Maximum:** 11.19 s
