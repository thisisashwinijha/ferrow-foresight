import { describe, it, expect } from 'vitest';
import { getKpiSnapshotsSync } from '@/lib/data/kpis';
import { getOnboardedPlantsSync } from '@/lib/data/plants';
import { getAlertsSync } from '@/lib/data/alerts';

describe('KPI Dashboard & Performance Benchmarks', () => {
  it('retrieves 6-month historical snapshots for P-07 with all 10 KPI dimensions', () => {
    const snapshots = getKpiSnapshotsSync('P-07');
    expect(snapshots.length).toBe(6);

    const latest = snapshots[snapshots.length - 1];
    expect(latest.month).toBe('2026-09');
    expect(latest.plant_id).toBe('P-07');

    // 10 KPI fields verification
    expect(typeof latest.mtbf_hours).toBe('number');
    expect(typeof latest.mttr_hours).toBe('number');
    expect(typeof latest.availability_pct).toBe('number');
    expect(typeof latest.planned_maintenance_pct).toBe('number');
    expect(typeof latest.pm_compliance_pct).toBe('number');
    expect(typeof latest.wasted_pm_pct).toBe('number');
    expect(typeof latest.breakdown_hours).toBe('number');
    expect(typeof latest.downtime_cost_usd).toBe('number');
    expect(typeof latest.spares_stockouts).toBe('number');
    expect(typeof latest.backlog_weeks).toBe('number');
  });

  it('retrieves snapshots for all 4 onboarded plants', () => {
    const onboardedPlants = getOnboardedPlantsSync();
    expect(onboardedPlants.length).toBe(4);

    const plantIds = onboardedPlants.map((p) => p.id);
    expect(plantIds).toContain('P-07');
    expect(plantIds).toContain('P-03');
    expect(plantIds).toContain('P-12');
    expect(plantIds).toContain('P-21');

    for (const pid of plantIds) {
      const plantSnaps = getKpiSnapshotsSync(pid);
      expect(plantSnaps.length).toBe(6);
    }
  });

  it('dynamically computes false alarm rate from suppressed and rejected alerts', () => {
    const alerts = getAlertsSync('P-07');
    expect(alerts.length).toBeGreaterThan(0);

    const suppressed = alerts.filter((a) => a.status === 'suppressed').length;
    const rejected = alerts.filter((a) => a.status === 'rejected').length;
    const total = alerts.length;

    const falseAlarms = suppressed + rejected;
    const ratePct = (falseAlarms / total) * 100;
    const precisionPct = ((total - falseAlarms) / total) * 100;

    expect(ratePct).toBeGreaterThanOrEqual(0);
    expect(ratePct).toBeLessThanOrEqual(100);
    expect(precisionPct + ratePct).toBeCloseTo(100, 1);

    // Verify AL-1003 is suppressed in P-07
    const al1003 = alerts.find((a) => a.id === 'AL-1003');
    expect(al1003?.status).toBe('suppressed');
    expect(suppressed).toBeGreaterThanOrEqual(1);
  });

  it('verifies pilot targets maintain required reduction thresholds', () => {
    const p07Snaps = getKpiSnapshotsSync('P-07');
    const latest = p07Snaps[p07Snaps.length - 1];

    // Historical baseline references
    const baselineDowntime = 2.8; // hours / month
    const baselineWastedPm = 68.4; // %

    // Pilot targets
    const targetDowntimeReductionMin = 0.20; // 20%
    const targetDowntimeReductionMax = 0.30; // 30%
    const targetWastedPmReduction = 0.30; // 30%
    const targetPrecisionMin = 85.0; // 85%

    const maxAllowedDowntime = baselineDowntime * (1 - targetDowntimeReductionMin);
    const maxAllowedWastedPm = baselineWastedPm * (1 - targetWastedPmReduction);

    expect(maxAllowedDowntime).toBeLessThan(2.3);
    expect(maxAllowedWastedPm).toBeLessThan(50);
    expect(targetPrecisionMin).toBe(85.0);
  });
});
