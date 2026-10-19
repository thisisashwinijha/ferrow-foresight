import seedData from '@/data/seed_data.json';
import { Alert, WorkOrder, Spares, Machine, Observation, MaintenanceLog, PmPlan, KnowledgeLibrary } from '../types';
import { getBaselineRiskScore, getBaselineHealthScore } from '../lifecycle';
import { normalizeSeededWorkOrders } from '../workflow';

let inMemoryStore: any = null;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function getFs() {
  if (typeof window === 'undefined') {
    try {
      return require('fs');
    } catch {
      return null;
    }
  }
  return null;
}

function getPath() {
  if (typeof window === 'undefined') {
    try {
      return require('path');
    } catch {
      return null;
    }
  }
  return null;
}

const LOCAL_STATE_PATH = 'data/local_state.json';

export function getLocalStoreData(): any {
  if (inMemoryStore) {
    return inMemoryStore;
  }

  const fs = getFs();
  const path = getPath();
  if (fs && path) {
    try {
      const fullPath = path.resolve(process.cwd(), LOCAL_STATE_PATH);
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        inMemoryStore = JSON.parse(raw);
        return inMemoryStore;
      }
    } catch (e) {
      console.warn('Could not read data/local_state.json, falling back to seed_data.json:', e);
    }
  }

  inMemoryStore = deepClone(seedData);
  if (inMemoryStore.work_orders) {
    inMemoryStore.work_orders = normalizeSeededWorkOrders(inMemoryStore.work_orders);
  }
  return inMemoryStore;
}

