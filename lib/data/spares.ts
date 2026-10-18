import { getSeedData, queryWithFallback } from './db';
import { Spares } from '../types';

export function getSparesSync(plantId?: string, lineId?: string): Spares[] {
  const data = getSeedData();
  const spares: Spares[] = data.spares || [];
  if (!plantId) return spares;
  return spares.filter((s) => s.plant_id === plantId);
}

export function getSpareByIdSync(id: string): Spares | undefined {
  const data = getSeedData();
  const spares: Spares[] = data.spares || [];
  return spares.find((s) => s.id === id);
}

export async function getSpares(plantId: string, lineId?: string): Promise<Spares[]> {
  return queryWithFallback<Spares[]>(
    async (client) => {
      let query = client.from('spares').select('*');
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query;
      return { data: data as Spares[], error };
    },
    () => getSparesSync(plantId, lineId),
    'getSpares'
  );
}

export async function getSpareById(id: string, plantId?: string): Promise<Spares | undefined> {
  return queryWithFallback<Spares | undefined>(
    async (client) => {
      let query = client.from('spares').select('*').eq('id', id);
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query.maybeSingle();
      return { data: (data as Spares) || undefined, error };
    },
    () => getSpareByIdSync(id),
    'getSpareById'
  );
}

export async function getSparesByMachineType(machineType: string, plantId: string): Promise<Spares[]> {
  const spares = await getSpares(plantId);
  return spares.filter((s) =>
    Array.isArray(s.compatible_types) && s.compatible_types.includes(machineType)
  );
}
