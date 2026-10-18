import { getSeedData, queryWithFallback } from './db';
import { MaintenanceLog } from '../types';
import { getMachineByIdSync } from './machines';

export function getMaintenanceLogsSync(
  plantId?: string,
  lineId?: string,
  machineId?: string
): MaintenanceLog[] {
  const data = getSeedData();
  const logs: MaintenanceLog[] = (data.maintenance_log as unknown as MaintenanceLog[]) || [];

  return logs.filter((log) => {
    if (machineId && log.machine_id !== machineId) return false;

    if (plantId || (lineId && lineId !== 'all')) {
      const machine = getMachineByIdSync(log.machine_id);
      if (plantId && machine?.plant_id !== plantId) return false;
      if (lineId && lineId !== 'all' && machine?.line_id !== lineId) return false;
    }

    return true;
  });
}

export async function getMaintenanceLogs(
  plantId: string,
  lineId?: string,
  machineId?: string
): Promise<MaintenanceLog[]> {
  return queryWithFallback<MaintenanceLog[]>(
    async (client) => {
      let query = client.from('maintenance_log').select('*');
      if (machineId) {
        query = query.eq('machine_id', machineId);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error || !data) return { data: null, error };

      let list = data as MaintenanceLog[];
      if (plantId || (lineId && lineId !== 'all')) {
        list = list.filter((log) => {
          const machine = getMachineByIdSync(log.machine_id);
          if (plantId && machine?.plant_id !== plantId) return false;
          if (lineId && lineId !== 'all' && machine?.line_id !== lineId) return false;
          return true;
        });
      }
      return { data: list, error: null };
    },
    () => getMaintenanceLogsSync(plantId, lineId, machineId),
    'getMaintenanceLogs'
  );
}
