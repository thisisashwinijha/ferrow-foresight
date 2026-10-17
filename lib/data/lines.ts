import { getSeedData } from './db';
import { Line } from '../types';

export function getLines(plantId?: string): Line[] {
  const data = getSeedData();
  const lines: Line[] = data.lines || [];
  if (plantId) {
    return lines.filter((l) => l.plant_id === plantId);
  }
  return lines;
}

export function getLineById(id: string): Line | undefined {
  const lines = getLines();
  return lines.find((l) => l.id === id);
}
