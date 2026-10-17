import { getSeedData } from './db';
import { PmPlan } from '../types';

export function getPmPlans(machineId?: string): PmPlan[] {
  const data = getSeedData();
  const plans: PmPlan[] = (data.pm_plan as unknown as PmPlan[]) || [];
  if (machineId) {
    return plans.filter((p) => p.machine_id === machineId);
  }
  return plans;
}
