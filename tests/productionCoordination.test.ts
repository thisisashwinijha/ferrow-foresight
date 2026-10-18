import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getLocalStoreData,
  resetLocalStoreData,
  mutateLocalWorkOrder,
  addLocalWorkOrder,
} from '@/lib/data/localStore';
import { getProductionScheduleSync } from '@/lib/data/production';
import { WorkOrder } from '@/lib/types';

describe('STEP 2: Production Coordination & Window Confirmation', () => {
  beforeEach(() => {
    resetLocalStoreData();
  });

  it('retrieves production schedule for 14-day window for P-07', () => {
    const schedule = getProductionScheduleSync('P-07');
    expect(schedule.length).toBeGreaterThan(0);

    const first = schedule[0];
    expect(first.line_id).toBeDefined();
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(['A', 'B', 'C']).toContain(first.shift.toUpperCase());
    expect(['run', 'changeover', 'low_load', 'planned_shutdown']).toContain(first.window_type);
  });

  it('allows Production Manager to confirm a window on a scheduled work order', () => {
    const newWo: WorkOrder = {
      id: 'WO-9901',
      alert_id: 'AL-1001',
      machine_id: 'P07-M03',
      plant_id: 'P-07',
      status: 'scheduled',
      priority: 'P1',
      assigned_technician: 'P07-T01',
      scheduled_window: {
        date: '2026-10-19',
        shift: 'A',
        line_id: 'P07-L1',
        window_type: 'changeover',
        production_loss_units: 0,
      },
      created_at: new Date().toISOString(),
    };
    addLocalWorkOrder(newWo);

    // Confirm window
    const confirmed = mutateLocalWorkOrder(newWo.id, {
      scheduled_window: {
        ...newWo.scheduled_window!,
        production_status: 'confirmed',
        reschedule_reason: null,
      },
    });

    expect(confirmed).toBeDefined();
    expect(confirmed?.scheduled_window?.production_status).toBe('confirmed');

    const store = getLocalStoreData();
    const stored = store.work_orders.find((w: any) => w.id === newWo.id);
    expect(stored.scheduled_window.production_status).toBe('confirmed');
  });

  it('allows Production Manager to request another window with a reason', () => {
    const newWo: WorkOrder = {
      id: 'WO-9902',
      alert_id: 'AL-1002',
      machine_id: 'P07-M04',
      plant_id: 'P-07',
      status: 'scheduled',
      priority: 'P2',
      assigned_technician: 'P07-T01',
      scheduled_window: {
        date: '2026-10-20',
        shift: 'B',
        line_id: 'P07-L1',
        window_type: 'run',
      },
      created_at: new Date().toISOString(),
    };
    addLocalWorkOrder(newWo);

    const reason = 'Order SO-26002 is high priority customer delivery; please reschedule to Sunday shutdown.';

    const updated = mutateLocalWorkOrder(newWo.id, {
      scheduled_window: {
        ...newWo.scheduled_window!,
        production_status: 'reschedule_requested',
        reschedule_reason: reason,
      },
    });

    expect(updated?.scheduled_window?.production_status).toBe('reschedule_requested');
    expect(updated?.scheduled_window?.reschedule_reason).toBe(reason);

    const store = getLocalStoreData();
    const stored = store.work_orders.find((w: any) => w.id === newWo.id);
    expect(stored.scheduled_window.production_status).toBe('reschedule_requested');
    expect(stored.scheduled_window.reschedule_reason).toBe(reason);
  });
});
