import { getSeedData } from './db';
import { Alert } from '../types';
import { getMachineById } from './machines';

export function getAlerts(plantId: string, lineId?: string): Alert[] {
  const data = getSeedData();
  const alerts: Alert[] = (data.alerts as unknown as Alert[]) || [];

  return alerts.filter((alert) => {
    // If plant_id is present on alert, match it; otherwise match through machine
    const machine = getMachineById(alert.machine_id);
    const alertPlant = alert.plant_id || machine?.plant_id;
    if (alertPlant !== plantId) return false;

    if (lineId && lineId !== 'all') {
      const machineLine = machine?.line_id;
      const windowLine = alert.proposed_window?.line_id;
      if (machineLine !== lineId && windowLine !== lineId) return false;
    }

    return true;
  });
}

export function getAlertById(id: string): Alert | undefined {
  const data = getSeedData();
  const alerts: Alert[] = (data.alerts as unknown as Alert[]) || [];
  return alerts.find((a) => a.id === id);
}

export function getPendingApprovals(plantId: string): Alert[] {
  const alerts = getAlerts(plantId);
  return alerts.filter((a) => a.status === 'pending' || a.status === 'needs_review');
}
