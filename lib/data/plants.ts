import { getSeedData, queryWithFallback } from './db';
import { Plant } from '../types';

export const PLANT_TIMEZONES: Record<string, string> = {
  'P-07': 'Asia/Kolkata',
  'P-03': 'Europe/Berlin',
  'P-12': 'America/Monterrey',
  'P-21': 'Asia/Shanghai',
};

export function getPlantsSync(): Plant[] {
  const data = getSeedData();
  return (data.plants as unknown as Plant[]) || [];
}

export function getPlantByIdSync(id: string): Plant | undefined {
  const plants = getPlantsSync();
  return plants.find((p) => p.id === id);
}

export async function getPlants(plantId?: string, lineId?: string): Promise<Plant[]> {
  return queryWithFallback<Plant[]>(
    async (client) => {
      let query = client.from('plants').select('*');
      if (plantId) {
        query = query.eq('id', plantId);
      }
      const { data, error } = await query;
      return { data: data as Plant[], error };
    },
    () => {
      const all = getPlantsSync();
      if (!plantId) return all;
      return all.filter((p) => p.id === plantId);
    },
    'getPlants'
  );
}

export async function getPlantById(id: string): Promise<Plant | undefined> {
  const plants = await getPlants(id);
  return plants.find((p) => p.id === id);
}

export async function getOnboardedPlants(plantId?: string, lineId?: string): Promise<Plant[]> {
  const plants = await getPlants(plantId, lineId);
  return plants.filter((p) => p.status === 'pilot' || p.status === 'shadow');
}

export function getPlantTimeZone(plantId: string): string {
  return PLANT_TIMEZONES[plantId] || 'UTC';
}
