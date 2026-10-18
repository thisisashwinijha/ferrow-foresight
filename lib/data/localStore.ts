import seedData from '@/data/seed_data.json';
import { Alert, WorkOrder, Spares } from '../types';

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
  return inMemoryStore;
}

export function saveLocalStoreData(newData: any): void {
  inMemoryStore = newData;
  const fs = getFs();
  const path = getPath();
  if (fs && path) {
    try {
      const fullPath = path.resolve(process.cwd(), LOCAL_STATE_PATH);
      fs.writeFileSync(fullPath, JSON.stringify(newData, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not persist to data/local_state.json, kept in memory:', e);
    }
  }
}

export function resetLocalStoreData(): void {
  inMemoryStore = deepClone(seedData);
  const fs = getFs();
  const path = getPath();
  if (fs && path) {
    try {
      const fullPath = path.resolve(process.cwd(), LOCAL_STATE_PATH);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {
      console.warn('Could not remove data/local_state.json:', e);
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

export function addLocalWorkOrder(newWo: WorkOrder): WorkOrder {
  const store = getLocalStoreData();
  const workOrders: WorkOrder[] = (store.work_orders as unknown as WorkOrder[]) || [];
  workOrders.unshift(newWo);
  store.work_orders = workOrders;
  saveLocalStoreData(store);
  return newWo;
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
