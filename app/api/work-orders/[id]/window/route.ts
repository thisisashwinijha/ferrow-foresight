import { NextRequest, NextResponse } from 'next/server';
import { getWorkOrdersSync } from '@/lib/data/workOrders';
import { mutateLocalWorkOrder, getLocalStoreData } from '@/lib/data/localStore';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const woId = params.id;
    const body = await request.json();

    const store = getLocalStoreData();
    const workOrders = (store.work_orders as any[]) || [];
    const wo = workOrders.find((w: any) => w.id === woId);

    if (!wo) {
      return NextResponse.json(
        { success: false, error: `Work order ${woId} not found` },
        { status: 404 }
      );
    }

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
    } else if (body.action === 'request_reschedule') {
      if (!body.reason || !body.reason.trim()) {
        return NextResponse.json(
          { success: false, error: 'A clear reason is required to request window rescheduling.' },
          { status: 400 }
        );
      }
      updatedWindow = {
        ...currentWindow,
        production_status: 'reschedule_requested',
        reschedule_reason: body.reason.trim(),
        requested_by: body.requested_by || 'Production Manager',
        requested_at: new Date().toISOString(),
      };
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Supported actions: confirm, request_reschedule.' },
        { status: 400 }
      );
    }

    const updatedWo = mutateLocalWorkOrder(woId, {
      scheduled_window: updatedWindow,
    });

    const admin = getSupabaseAdminClient();
    if (admin) {
      try {
        await admin
          .from('work_orders')
          .update({ scheduled_window: updatedWindow })
          .eq('id', woId);
      } catch (e) {
        console.warn('Could not sync scheduled_window to Supabase:', e);
      }
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
