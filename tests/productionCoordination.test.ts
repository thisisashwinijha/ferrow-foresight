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
    const newWo: any = {
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
    const newWo: any = {
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

  it('POST /api/work-orders/[id]/window confirms window for exact, lowercase, and numeric ID formats', async () => {
    const { POST: windowRoute } = await import('@/app/api/work-orders/[id]/window/route');
    const { NextRequest } = await import('next/server');

    // 1. Exact ID
    const req1 = new NextRequest('http://localhost:3000/api/work-orders/WO-2201/window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', confirmed_by: 'Production Manager' }),
    });
    const res1 = await windowRoute(req1, { params: { id: 'WO-2201' } });
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.success).toBe(true);
    expect(json1.workOrder.scheduled_window.production_status).toBe('confirmed');

    // 2. Lowercase ID
    const req2 = new NextRequest('http://localhost:3000/api/work-orders/wo-2201/window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res2 = await windowRoute(req2, { params: { id: 'wo-2201' } });
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.success).toBe(true);

    // 3. Numeric ID (without WO- prefix)
    const req3 = new NextRequest('http://localhost:3000/api/work-orders/2201/window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res3 = await windowRoute(req3, { params: { id: '2201' } });
    expect(res3.status).toBe(200);
    const json3 = await res3.json();
    expect(json3.success).toBe(true);
  });

  it('POST /api/work-orders/[id]/window handles request-another-window and request_reschedule with validation', async () => {
    const { POST: windowRoute } = await import('@/app/api/work-orders/[id]/window/route');
    const { NextRequest } = await import('next/server');

    // Reschedule with reason
    const req = new NextRequest('http://localhost:3000/api/work-orders/WO-2201/window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_another_window',
        reason: 'Conflict with export batch run on Line 1',
      }),
    });
    const res = await windowRoute(req, { params: { id: 'WO-2201' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.workOrder.scheduled_window.production_status).toBe('reschedule_requested');
    expect(json.workOrder.scheduled_window.reschedule_reason).toContain('Conflict with export batch');

    // Reschedule without reason returns 400
    const invalidReq = new NextRequest('http://localhost:3000/api/work-orders/WO-2201/window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_reschedule', reason: '' }),
    });
    const invalidRes = await windowRoute(invalidReq, { params: { id: 'WO-2201' } });
    expect(invalidRes.status).toBe(400);

    // Nonexistent ID returns 404
    const notFoundReq = new NextRequest('http://localhost:3000/api/work-orders/WO-999999/window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    });
    const notFoundRes = await windowRoute(notFoundReq, { params: { id: 'WO-999999' } });
    expect(notFoundRes.status).toBe(404);
  });
});
