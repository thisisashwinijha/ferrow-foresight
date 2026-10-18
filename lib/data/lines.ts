import { getSeedData, queryWithFallback } from './db';
import { Line } from '../types';

export function getLinesSync(plantId?: string, lineId?: string): Line[] {
  const data = getSeedData();
  const lines: Line[] = data.lines || [];
  return lines.filter((l) => {
    if (plantId && l.plant_id !== plantId) return false;
    if (lineId && lineId !== 'all' && l.id !== lineId) return false;
    return true;
  });
}

export async function getLines(plantId: string, lineId?: string): Promise<Line[]> {
  return queryWithFallback<Line[]>(
    async (client) => {
      let query = client.from('lines').select('*').eq('plant_id', plantId);
      if (lineId && lineId !== 'all') {
        query = query.eq('id', lineId);
      }
      const { data, error } = await query;
      return { data: data as Line[], error };
    },
    () => getLinesSync(plantId, lineId),
    'getLines'
  );
}

export async function getLineById(id: string, plantId?: string): Promise<Line | undefined> {
  const lines = await getLines(plantId || '');
  return lines.find((l) => l.id === id);
}
