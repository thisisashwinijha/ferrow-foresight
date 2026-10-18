import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAlertByIdSync } from '@/lib/data/alerts';
import { triageService } from '@/lib/triageService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertId = params.id;
    const alert = getAlertByIdSync(alertId);

    if (!alert) {
      return NextResponse.json(
        { success: false, error: `Alert ${alertId} not found` },
        { status: 404 }
      );
    }

    let role = 'Maintenance Planner';
    try {
      const body = await request.json();
      if (body?.role) role = body.role;
    } catch {
      // Body optional
    }

    // Role check: Only Maintenance Planner, Plant Head, and Head of Plant Operations
    const isAuthorized =
      role === 'Maintenance Planner' ||
      role === 'Plant Head' ||
      role === 'Head of Plant Operations' ||
      role === 'planner' ||
      role === 'plant_head';

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Maintenance Planner and Plant Head can re-run AI triage.',
        },
        { status: 403 }
      );
    }

    const result = await triageService({
      machine_id: alert.machine_id,
      plant_id: alert.plant_id,
      alert_id: alert.id,
      forceLive: true,
    });

    try {
      revalidatePath('/');
      revalidatePath('/alerts');
      revalidatePath(`/alerts/${alertId}`);
      revalidatePath(`/machines/${alert.machine_id}`);
    } catch (e) {
      console.warn('revalidatePath warning in rerun route:', e);
    }

    return NextResponse.json({
      success: true,
      alert: result.alert,
      provider: result.alert.source,
      latency_ms: result.execution?.latency_ms || 0,
      cached_note: result.execution?.cached_note,
      message: `AI triage re-run complete via ${result.alert.source}`,
    });
  } catch (err: any) {
    console.error('Error re-running AI triage:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error re-running triage' },
      { status: 500 }
    );
  }
}
