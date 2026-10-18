import { getSeedData, queryWithFallback } from './db';
import { KpiSnapshot } from '../types';

export function getKpiSnapshotsSync(plantId: string, lineId?: string): KpiSnapshot[] {
  const data = getSeedData();
  const snapshots: KpiSnapshot[] = data.kpi_snapshots || [];
  return snapshots
    .filter((s) => s.plant_id === plantId)
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getLatestKpiSnapshotSync(plantId: string): KpiSnapshot | undefined {
  const snapshots = getKpiSnapshotsSync(plantId);
  return snapshots[snapshots.length - 1];
}

export function getPreviousKpiSnapshotSync(plantId: string): KpiSnapshot | undefined {
  const snapshots = getKpiSnapshotsSync(plantId);
  if (snapshots.length < 2) return undefined;
  return snapshots[snapshots.length - 2];
}

export async function getKpiSnapshots(plantId: string, lineId?: string): Promise<KpiSnapshot[]> {
  return queryWithFallback<KpiSnapshot[]>(
    async (client) => {
      const { data, error } = await client
        .from('kpi_snapshots')
        .select('*')
        .eq('plant_id', plantId)
        .order('month', { ascending: true });
      return { data: data as KpiSnapshot[], error };
    },
    () => getKpiSnapshotsSync(plantId, lineId),
    'getKpiSnapshots'
  );
}

export async function getLatestKpiSnapshot(plantId: string, lineId?: string): Promise<KpiSnapshot | undefined> {
  const snapshots = await getKpiSnapshots(plantId, lineId);
  return snapshots[snapshots.length - 1];
}

export async function getPreviousKpiSnapshot(plantId: string, lineId?: string): Promise<KpiSnapshot | undefined> {
  const snapshots = await getKpiSnapshots(plantId, lineId);
  if (snapshots.length < 2) return undefined;
  return snapshots[snapshots.length - 2];
}
