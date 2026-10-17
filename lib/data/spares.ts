import { getSeedData } from './db';
import { Spares } from '../types';

export function getSpares(plantId: string): Spares[] {
  const data = getSeedData();
  const spares: Spares[] = data.spares || [];
  return spares.filter((s) => s.plant_id === plantId);
}

export function getSpareById(id: string): Spares | undefined {
  const data = getSeedData();
  const spares: Spares[] = data.spares || [];
  return spares.find((s) => s.id === id);
}
