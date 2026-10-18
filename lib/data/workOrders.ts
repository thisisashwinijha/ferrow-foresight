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
  if (!id) return undefined;
  const data = getSeedData();
  const orders: WorkOrder[] = (data.work_orders as unknown as WorkOrder[]) || [];
  const cleanId = id.trim().toLowerCase();
  return orders.find((wo) => {
    if (!wo || !wo.id) return false;
    const woClean = wo.id.trim().toLowerCase();
    return (
      wo.id === id ||
      woClean === cleanId ||
      woClean === `wo-${cleanId}` ||
      `wo-${woClean}` === cleanId
    );
  });
}

export async function getWorkOrders(plantId: string, lineId?: string): Promise<WorkOrder[]> {
  return queryWithFallback<WorkOrder[]>(
    async (client) => {
      let query = client.from('work_orders').select('*');
      if (plantId && plantId !== 'all') {
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
  if (!id) return undefined;
  const cleanId = id.trim();
  const prefixedId = cleanId.toUpperCase().startsWith('WO-') ? cleanId : `WO-${cleanId}`;

  return queryWithFallback<WorkOrder | undefined>(
    async (client) => {
      let query = client.from('work_orders').select('*');
      if (cleanId === prefixedId) {
        query = query.or(`id.eq.${cleanId},id.ilike.${cleanId}`);
      } else {
        query = query.or(`id.eq.${cleanId},id.ilike.${cleanId},id.eq.${prefixedId},id.ilike.${prefixedId}`);
      }
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query.limit(1);
      if (error || !data || data.length === 0) {
        return { data: null, error };
      }
      return { data: data[0] as WorkOrder, error: null };
    },
    () => getWorkOrderByIdSync(id),
    'getWorkOrderById'
  );
}
