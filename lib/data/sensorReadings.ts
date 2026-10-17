import { getSeedData } from './db';
import { SensorReading } from '../types';

export function getSensorReadingsForMachine(machineId: string, limit = 14): SensorReading[] {
  const data = getSeedData();
  const readings: SensorReading[] = (data.sensor_readings as unknown as SensorReading[]) || [];
  return readings
    .filter((r) => r.machine_id === machineId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);
}

export function getLatestReadingsMap(machineIds: string[]): Record<string, SensorReading> {
  const idSet = new Set(machineIds);
  const data = getSeedData();
  const readings: SensorReading[] = (data.sensor_readings as unknown as SensorReading[]) || [];
  const map: Record<string, SensorReading> = {};

  for (let i = readings.length - 1; i >= 0; i--) {
    const r = readings[i];
    if (idSet.has(r.machine_id) && !map[r.machine_id]) {
      map[r.machine_id] = r;
    }
  }

  return map;
}
