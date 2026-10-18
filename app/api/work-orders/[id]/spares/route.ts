import { NextRequest, NextResponse } from 'next/server';
import { getWorkOrderById, getWorkOrderByIdSync } from '@/lib/data/workOrders';
import { mutateLocalWorkOrder, getLocalStoreData, saveLocalStoreData } from '@/lib/data/localStore';
import { checkWorkflowPermission } from '@/lib/workflow';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = decodeURIComponent(params.id || '').trim();
    if (!rawId) {
      return NextResponse.json({ success: false, error: 'Work order ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const userRole = body.user_role || 'Stores In-charge';

    const perm = checkWorkflowPermission('confirm_spares', userRole);
    if (!perm.allowed && body.action === 'confirm') {
      return NextResponse.json({ success: false, error: perm.reason }, { status: 403 });
    }

    let wo = await getWorkOrderById(rawId);
    if (!wo) {
      wo = getWorkOrderByIdSync(rawId);
    }
    if (!wo) {
      return NextResponse.json({ success: false, error: `Work order ${rawId} not found` }, { status: 404 });
    }

    const currentSpares = wo.spares_reserved || [];
    let updatedSpares: any;
    let newStatus = wo.status;

    if (body.action === 'confirm') {
      if (Array.isArray(currentSpares)) {
        updatedSpares = currentSpares.map((s: any) => ({
          ...s,
          confirmed: true,
          confirmed_by: body.confirmed_by || userRole,
          confirmed_at: new Date().toISOString(),
        }));
        (updatedSpares as any).confirmed = true;
      } else {
        updatedSpares = {
          ...currentSpares,
          confirmed: true,
          confirmed_by: body.confirmed_by || userRole,
          confirmed_at: new Date().toISOString(),
        };
      }

      // Check if maintenance window is already confirmed
      const windowConfirmed = Boolean(
        wo.scheduled_window &&
          (wo.scheduled_window.confirmed ||
            wo.scheduled_window.production_status === 'confirmed')
      );

      // Invariant: when spares and window are both confirmed -> status becomes scheduled ("Ready for execution")
      if (windowConfirmed && (wo.status === 'approved' || wo.status === 'raised')) {
        newStatus = 'scheduled';
      }
    } else if (body.action === 'raise_purchase_request') {
      const prNo = `PR-${Math.floor(10000 + Math.random() * 90000)}`;
      if (Array.isArray(currentSpares)) {
        updatedSpares = currentSpares.map((s: any) => ({
          ...s,
          purchase_request_raised: true,
          pr_number: prNo,
          requested_by: userRole,
          requested_at: new Date().toISOString(),
        }));
        (updatedSpares as any).purchase_request_raised = true;
        (updatedSpares as any).pr_number = prNo;
      } else {
        updatedSpares = {
          ...currentSpares,
          purchase_request_raised: true,
          pr_number: prNo,
          requested_by: userRole,
          requested_at: new Date().toISOString(),
        };
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Supported: confirm, raise_purchase_request' },
        { status: 400 }
      );
    }

    const updated = mutateLocalWorkOrder(wo.id, {
      spares_reserved: updatedSpares,
      status: newStatus,
    });

    try {
      const { getSupabaseAdminClient } = await import('@/lib/supabaseAdmin');
      const admin = getSupabaseAdminClient();
      if (admin) {
        await admin
          .from('work_orders')
          .update({ spares_reserved: updatedSpares, status: newStatus })
          .eq('id', wo.id);
      }
    } catch {}

    return NextResponse.json({
      success: true,
      workOrder: updated || { ...wo, spares_reserved: updatedSpares, status: newStatus },
      message:
        body.action === 'confirm'
          ? 'Spares reservation confirmed by Stores In-charge'
          : 'Purchase request raised successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
