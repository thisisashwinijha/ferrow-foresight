import { getSeedData } from './db';
import { Machine } from '../types';

export function getMachines(plantId: string, lineId?: string): Machine[] {
  const data = getSeedData();
  const machines: Machine[] = (data.machines as unknown as Machine[]) || [];
  return machines.filter((m) => {
    if (m.plant_id !== plantId) return false;
    if (lineId && lineId !== 'all' && m.line_id !== lineId) return false;
    return true;
  });
}

export function getMachineById(id: string): Machine | undefined {
  const data = getSeedData();
  const machines: Machine[] = (data.machines as unknown as Machine[]) || [];
  return machines.find((m) => m.id === id);
}

export function getAllMachines(): Machine[] {
  const data = getSeedData();
  return (data.machines as unknown as Machine[]) || [];
}
