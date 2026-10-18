import { getSeedData, queryWithFallback } from './db';
import { WorkOrder } from '../types';
import { getMachineByIdSync } from './machines';

export function getWorkOrdersSync(plantId?: string, lineId?: string): WorkOrder[] {
  const data = getSeedData();
  const orders: WorkOrder[] = (data.work_orders as unknown as WorkOrder[]) || [];
  return orders.filter((wo) => {
    if (plantId && wo.plant_id !== plantId) return false;
    if (lineId && lineId !== 'all') {
      const machine = getMachineByIdSync(wo.machine_id);
      if (machine?.line_id !== lineId) return false;
    }
    return true;
  });
}

export function getWorkOrderByIdSync(id: string): WorkOrder | undefined {
  const data = getSeedData();
  const orders: WorkOrder[] = (data.work_orders as unknown as WorkOrder[]) || [];
  return orders.find((wo) => wo.id === id);
}

export async function getWorkOrders(plantId: string, lineId?: string): Promise<WorkOrder[]> {
  return queryWithFallback<WorkOrder[]>(
    async (client) => {
      let query = client.from('work_orders').select('*');
      if (plantId) {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query;
      if (error || !data) return { data: null, error };

      let list = data as WorkOrder[];
      if (lineId && lineId !== 'all') {
        list = list.filter((wo) => {
          const machine = getMachineByIdSync(wo.machine_id);
          return machine?.line_id === lineId;
        });
      }
      return { data: list, error: null };
    },
    () => getWorkOrdersSync(plantId, lineId),
    'getWorkOrders'
  );
}

export async function getWorkOrderById(id: string, plantId?: string): Promise<WorkOrder | undefined> {
  return queryWithFallback<WorkOrder | undefined>(
    async (client) => {
      let query = client.from('work_orders').select('*').eq('id', id);
      if (plantId) {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query.single();
      return { data: data as WorkOrder, error };
    },
    () => getWorkOrderByIdSync(id),
    'getWorkOrderById'
  );
}
