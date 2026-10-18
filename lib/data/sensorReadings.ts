import { getSeedData, queryWithFallback } from './db';
import { SensorReading } from '../types';

export function getSensorReadingsForMachineSync(machineId: string, limit = 14): SensorReading[] {
  const data = getSeedData();
  const readings: SensorReading[] = (data.sensor_readings as unknown as SensorReading[]) || [];
  return readings
    .filter((r) => r.machine_id === machineId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);
}

export function getLatestReadingsMapSync(machineIds: string[]): Record<string, SensorReading> {
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

export async function getSensorReadings(
  plantId?: string,
  lineId?: string,
  machineId?: string,
  limit = 14
): Promise<SensorReading[]> {
  return queryWithFallback<SensorReading[]>(
    async (client) => {
      let query = client.from('sensor_readings').select('*');
      if (machineId) {
        query = query.eq('machine_id', machineId);
      }
      const { data, error } = await query.order('date', { ascending: true });
      if (error || !data) return { data: null, error };
      const slice = (data as SensorReading[]).slice(-limit);
      return { data: slice, error: null };
    },
    () => (machineId ? getSensorReadingsForMachineSync(machineId, limit) : []),
    'getSensorReadings'
  );
}

export async function getSensorReadingsForMachine(machineId: string, limit = 14): Promise<SensorReading[]> {
  return getSensorReadings(undefined, undefined, machineId, limit);
}
