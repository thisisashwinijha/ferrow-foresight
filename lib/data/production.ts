import { getSeedData, queryWithFallback } from './db';
import { ProductionSchedule } from '../types';
import { getLinesSync } from './lines';

export function getProductionScheduleSync(plantId?: string, lineId?: string): ProductionSchedule[] {
  const data = getSeedData();
  const schedule: ProductionSchedule[] = (data.production_schedule as unknown as ProductionSchedule[]) || [];
  return schedule.filter((s) => {
    if (lineId && lineId !== 'all' && s.line_id !== lineId) return false;
    if (plantId && plantId !== 'all') {
      const plantLines = new Set(getLinesSync(plantId).map((l) => l.id));
      if (!plantLines.has(s.line_id)) return false;
    }
    return true;
  });
}

export async function getProductionSchedule(
  plantId?: string,
  lineId?: string
): Promise<ProductionSchedule[]> {
  return queryWithFallback<ProductionSchedule[]>(
    async (client) => {
      let query = client.from('production_schedule').select('*');
      if (lineId && lineId !== 'all') {
        query = query.eq('line_id', lineId);
      }
      const { data, error } = await query;
      if (error || !data) return { data: null, error };

      let list = data as ProductionSchedule[];
      if (plantId && plantId !== 'all' && (!lineId || lineId === 'all')) {
        const plantLines = new Set(getLinesSync(plantId).map((l) => l.id));
        list = list.filter((s) => plantLines.has(s.line_id));
      }
      return { data: list, error: null };
    },
    () => getProductionScheduleSync(plantId, lineId),
    'getProductionSchedule'
  );
}
