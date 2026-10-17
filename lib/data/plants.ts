import { getSeedData } from './db';
import { Plant } from '../types';

export const PLANT_TIMEZONES: Record<string, string> = {
  'P-07': 'Asia/Kolkata',
  'P-03': 'Europe/Berlin',
  'P-12': 'America/Monterrey',
  'P-21': 'Asia/Shanghai',
};

export function getPlants(): Plant[] {
  const data = getSeedData();
  return (data.plants as unknown as Plant[]) || [];
}

export function getPlantById(id: string): Plant | undefined {
  const plants = getPlants();
  return plants.find((p) => p.id === id);
}

export function getOnboardedPlants(): Plant[] {
  const plants = getPlants();
  return plants.filter((p) => p.status === 'pilot' || p.status === 'shadow');
}

export function getPlantTimeZone(plantId: string): string {
  return PLANT_TIMEZONES[plantId] || 'UTC';
}
