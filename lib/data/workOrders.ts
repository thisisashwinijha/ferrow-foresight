import { getSeedData } from './db';
import { WorkOrder } from '../types';

export function getWorkOrders(plantId: string): WorkOrder[] {
  const data = getSeedData();
  const orders: WorkOrder[] = (data.work_orders as unknown as WorkOrder[]) || [];
  return orders.filter((wo) => wo.plant_id === plantId);
}

export function getWorkOrderById(id: string): WorkOrder | undefined {
  const data = getSeedData();
  const orders: WorkOrder[] = (data.work_orders as unknown as WorkOrder[]) || [];
  return orders.find((wo) => wo.id === id);
}
