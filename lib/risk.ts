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
