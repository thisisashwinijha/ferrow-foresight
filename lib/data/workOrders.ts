import { getSeedData, queryWithFallback } from './db';
import { WorkOrder } from '../types';
import { getMachineByIdSync } from './machines';
import { normalizeAlertShadowTechnician } from '../technicianAssignment';

export function getWorkOrdersSync(plantId?: string, lineId?: string): WorkOrder[] {
  const data = getSeedData();
  const orders: WorkOrder[] = (data.work_orders as unknown as WorkOrder[]) || [];
  return orders
    .filter((wo) => {
      if (plantId && plantId !== 'all' && wo.plant_id !== plantId) return false;
      if (lineId && lineId !== 'all') {
        const machine = getMachineByIdSync(wo.machine_id);
        if (machine?.line_id !== lineId) return false;
      }
      return true;
    })
    .map(normalizeAlertShadowTechnician);
}

export function getWorkOrderByIdSync(id: string): WorkOrder | undefined {
  if (!id) return undefined;
  const data = getSeedData();
  const orders: WorkOrder[] = (data.work_orders as unknown as WorkOrder[]) || [];
  const cleanId = id.trim().toLowerCase();
  const found = orders.find((wo) => {
    if (!wo || !wo.id) return false;
    const woClean = wo.id.trim().toLowerCase();
    return (
      wo.id === id ||
      woClean === cleanId ||
      woClean === `wo-${cleanId}` ||
      `wo-${woClean}` === cleanId
    );
  });
  return found ? normalizeAlertShadowTechnician(found) : undefined;
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
      const localOrders = getWorkOrdersSync(plantId, lineId);
      const localMap = new Map(localOrders.map((w) => [w.id, w]));
      const merged: WorkOrder[] = [];
      const seenIds = new Set<string>();
      for (const wo of list) {
        const local = localMap.get(wo.id);
        merged.push(local ? { ...wo, ...local } : wo);
        seenIds.add(wo.id);
      }
      for (const lo of localOrders) {
        if (!seenIds.has(lo.id)) {
          merged.unshift(lo);
          seenIds.add(lo.id);
        }
      }
      list = merged;

      if (lineId && lineId !== 'all') {
        list = list.filter((wo) => {
          const machine = getMachineByIdSync(wo.machine_id);
          return machine?.line_id === lineId;
        });
      }
      return { data: list.map(normalizeAlertShadowTechnician), error: null };
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
      const local = getWorkOrderByIdSync(id);
      if (error || !data || data.length === 0) {
        return { data: local ? normalizeAlertShadowTechnician(local) : null, error };
      }
      if (local) {
        return { data: normalizeAlertShadowTechnician({ ...(data[0] as WorkOrder), ...local }), error: null };
      }
      return { data: normalizeAlertShadowTechnician(data[0] as WorkOrder), error: null };
    },
    () => getWorkOrderByIdSync(id),
    'getWorkOrderById'
  );
}
