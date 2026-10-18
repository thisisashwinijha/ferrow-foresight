import { getSeedData, queryWithFallback } from './db';
import { Machine } from '../types';

export function getMachinesSync(plantId?: string, lineId?: string): Machine[] {
  const data = getSeedData();
  const machines: Machine[] = (data.machines as unknown as Machine[]) || [];
  return machines.filter((m) => {
    if (plantId && plantId !== 'all' && m.plant_id !== plantId) return false;
    if (lineId && lineId !== 'all' && m.line_id !== lineId) return false;
    return true;
  });
}

export function getMachineByIdSync(id: string): Machine | undefined {
  const data = getSeedData();
  const machines: Machine[] = (data.machines as unknown as Machine[]) || [];
  return machines.find((m) => m.id === id);
}

export async function getMachines(plantId: string, lineId?: string): Promise<Machine[]> {
  return queryWithFallback<Machine[]>(
    async (client) => {
      let query = client.from('machines').select('*');
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      if (lineId && lineId !== 'all') {
        query = query.eq('line_id', lineId);
      }
      const { data, error } = await query;
      return { data: data as Machine[], error };
    },
    () => getMachinesSync(plantId, lineId),
    'getMachines'
  );
}

export async function getMachineById(id: string, plantId?: string): Promise<Machine | undefined> {
  return queryWithFallback<Machine | undefined>(
    async (client) => {
      let query = client.from('machines').select('*').eq('id', id);
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query.maybeSingle();
      return { data: (data as Machine) || undefined, error };
    },
    () => getMachineByIdSync(id),
    'getMachineById'
  );
}

export async function getAllMachines(plantId?: string, lineId?: string): Promise<Machine[]> {
  return queryWithFallback<Machine[]>(
    async (client) => {
      let query = client.from('machines').select('*');
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      if (lineId && lineId !== 'all') {
        query = query.eq('line_id', lineId);
      }
      const { data, error } = await query;
      return { data: data as Machine[], error };
    },
    () => getMachinesSync(plantId, lineId),
    'getAllMachines'
  );
}
