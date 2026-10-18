import { getSeedData, queryWithFallback } from './db';
import { Observation } from '../types';
import { getMachineByIdSync } from './machines';

export function getObservationsSync(
  plantId?: string,
  lineId?: string,
  machineId?: string
): Observation[] {
  const data = getSeedData();
  const obs: Observation[] = data.observations || [];
  return obs.filter((o) => {
    if (plantId && o.plant_id !== plantId) return false;
    if (machineId && o.machine_id !== machineId) return false;
    if (lineId && lineId !== 'all') {
      const machine = getMachineByIdSync(o.machine_id);
      if (machine?.line_id !== lineId) return false;
    }
    return true;
  });
}

export async function getObservations(
  plantId: string,
  lineId?: string,
  machineId?: string
): Promise<Observation[]> {
  return queryWithFallback<Observation[]>(
    async (client) => {
      let query = client.from('observations').select('*');
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      if (machineId) {
        query = query.eq('machine_id', machineId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error || !data) return { data: null, error };

      let list = data as Observation[];
      if (lineId && lineId !== 'all') {
        list = list.filter((o) => {
          const machine = getMachineByIdSync(o.machine_id);
          return machine?.line_id === lineId;
        });
      }
      return { data: list, error: null };
    },
    () => getObservationsSync(plantId, lineId, machineId),
    'getObservations'
  );
}
