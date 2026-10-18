import { getSeedData, queryWithFallback } from './db';
import { Alert } from '../types';
import { getMachineByIdSync } from './machines';

export function getAlertsSync(plantId?: string, lineId?: string): Alert[] {
  const data = getSeedData();
  const alerts: Alert[] = (data.alerts as unknown as Alert[]) || [];

  return alerts.filter((alert) => {
    const machine = getMachineByIdSync(alert.machine_id);
    const alertPlant = alert.plant_id || machine?.plant_id;
    if (plantId && alertPlant !== plantId) return false;

    if (lineId && lineId !== 'all') {
      const machineLine = machine?.line_id;
      const windowLine = alert.proposed_window?.line_id;
      if (machineLine !== lineId && windowLine !== lineId) return false;
    }

    return true;
  });
}

export function getAlertByIdSync(id: string): Alert | undefined {
  const data = getSeedData();
  const alerts: Alert[] = (data.alerts as unknown as Alert[]) || [];
  return alerts.find((a) => a.id === id);
}

export async function getAlerts(plantId: string, lineId?: string): Promise<Alert[]> {
  return queryWithFallback<Alert[]>(
    async (client) => {
      let query = client.from('alerts').select('*');
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query;
      if (error || !data) return { data: null, error };

      let filtered = data as Alert[];
      const localAlerts = getAlertsSync(plantId, lineId);
      const existingIds = new Set(filtered.map((a) => a.id));
      for (const la of localAlerts) {
        if (!existingIds.has(la.id)) {
          filtered.unshift(la);
        }
      }

      if (lineId && lineId !== 'all') {
        filtered = filtered.filter((a) => {
          const windowLine = a.proposed_window?.line_id;
          const machine = getMachineByIdSync(a.machine_id);
          return windowLine === lineId || machine?.line_id === lineId;
        });
      }
      return { data: filtered, error: null };
    },
    () => getAlertsSync(plantId, lineId),
    'getAlerts'
  );
}

export async function getAlertById(id: string, plantId?: string): Promise<Alert | undefined> {
  return queryWithFallback<Alert | undefined>(
    async (client) => {
      let query = client.from('alerts').select('*').eq('id', id);
      if (plantId && plantId !== 'all') {
        query = query.eq('plant_id', plantId);
      }
      const { data, error } = await query.maybeSingle();
      if (!data) {
        const local = getAlertByIdSync(id);
        return { data: local || null, error: null };
      }
      return { data: (data as Alert) || undefined, error };
    },
    () => getAlertByIdSync(id),
    'getAlertById'
  );
}

export async function getPendingApprovals(plantId: string, lineId?: string): Promise<Alert[]> {
  const alerts = await getAlerts(plantId, lineId);
  return alerts.filter((a) => a.status === 'pending' || a.status === 'needs_review');
}
