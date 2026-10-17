import { getSeedData } from './db';
import { ProductionSchedule } from '../types';

export function getProductionSchedule(lineId?: string): ProductionSchedule[] {
  const data = getSeedData();
  const schedule: ProductionSchedule[] = (data.production_schedule as unknown as ProductionSchedule[]) || [];
  if (lineId) {
    return schedule.filter((s) => s.line_id === lineId);
  }
  return schedule;
}
