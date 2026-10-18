import { NextRequest, NextResponse } from 'next/server';
import { mutateLocalPmPlan } from '@/lib/data/localStore';
import { getPmPlansSync } from '@/lib/data/pmPlan';
import { checkPmDueDate } from '@/lib/guardrails';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const plantId = searchParams.get('plant') || 'P-07';
  const plans = getPmPlansSync(plantId);
  return NextResponse.json({ success: true, plans });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'accept_all_safe_deferrals') {
      const plantId = body.plantId || 'P-07';
      const plans = getPmPlansSync(plantId);
      const deferrals = plans.filter((p) => p.ai_suggestion === 'defer' && p.status !== 'accepted');

      const updated = [];
      for (const d of deferrals) {
        const res = mutateLocalPmPlan(d.id, {
          status: 'accepted',
          decided_by: body.decided_by || 'Maintenance Planner',
        });
        if (res) updated.push(res);
      }

      return NextResponse.json({
        success: true,
        count: updated.length,
        plans: updated,
      });
    }

    if (body.action === 'accept' && body.id) {
      const updated = mutateLocalPmPlan(body.id, {
        status: 'accepted',
        decided_by: body.decided_by || 'Maintenance Planner',
        due_date: body.new_due_date || undefined,
      });
      return NextResponse.json({ success: true, plan: updated });
    }

    if (body.action === 'override' && body.id) {
      // Guardrail check: if override decision is keep or pull_forward, new date cannot be later
      if (body.override_decision && body.new_due_date && body.current_due_date) {
        const check = checkPmDueDate(body.override_decision, body.current_due_date, body.new_due_date);
        if (!check.pass) {
          return NextResponse.json(
            { success: false, error: check.detail },
            { status: 422 }
          );
        }
      }

      const updated = mutateLocalPmPlan(body.id, {
        status: 'overridden',
        ai_suggestion: body.override_decision || 'keep',
        ai_reason: `Override: ${body.reason || 'Manual planner decision'}`,
        due_date: body.new_due_date || undefined,
        decided_by: body.decided_by || 'Maintenance Planner',
      });
      return NextResponse.json({ success: true, plan: updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update PM plan' },
      { status: 500 }
    );
  }
}
