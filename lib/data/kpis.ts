import { getSeedData } from './db';
import { KpiSnapshot } from '../types';

export function getKpiSnapshots(plantId: string): KpiSnapshot[] {
  const data = getSeedData();
  const snapshots: KpiSnapshot[] = data.kpi_snapshots || [];
  return snapshots
    .filter((s) => s.plant_id === plantId)
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getLatestKpiSnapshot(plantId: string): KpiSnapshot | undefined {
  const snapshots = getKpiSnapshots(plantId);
  return snapshots[snapshots.length - 1];
}

export function getPreviousKpiSnapshot(plantId: string): KpiSnapshot | undefined {
  const snapshots = getKpiSnapshots(plantId);
  if (snapshots.length < 2) return undefined;
  return snapshots[snapshots.length - 2];
}