export function saveLocalStoreData(newData: any): void {
  inMemoryStore = newData;
  const fs = getFs();
  const path = getPath();
  if (fs && path) {
    try {
      const fullPath = path.resolve(process.cwd(), LOCAL_STATE_PATH);
      const tempPath = `${fullPath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(newData, null, 2), 'utf-8');
      fs.renameSync(tempPath, fullPath);
    } catch (e) {
      console.warn('Could not write data/local_state.json:', e);
    }
  }
}

export function resetLocalStoreData(): void {
  inMemoryStore = deepClone(seedData);
  if (inMemoryStore.work_orders) {
    inMemoryStore.work_orders = normalizeSeededWorkOrders(inMemoryStore.work_orders);
  }
  const fs = getFs();
  const path = getPath();
  if (fs && path) {
    try {
      const fullPath = path.resolve(process.cwd(), LOCAL_STATE_PATH);
      if (fs.existsSync(fullPath)) {
        try {
          fs.rmSync(fullPath, { force: true });
        } catch {}
      }
    } catch (e) {
      console.warn('Could not remove data/local_state.json on reset:', e);
    }
  }
}

export function mutateLocalAlert(
  alertId: string,
  updates: Partial<Alert>
): Alert | null {
  const store = getLocalStoreData();
  const alerts: Alert[] = (store.alerts as unknown as Alert[]) || [];
  const index = alerts.findIndex((a) => a.id === alertId);
  if (index === -1) return null;

  alerts[index] = { ...alerts[index], ...updates };
  store.alerts = alerts;
  saveLocalStoreData(store);
  return alerts[index];
}

export function addLocalAlert(newAlert: Alert): Alert {
  const store = getLocalStoreData();
  const alerts: Alert[] = (store.alerts as unknown as Alert[]) || [];
  alerts.unshift(newAlert);
  store.alerts = alerts;
  saveLocalStoreData(store);
  return newAlert;
}

export function addLocalWorkOrder(newWo: WorkOrder): WorkOrder {
  const store = getLocalStoreData();
  const workOrders: WorkOrder[] = (store.work_orders as unknown as WorkOrder[]) || [];
  workOrders.unshift(newWo);
  store.work_orders = workOrders;
  saveLocalStoreData(store);
  return newWo;
}

export function mutateLocalWorkOrder(
  woId: string,
  updates: Partial<WorkOrder>
): WorkOrder | null {
  const store = getLocalStoreData();
  const workOrders: WorkOrder[] = (store.work_orders as unknown as WorkOrder[]) || [];
  const cleanId = (woId || '').trim().toLowerCase();
  const index = workOrders.findIndex((w) => {
    if (!w || !w.id) return false;
    const wClean = w.id.trim().toLowerCase();
    return (
      w.id === woId ||
      wClean === cleanId ||
      wClean === `wo-${cleanId}` ||
      `wo-${wClean}` === cleanId
    );
  });
  if (index === -1) return null;

  workOrders[index] = { ...workOrders[index], ...updates };
  store.work_orders = workOrders;
  saveLocalStoreData(store);
  return workOrders[index];
}

export function reserveLocalSpares(
  sparesList: Array<{ part_id: string; qty?: number }>
): void {
  const store = getLocalStoreData();
  const spares: Spares[] = (store.spares as unknown as Spares[]) || [];

  for (const item of sparesList) {
    const qty = item.qty || 1;
    const match = spares.find((s) => s.id === item.part_id);
    if (match) {
      match.stock = Math.max(0, match.stock - qty);
      match.reserved = (match.reserved || 0) + qty;
    }
  }

  store.spares = spares;
  saveLocalStoreData(store);
}

export function addLocalObservation(newObs: Observation): Observation {
  const store = getLocalStoreData();
  const observations: Observation[] = (store.observations as unknown as Observation[]) || [];
  observations.unshift(newObs);
  store.observations = observations;
  saveLocalStoreData(store);
  return newObs;
}

export function addLocalMaintenanceLog(newLog: MaintenanceLog): MaintenanceLog {
  const store = getLocalStoreData();
  const logs: MaintenanceLog[] = (store.maintenance_log as unknown as MaintenanceLog[]) || [];
  logs.unshift(newLog);
  store.maintenance_log = logs;
  saveLocalStoreData(store);
  return newLog;
}

export function closeLocalWorkOrder(
  woIdOrPayload:
    | string
    | {
        work_order_id: string;
        machine_id?: string;
        plant_id?: string;
        alert_id?: string;
        root_cause: string;
        closure_notes: string;
        actual_downtime_hours?: number;
        downtime_hours?: number;
        parts_used?: Array<{ part_id?: string; spare_id?: string; qty?: number; quantity?: number }>;
        closed_by?: string;
      },
  closureArg?: {
    root_cause: string;
    closure_notes: string;
    downtime_hours?: number;
    actual_downtime_hours?: number;
    parts_used?: Array<{ part_id?: string; spare_id?: string; qty?: number; quantity?: number }>;
  }
): {
  success: boolean;
  workOrder: WorkOrder;
  machine: Machine;
  log: MaintenanceLog;
} | null {
  const woId = typeof woIdOrPayload === 'string' ? woIdOrPayload : woIdOrPayload.work_order_id;
  const closure =
    typeof woIdOrPayload === 'string'
      ? {
          root_cause: closureArg?.root_cause || '',
          closure_notes: closureArg?.closure_notes || '',
          downtime_hours: closureArg?.actual_downtime_hours ?? closureArg?.downtime_hours ?? 1,
          parts_used: closureArg?.parts_used,
        }
      : {
          root_cause: woIdOrPayload.root_cause || '',
          closure_notes: woIdOrPayload.closure_notes || '',
          downtime_hours: woIdOrPayload.actual_downtime_hours ?? woIdOrPayload.downtime_hours ?? 1,
          parts_used: woIdOrPayload.parts_used,
        };

  const store = getLocalStoreData();
  const workOrders: WorkOrder[] = (store.work_orders as unknown as WorkOrder[]) || [];
  const woIndex = workOrders.findIndex((w) => w.id === woId);
  if (woIndex === -1) return null;

  const wo = workOrders[woIndex];
  const now = new Date().toISOString();

  // 1. Update Work Order
  wo.status = 'closed';
  wo.closed_at = now;
  wo.root_cause = closure.root_cause;
  wo.closure_notes = closure.closure_notes;
  wo.downtime_hours = closure.downtime_hours;
  workOrders[woIndex] = wo;
  store.work_orders = workOrders;

  // 2. Resolve related alert
  const alerts: Alert[] = (store.alerts as unknown as Alert[]) || [];
  const alertIndex = alerts.findIndex((a) => a.id === wo.alert_id);
  let alertFailureMode = 'Component failure';
  if (alertIndex !== -1) {
    alerts[alertIndex].status = 'resolved'; // Resolved alert
    alertFailureMode = alerts[alertIndex].failure_mode || alertFailureMode;
    store.alerts = alerts;
  }

  // 3. Deduct stock and reserved spares used
  const spares: Spares[] = (store.spares as unknown as Spares[]) || [];
  const partsToDeduct = closure.parts_used || wo.spares_reserved || [];
  for (const p of partsToDeduct) {
    const qty = (p as any).qty || (p as any).quantity || 1;
    const partId = (p as any).part_id || (p as any).spare_id || (p as any).id;
    const match = spares.find((s) => s.id === partId);
    if (match) {
      match.stock = Math.max(0, match.stock - qty);
      match.reserved = Math.max(0, (match.reserved || 0) - qty);
    }
  }
  store.spares = spares;

  // 4. Restore Machine status and reset risk score to baseline
  const machines: Machine[] = (store.machines as unknown as Machine[]) || [];
  const machIndex = machines.findIndex((m) => m.id === wo.machine_id);
  let updatedMachine: Machine | null = null;
  if (machIndex !== -1) {
    const m = machines[machIndex];
    m.status = 'running';
    m.risk_score = getBaselineRiskScore(m.criticality);
    m.health_score = getBaselineHealthScore(m.criticality);
    machines[machIndex] = m;
    store.machines = machines;
    updatedMachine = m;
  }

  // 5. Add Maintenance Log entry
  const logs: MaintenanceLog[] = (store.maintenance_log as unknown as MaintenanceLog[]) || [];
  const newLog: MaintenanceLog = {
    id: `ML-${Date.now().toString().slice(-6)}`,
    machine_id: wo.machine_id,
    date: now.slice(0, 10),
    type: 'CBM',
    finding: 'fault_found',
    failure_mode: alertFailureMode,
    downtime_hours: closure.downtime_hours,
    unplanned: false,
    technician_id: wo.assigned_technician || 'P07-T01',
    notes: closure.closure_notes,
    cost_usd: Math.round(closure.downtime_hours * 250 + 400),
  };
  logs.unshift(newLog);
  store.maintenance_log = logs;

  saveLocalStoreData(store);

  return {
    success: true,
    workOrder: wo,
    machine: updatedMachine as Machine,
    log: newLog,
  };
}

export function mutateLocalPmPlan(
  pmId: string,
  updates: Partial<PmPlan>
): PmPlan | null {
  const store = getLocalStoreData();
  const plans: PmPlan[] = (store.pm_plan as unknown as PmPlan[]) || [];
  const index = plans.findIndex((p) => p.id === pmId);
  if (index === -1) return null;

  plans[index] = { ...plans[index], ...updates };
  store.pm_plan = plans;
  saveLocalStoreData(store);
  return plans[index];
}

export function mutateLocalKnowledgeEntry(
  klId: string,
  updates: Partial<KnowledgeLibrary>
): KnowledgeLibrary | null {
  const store = getLocalStoreData();
  const klList: KnowledgeLibrary[] = (store.knowledge_library as unknown as KnowledgeLibrary[]) || [];
  const index = klList.findIndex((k) => k.id === klId);
  if (index === -1) return null;

  klList[index] = { ...klList[index], ...updates };
  store.knowledge_library = klList;
  saveLocalStoreData(store);
  return klList[index];
}

