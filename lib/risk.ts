import { MachineCriticality, AlertUrgency } from './types';

export type SeverityLevel = 'normal' | 'watch' | 'alarm' | 'critical';

/**
 * ISO 10816 Vibration severity classification:
 * - Below 2.8 mm/s: good (normal)
 * - 2.8 to 4.5 mm/s: watch
 * - 4.5 to 7.1 mm/s: alarm
 * - Above 7.1 mm/s: critical
 */
export function getVibrationSeverity(vibration_mm_s: number): SeverityLevel {
  if (vibration_mm_s < 2.8) return 'normal';
  if (vibration_mm_s <= 4.5) return 'watch';
  if (vibration_mm_s <= 7.1) return 'alarm';
  return 'critical';
}

/**
 * Temperature rise over baseline classification:
 * - Under 10 °C: normal
 * - 10 to 20 °C: watch
 * - Over 20 °C: alarm
 */
export function getTemperatureSeverity(temperature_c: number, baseline_c: number): SeverityLevel {
  const rise = temperature_c - baseline_c;
  if (rise < 10) return 'normal';
  if (rise <= 20) return 'watch';
  return 'alarm';
}

/**
 * Compute combined severity from vibration and temperature.
 */
export function getCombinedSeverity(
  vibration_mm_s: number,
  temperature_c: number,
  temp_baseline: number
): SeverityLevel {
  const vibSev = getVibrationSeverity(vibration_mm_s);
  const tempSev = getTemperatureSeverity(temperature_c, temp_baseline);

  const order: Record<SeverityLevel, number> = {
    normal: 0,
    watch: 1,
    alarm: 2,
    critical: 3,
  };

  const maxVal = Math.max(order[vibSev], order[tempSev]);
  return (['normal', 'watch', 'alarm', 'critical'] as SeverityLevel[])[maxVal];
}

/**
 * Urgency matrix from prompts/triage_planner.md:
 * - critical: A=P1, B=P1, C=P2
 * - alarm: A=P1, B=P2, C=P3
 * - watch: A=P3, B=P3, C=none
 * - normal: none
 */
export function getUrgencyFromSeverity(
  severity: SeverityLevel,
  criticality: MachineCriticality
): AlertUrgency {
  if (severity === 'critical') {
    if (criticality === 'A' || criticality === 'B') return 'P1';
    return 'P2';
  }
  if (severity === 'alarm') {
    if (criticality === 'A') return 'P1';
    if (criticality === 'B') return 'P2';
    return 'P3';
  }
  if (severity === 'watch') {
    if (criticality === 'A' || criticality === 'B') return 'P3';
    return 'none';
  }
  return 'none';
}

export const DOWNTIME_COST_USD_PER_HOUR = 18000;

/**
 * Consequence factor based on asset criticality:
 * Criticality A: 1.0
 * Criticality B: 0.6
 * Criticality C: 0.3
 */
export function getConsequenceFactor(criticality?: MachineCriticality | string | null): number {
  switch (criticality?.toUpperCase()) {
    case 'A':
      return 1.0;
    case 'B':
      return 0.6;
    case 'C':
      return 0.3;
    default:
      return 0.6;
  }
}

/**
 * Severity factor:
 * - Critical / P1: 1.0
 * - Alarm / P2: 0.8
 * - Watch / P3: 0.5
 * - Normal / None: 0.2
 */
export function getSeverityFactor(severityOrUrgency?: string | null): number {
  if (!severityOrUrgency) return 0.5;
  const s = severityOrUrgency.toLowerCase();
  if (s === 'critical' || s === 'p1') return 1.0;
  if (s === 'alarm' || s === 'p2') return 0.8;
  if (s === 'watch' || s === 'p3') return 0.5;
  if (s === 'normal' || s === 'none') return 0.2;
  return 0.5;
}

/**
 * Likelihood derived from severity and confidence:
 * likelihood = severity_factor * confidence
 */
export function getLikelihood(severityOrUrgency?: string | null, confidence = 0.85): number {
  const sevFactor = getSeverityFactor(severityOrUrgency);
  const conf = Math.max(0, Math.min(1, confidence));
  return sevFactor * conf;
}

/**
 * Risk score for new live alerts:
 * risk = likelihood x consequence x 100 (likelihood from severity and confidence; consequence A 1.0, B 0.6, C 0.3)
 * Health = 100 - risk
 */
export function calculateLiveRiskScore(params: {
  criticality?: MachineCriticality | string | null;
  severityOrUrgency?: string | null;
  confidence?: number;
}): { risk: number; health: number; likelihood: number; consequence: number } {
  const consequence = getConsequenceFactor(params.criticality);
  const likelihood = getLikelihood(params.severityOrUrgency, params.confidence ?? 0.85);
  const rawRisk = likelihood * consequence * 100;
  const risk = Math.max(0, Math.min(100, Math.round(rawRisk)));
  const health = Math.max(0, 100 - risk);
  return { risk, health, likelihood, consequence };
}

export const RISK_SCORE_TOOLTIP =
  'Risk score = Likelihood × Consequence × 100 (Likelihood from severity & confidence; Consequence: A = 1.0, B = 0.6, C = 0.3; Health = 100 - Risk)';

