import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAlertByIdSync } from '@/lib/data/alerts';
import { mutateLocalAlert } from '@/lib/data/localStore';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { Alert } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RejectPayloadSchema = z.object({
  decided_by: z.string().default('Operator'),
  reason: z.string().min(1, 'A rejection reason is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id;
    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const parseResult = RejectPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues.map((i) => i.message).join('; '),
        },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const alert = getAlertByIdSync(alertId);

    if (!alert) {
      return NextResponse.json(
        { success: false, error: `Alert ${alertId} not found` },
        { status: 404 }
      );
    }

    const updates: Partial<Alert> = {
      status: 'rejected',
      decided_by: payload.decided_by,
      decision_reason: payload.reason,
    };

    const updatedAlert = mutateLocalAlert(alertId, updates);

    // If Supabase admin is available, sync to Supabase
    const admin = getSupabaseAdminClient();
    if (admin) {
      try {
        await admin
          .from('alerts')
          .update({
            status: 'rejected',
            decided_by: payload.decided_by,
            decision_reason: payload.reason,
          })
          .eq('id', alertId);
      } catch (err) {
        console.warn('Failed to sync rejection to Supabase, local state retained:', err);
      }
    }

    // Refresh affected views
    try {
      revalidatePath('/');
      revalidatePath('/alerts');
      revalidatePath(`/alerts/${alertId}`);
      if (alert.machine_id) {
        revalidatePath(`/machines/${alert.machine_id}`);
      }
    } catch (e) {
      console.warn('revalidatePath warning in reject route:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Alert ${alertId} rejected.`,
      alert: updatedAlert,
    });
  } catch (error: any) {
    console.error('Error rejecting alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error while rejecting alert',
      },
      { status: 500 }
    );
  }
}
