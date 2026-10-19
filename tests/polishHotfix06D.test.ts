import { describe, it, expect } from 'vitest';
import { humanizeRawValue } from '@/lib/lifecycle';
import { generateMachineSummary } from '@/lib/machineSummary';
import { pmOptimiserService } from '@/lib/pmOptimiserService';

describe('Fix 10: Polish and UI consistency', () => {
  it('humanises raw values to clean sentence-case titles', () => {
    expect(humanizeRawValue('conveyor_drive')).toBe('Conveyor drive');
    expect(humanizeRawValue('fault_found')).toBe('Fault found');
    expect(humanizeRawValue('bearing_wear')).toBe('Bearing wear');
    expect(humanizeRawValue('sensor_threshold')).toBe('Sensor threshold');
    expect(humanizeRawValue('no_fault')).toBe('No fault');
  });

  it('machine Agent summary incorporates live telemetry matching the chart', () => {
    const summaryLive = generateMachineSummary('P07-M03', 'P-07', {
      vibration_mm_s: 5.67,
      temperature_c: 62.3,
    });
    expect(summaryLive.answer).toContain('5.67 mm/s');
    expect(summaryLive.answer).toContain('62.3°C');

    const summaryNominal = generateMachineSummary('P07-M01', 'P-07', {
      vibration_mm_s: 1.25,
      temperature_c: 48.0,
    });
    expect(summaryNominal.answer).toContain('1.25 mm/s');
  });

  it('replaces statutory calendar schedule maintained with no sensor data message in PM Optimiser', async () => {
    const res = await pmOptimiserService('P-07');
    const plansWithNoSensor = res.decisions.filter((d) =>
      d.reason.includes('No sensor data; keep the scheduled visit')
    );
    expect(plansWithNoSensor.length).toBeGreaterThan(0);

    const hasOldStatutoryText = res.decisions.some((d) =>
      d.reason.includes('Statutory calendar schedule maintained')
    );
    expect(hasOldStatutoryText).toBe(false);
  });
});
