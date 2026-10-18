import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWorkOrderByIdSync } from '@/lib/data/workOrders';
import { closeLocalWorkOrder } from '@/lib/data/localStore';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ClosePayloadSchema = z.object({
  root_cause: z.string().min(1, 'Root cause is required to close a work order'),
  closure_notes: z.string().min(1, 'Closure notes are required to close a work order'),
  downtime_hours: z.number().min(0).default(2.0),
  parts_used: z
    .array(
      z.object({
        part_id: z.string(),
        qty: z.number().default(1),
        name: z.string().optional(),
      })
    )
    .optional(),
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

    const parseResult = ClosePayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues.map((i) => i.message).join('; '),
        },
        { status: 400 }
      );
    }

    const workOrder = getWorkOrderByIdSync(woId);
    if (!workOrder) {
      return NextResponse.json({ success: false, error: `Work order ${woId} not found` }, { status: 404 });
    }

    if (workOrder.status === 'closed') {
      return NextResponse.json({ success: false, error: 'Work order is already closed' }, { status: 400 });
    }

    // Gating check: ensure all checklist steps are done
    const checklist: Array<{ step: string; done: boolean }> = Array.isArray(workOrder.checklist)
      ? workOrder.checklist
      : [];

    const incompleteStep = checklist.find((s) => !s.done);
    if (incompleteStep) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot close work order: Not all checklist steps are completed. Incomplete step: "${incompleteStep.step}".`,
        },
        { status: 400 }
      );
    }

    const result = closeLocalWorkOrder(woId, parseResult.data);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Failed to process work order closure' }, { status: 500 });
    }

    // Sync to Supabase if connected
    const admin = getSupabaseAdminClient();
    if (admin) {
      try {
        // 1. Update work order
        await admin
          .from('work_orders')
          .update({
            status: 'closed',
            closed_at: result.workOrder.closed_at,
            root_cause: parseResult.data.root_cause,
            closure_notes: parseResult.data.closure_notes,
            downtime_hours: parseResult.data.downtime_hours,
          })
          .eq('id', woId);

        // 2. Update machine
        if (result.machine) {
          await admin
            .from('machines')
            .update({
              status: 'running',
              risk_score: result.machine.risk_score,
              health_score: result.machine.health_score,
            })
            .eq('id', result.machine.id);
        }

        // 3. Insert maintenance log
        await admin.from('maintenance_log').insert(result.log);

        // 4. Update spares reserved
        if (parseResult.data.parts_used) {
          for (const p of parseResult.data.parts_used) {
            const { data: currentSpare } = await admin
              .from('spares')
              .select('reserved')
              .eq('id', p.part_id)
              .single();
            if (currentSpare) {
              await admin
                .from('spares')
                .update({
                  reserved: Math.max(0, (currentSpare.reserved || 0) - (p.qty || 1)),
                })
                .eq('id', p.part_id);
            }
          }
        }
      } catch (e) {
        console.warn('Could not sync work order closure to Supabase:', e);
      }
    }

    // Refresh affected views
    try {
      revalidatePath('/');
      revalidatePath('/work-orders');
      revalidatePath(`/work-orders/${woId}`);
      revalidatePath('/alerts');
      if (workOrder.machine_id) {
        revalidatePath(`/machines/${workOrder.machine_id}`);
      }
    } catch (e) {
      console.warn('revalidatePath warning in close route:', e);
    }

    return NextResponse.json({
      success: true,
      workOrder: result.workOrder,
      machine: result.machine,
      log: result.log,
      message: `Work order ${woId} successfully closed. Machine restored to nominal.`,
    });
  } catch (err: any) {
    console.error('Error closing work order:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
