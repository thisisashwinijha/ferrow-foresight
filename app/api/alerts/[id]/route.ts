import { NextRequest, NextResponse } from 'next/server';
import { getAlertByIdSync } from '@/lib/data/alerts';
import { mutateLocalAlert } from '@/lib/data/localStore';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { FailureModeEnum } from '@/lib/guardrails';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PatchAlertSchema = z.object({
  failure_mode: FailureModeEnum.optional(),
  assigned_technician: z.string().nullable().optional(),
  status: z.enum(['pending', 'needs_review', 'approved', 'rejected', 'resolved', 'suppressed']).optional(),
  decided_by: z.string().nullable().optional(),
  decision_reason: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const alert = getAlertByIdSync(params.id);
  if (!alert) {
    return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, alert });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id;
    const body = await request.json();
    const parseRes = PatchAlertSchema.safeParse(body);

    if (!parseRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error: ' + parseRes.error.issues.map((i) => i.message).join('; '),
        },
        { status: 400 }
      );
    }

    const updates = parseRes.data;
    const updated = mutateLocalAlert(alertId, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Alert ${alertId} not found` },
        { status: 404 }
      );
    }

    const admin = getSupabaseAdminClient();
    if (admin) {
      try {
        await admin.from('alerts').update(updates).eq('id', alertId);
      } catch (e) {
        console.warn('Could not sync alert update to Supabase:', e);
      }
    }

    return NextResponse.json({ success: true, alert: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update alert' },
      { status: 500 }
    );
  }
}
