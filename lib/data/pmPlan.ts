import { getSeedData, queryWithFallback } from './db';
import { PmPlan } from '../types';
import { getMachineByIdSync } from './machines';

export function getPmPlansSync(plantId?: string, lineId?: string, machineId?: string): PmPlan[] {
  const data = getSeedData();
  const plans: PmPlan[] = (data.pm_plan as unknown as PmPlan[]) || [];
  return plans.filter((p) => {
    if (machineId && p.machine_id !== machineId) return false;
    if ((plantId && plantId !== 'all') || (lineId && lineId !== 'all')) {
      const machine = getMachineByIdSync(p.machine_id);
      if (plantId && plantId !== 'all' && machine?.plant_id !== plantId) return false;
      if (lineId && lineId !== 'all' && machine?.line_id !== lineId) return false;
    }
    return true;
  });
}

export async function getPmPlans(
  plantId?: string,
  lineId?: string,
  machineId?: string
): Promise<PmPlan[]> {
  return queryWithFallback<PmPlan[]>(
    async (client) => {
      let query = client.from('pm_plan').select('*');
      if (machineId) {
        query = query.eq('machine_id', machineId);
      }
      const { data, error } = await query;
      if (error || !data) return { data: null, error };

      let list = data as PmPlan[];
      if ((plantId && plantId !== 'all') || (lineId && lineId !== 'all')) {
        list = list.filter((p) => {
          const machine = getMachineByIdSync(p.machine_id);
          if (plantId && plantId !== 'all' && machine?.plant_id !== plantId) return false;
          if (lineId && lineId !== 'all' && machine?.line_id !== lineId) return false;
          return true;
        });
      }
      return { data: list, error: null };
    },
    () => getPmPlansSync(plantId, lineId, machineId),
    'getPmPlans'
  );
}
