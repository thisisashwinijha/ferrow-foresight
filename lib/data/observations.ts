import { getSeedData } from './db';
import { Observation } from '../types';

export function getObservations(plantId: string, machineId?: string): Observation[] {
  const data = getSeedData();
  const obs: Observation[] = data.observations || [];
  return obs.filter((o) => {
    if (o.plant_id !== plantId) return false;
    if (machineId && o.machine_id !== machineId) return false;
    return true;
  });
}
