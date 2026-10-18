import { NextRequest, NextResponse } from 'next/server';
import { getWorkOrderById, getWorkOrderByIdSync } from '@/lib/data/workOrders';
import { mutateLocalWorkOrder, getLocalStoreData, saveLocalStoreData } from '@/lib/data/localStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = decodeURIComponent(params.id || '').trim();
    if (!rawId) {
      return NextResponse.json(
        { success: false, error: 'Work order ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 1. Comprehensive lookup across Supabase and local/seed backends
    let wo = await getWorkOrderById(rawId);
    if (!wo) {
      wo = getWorkOrderByIdSync(rawId);
    }
    if (!wo) {
      const store = getLocalStoreData();
      const workOrders = (store.work_orders as any[]) || [];
      const clean = rawId.toLowerCase();
      wo = workOrders.find((w: any) => {
        if (!w || !w.id) return false;
        const wClean = (w.id || '').trim().toLowerCase();
        return (
          wClean === clean ||
          wClean === `wo-${clean}` ||
          `wo-${wClean}` === clean
        );
      });
    }

    // Direct Supabase fallback if admin client is available
    if (!wo) {
      try {
        const { getSupabaseAdminClient } = await import('@/lib/supabaseAdmin');
        const admin = getSupabaseAdminClient();
        if (admin) {
          const { data } = await admin
            .from('work_orders')
            .select('*')
            .or(`id.eq.${rawId},id.ilike.${rawId},id.ilike.WO-${rawId}`)
            .limit(1);
          if (data && data.length > 0) {
            wo = data[0] as any;
          }
        }
      } catch {}
    }

    if (!wo) {
      return NextResponse.json(
        { success: false, error: `Work order ${rawId} not found` },
        { status: 404 }
      );
    }

    const targetId = wo.id;
    const currentWindow = wo.scheduled_window || {
      date: new Date().toISOString().slice(0, 10),
      shift: 'A',
    };

    let updatedWindow = { ...currentWindow };

    if (body.action === 'confirm') {
      updatedWindow = {
        ...currentWindow,
        production_status: 'confirmed',
        reschedule_reason: null,
        confirmed_by: body.confirmed_by || 'Production Manager',
        confirmed_at: new Date().toISOString(),
      };
    } else if (
      body.action === 'request_reschedule' ||
      body.action === 'request_another_window'
    ) {
      const reason = body.reason?.trim();
      if (!reason) {
        return NextResponse.json(
          {
            success: false,
            error: 'A clear reason is required to request window rescheduling.',
          },
          { status: 400 }
        );
      }
      updatedWindow = {
        ...currentWindow,
        production_status: 'reschedule_requested',
        reschedule_reason: reason,
        requested_by: body.requested_by || 'Production Manager',
        requested_at: new Date().toISOString(),
      };
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid action. Supported actions: confirm, request_reschedule, request_another_window.',
        },
        { status: 400 }
      );
    }

    // 2. Persist update to local in-memory store
    let updatedWo = mutateLocalWorkOrder(targetId, {
      scheduled_window: updatedWindow,
    });

    if (!updatedWo) {
      const store = getLocalStoreData();
      const workOrders = (store.work_orders as any[]) || [];
      const updatedItem = { ...wo, scheduled_window: updatedWindow };
      workOrders.push(updatedItem);
      store.work_orders = workOrders;
      saveLocalStoreData(store);
      updatedWo = updatedItem;
    }

    // 3. Persist update to Supabase if connected
    try {
      const { getSupabaseAdminClient } = await import('@/lib/supabaseAdmin');
      const admin = getSupabaseAdminClient();
      if (admin) {
        await admin
          .from('work_orders')
          .update({ scheduled_window: updatedWindow })
          .or(`id.eq.${targetId},id.ilike.${targetId}`);
      }
    } catch (e) {
      console.warn('Could not sync scheduled_window to Supabase:', e);
    }

    return NextResponse.json({
      success: true,
      workOrder: updatedWo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update maintenance window' },
      { status: 500 }
    );
  }
}
