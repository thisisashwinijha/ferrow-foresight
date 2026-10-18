import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkOrderByIdSync } from '@/lib/data/workOrders';
import { mutateLocalWorkOrder } from '@/lib/data/localStore';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { WorkOrder } from '@/lib/types';

export const dynamic = 'force-dynamic';

const StepPayloadSchema = z.object({
  step_index: z.number().int().min(0),
  done: z.boolean(),
  technician_id: z.string().optional(),
  user_role: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const woId = params.id;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = StepPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues.map((i) => i.message).join('; '),
        },
        { status: 400 }
      );
    }

    const { step_index, done, technician_id, user_role } = parseResult.data;
    const workOrder = getWorkOrderByIdSync(woId);

    if (!workOrder) {
      return NextResponse.json({ success: false, error: `Work order ${woId} not found` }, { status: 404 });
    }

    if (workOrder.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify a closed work order' },
        { status: 400 }
      );
    }

    // Role & Assignment Permission Gating
    const allowedRoles = ['Plant Head', 'Head of Plant Operations', 'Maintenance Planner', 'plant_head'];
    const isPlannerOrHead = user_role && allowedRoles.includes(user_role);
    const isAssignedTech = technician_id && workOrder.assigned_technician === technician_id;

    if (!isPlannerOrHead && !isAssignedTech && user_role === 'Technician') {
      return NextResponse.json(
        {
          success: false,
          error: `Read-only: Execution restricted to assigned technician (${workOrder.assigned_technician || 'unassigned'}) or Maintenance Planner / Plant Head`,
        },
        { status: 403 }
      );
    }

    const checklist: Array<{ step: string; done: boolean; type?: string }> = Array.isArray(workOrder.checklist)
      ? JSON.parse(JSON.stringify(workOrder.checklist))
      : [];

    if (step_index >= checklist.length) {
      return NextResponse.json({ success: false, error: 'Invalid step index' }, { status: 400 });
    }

    const targetStep = checklist[step_index];
    const isLotoStep = targetStep.type === 'loto' || step_index < 6; // LOTO steps are first 6

    // Enforce sequential order for LOTO steps
    if (done && isLotoStep) {
      for (let i = 0; i < step_index; i++) {
        if (!checklist[i].done) {
          return NextResponse.json(
            {
              success: false,
              error: `LOTO steps must be completed in sequential order. Step ${i + 1} ("${checklist[i].step}") is not yet completed.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Enforce LOTO completion before task steps unlock
    if (done && !isLotoStep) {
      const lotoIncomplete = checklist
        .slice(0, 6)
        .some((s, idx) => (s.type === 'loto' || idx < 6) && !s.done);

      if (lotoIncomplete) {
        return NextResponse.json(
          {
            success: false,
            error: 'Safety violation: All LOTO steps must be completed and permit issued before executing task steps.',
          },
          { status: 400 }
        );
      }
    }

    // Update step
    checklist[step_index].done = done;

    // Check status transitions
    let newStatus = workOrder.status;
    let lotoPermit = workOrder.loto_permit_no;

    // Check if all LOTO steps are now completed
    const allLotoDone = checklist.slice(0, 6).every((s) => s.done);
    if (allLotoDone && (!lotoPermit || workOrder.status === 'scheduled' || workOrder.status === 'raised')) {
      const plantCode = workOrder.plant_id || 'P07';
      lotoPermit = lotoPermit || `LOTO-${plantCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      newStatus = 'loto_applied';
    }

    // Check if task steps have started
    const anyTaskDone = checklist.slice(6).some((s) => s.done);
    if (anyTaskDone && (newStatus === 'loto_applied' || newStatus === 'scheduled')) {
      newStatus = 'in_progress';
    }

    const updates: Partial<WorkOrder> = {
      checklist,
      status: newStatus,
      loto_permit_no: lotoPermit,
    };

    const updated = mutateLocalWorkOrder(woId, updates);

    // Sync to Supabase admin if available
    const admin = getSupabaseAdminClient();
    if (admin) {
      try {
        await admin.from('work_orders').update(updates).eq('id', woId);
      } catch (e) {
        console.warn('Could not sync step tick to Supabase:', e);
      }
    }

    return NextResponse.json({
      success: true,
      workOrder: updated,
      message: `Step ${step_index + 1} updated to ${done ? 'done' : 'open'}.`,
    });
  } catch (err: any) {
    console.error('Error ticking work order step:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
