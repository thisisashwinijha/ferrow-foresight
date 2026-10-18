import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalStoreData,
  mutateLocalAlert,
  addLocalWorkOrder,
  reserveLocalSpares,
  resetLocalStoreData,
} from '../lib/data/localStore';
import { queryWithFallback } from '../lib/data/db';
import { STANDARD_LOTO_CHECKLIST } from '../lib/guardrails';
import { WorkOrder } from '../lib/types';

describe('Data Layer & Resilience Backends', () => {
  beforeEach(() => {
    resetLocalStoreData();
  });

  it('reads baseline seed data when local store is initialized', () => {
    const data = getLocalStoreData();
    expect(data.plants.length).toBeGreaterThan(0);
    expect(data.machines.length).toBeGreaterThan(0);
    expect(data.alerts.length).toBeGreaterThan(0);
  });

  it('mutates alert locally and retains modification in local store', () => {
    const updated = mutateLocalAlert('AL-1001', {
      status: 'approved',
      decided_by: 'Plant Head',
      decision_reason: 'Approved for Sunday shutdown',
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('approved');
    expect(updated?.decided_by).toBe('Plant Head');

    // Verify persisted in store
    const store = getLocalStoreData();
    const storedAlert = store.alerts.find((a: any) => a.id === 'AL-1001');
    expect(storedAlert?.status).toBe('approved');
  });

  it('adds work order with LOTO checklist and task steps to local store', () => {
    const newWo: WorkOrder = {
      id: 'WO-9999',
      alert_id: 'AL-1001',
      machine_id: 'P07-M03',
      plant_id: 'P-07',
      type: 'CBM',
      priority: 'P1',
      status: 'scheduled',
      assigned_technician: 'P07-T01',
      shadow_technician: 'P07-T07',
      scheduled_window: {
        date: '2026-10-18',
        shift: 'A',
        window_type: 'planned_shutdown',
      },
      spares_reserved: [{ part_id: 'SP-003', qty: 1 }],
      checklist: [
        ...STANDARD_LOTO_CHECKLIST,
        { step: 'Replace gearbox output bearing', done: false, type: 'task' },
      ],
      loto_permit_no: 'LOTO-P07-M03-9999',
      closure_notes: null,
      root_cause: null,
      downtime_hours: null,
      created_at: new Date().toISOString(),
      closed_at: null,
    };

    addLocalWorkOrder(newWo);
    const store = getLocalStoreData();
    const found = store.work_orders.find((w: any) => w.id === 'WO-9999');
    expect(found).toBeDefined();
    expect(found?.checklist).toHaveLength(7);
  });

  it('reserves spares and decreases available stock count', () => {
    const storeBefore = getLocalStoreData();
    const targetSpare = storeBefore.spares.find((s: any) => s.id === 'P07-SP-003');
    const initialStock = targetSpare.stock;
    const initialReserved = targetSpare.reserved || 0;

    reserveLocalSpares([{ part_id: 'P07-SP-003', qty: 1 }]);

    const storeAfter = getLocalStoreData();
    const updatedSpare = storeAfter.spares.find((s: any) => s.id === 'P07-SP-003');
    expect(updatedSpare.stock).toBe(Math.max(0, initialStock - 1));
    expect(updatedSpare.reserved).toBe(initialReserved + 1);
  });

  it('resetLocalStoreData restores state to seed baseline', () => {
    mutateLocalAlert('AL-1001', { status: 'rejected', decision_reason: 'Test rejection' });
    resetLocalStoreData();

    const cleanStore = getLocalStoreData();
    const restoredAlert = cleanStore.alerts.find((a: any) => a.id === 'AL-1001');
    expect(restoredAlert.status).toBe('pending');
  });

  it('queryWithFallback gracefully falls back to seed data on error without throwing', async () => {
    const fallbackValue = [{ id: 'mock-plant' }];
    const result = await queryWithFallback(
      async () => {
        throw new Error('Simulated network timeout');
      },
      () => fallbackValue,
      'test-fallback'
    );

    expect(result).toEqual(fallbackValue);
  });
});
