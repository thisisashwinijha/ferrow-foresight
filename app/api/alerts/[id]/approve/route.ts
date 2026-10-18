import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAlertByIdSync } from '@/lib/data/alerts';
import { getMachineByIdSync } from '@/lib/data/machines';
import {
  mutateLocalAlert,
  addLocalWorkOrder,
  reserveLocalSpares,
} from '@/lib/data/localStore';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { STANDARD_LOTO_CHECKLIST, runAllGuardrails } from '@/lib/guardrails';
import { getLocalStoreData } from '@/lib/data/localStore';
import { WorkOrder, Alert } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ApprovePayloadSchema = z.object({
  decided_by: z.string().default('Operator'),
  decision_notes: z.string().optional(),
  assigned_technician: z.string().nullable().optional(),
  scheduled_window: z.any().optional(),
  user_role: z.string().optional(),
});

function parseTaskSteps(recommendedAction: string): Array<{ step: string; done: boolean; type: 'task' }> {
  if (!recommendedAction) {
    return [{ step: 'Complete maintenance intervention per SOP', done: false, type: 'task' }];
  }
  const parts = recommendedAction
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/^[\d.-]+\s*/, ''))
    .filter((s) => s.length > 3 && !s.toLowerCase().includes('apply loto'));

  if (parts.length === 0) {
    return [{ step: recommendedAction, done: false, type: 'task' }];
  }
  return parts.map((step) => ({ step, done: false, type: 'task' }));
}

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
      // Empty body is acceptable with defaults
    }

    const parseResult = ApprovePayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload: ' + parseResult.error.issues.map((i) => i.message).join('; '),
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

    const machine = getMachineByIdSync(alert.machine_id);

    // Rule: P1 on Criticality A routed to Plant Head
    if (alert.urgency === 'P1' && machine?.criticality === 'A') {
      const allowedRoles = ['Plant Head', 'Head of Plant Operations', 'plant_head'];
      const userRole = payload.user_role || '';
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Criticality A asset with P1 urgency requires Plant Head approval',
          },
          { status: 403 }
        );
      }
    }

    const assignedTech =
      payload.assigned_technician !== undefined
        ? payload.assigned_technician
        : alert.assigned_technician;

    const store = getLocalStoreData();
    const techObj = ((store.technicians as any[]) || []).find((t) => t.id === assignedTech);
    const guardrailOutcome = runAllGuardrails(
      {
        ...alert,
        assigned_technician: assignedTech,
      },
      {
        machineCriticality: machine?.criticality,
        technicianShift: techObj?.shift || null,
        technicianCerts: store.certifications || [],
        liveSpares: store.spares || [],
        userRole: payload.user_role,
        referenceDate: '2026-10-18',
      }
    );

    if (!guardrailOutcome.pass) {
      const failingReasons = guardrailOutcome.checks
        .filter((c) => !c.pass)
        .map((c) => c.detail)
        .join('; ');
      return NextResponse.json(
        {
          success: false,
          error: `Cannot approve alert: guardrail verification failed (${failingReasons})`,
        },
        { status: 422 }
      );
    }

    const scheduledWindow = payload.scheduled_window || alert.proposed_window;

    // Generate unique WO ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const woId = `WO-${randomSuffix}`;

    // Compile checklist: LOTO checklist (if loto_required) + task steps
    const checklist: any[] = [];
    if (alert.loto_required) {
      checklist.push(...STANDARD_LOTO_CHECKLIST.map((step) => ({ ...step })));
    }
    checklist.push(...parseTaskSteps(alert.recommended_action));

    // Compile spares reserved
    const sparesReserved = (alert.spares_check || []).map((s) => ({
      part_id: s.part_id,
      qty: 1,
      name: s.name,
    }));

    const newWorkOrder: WorkOrder = {
      id: woId,
      alert_id: alert.id,
      machine_id: alert.machine_id,
      plant_id: alert.plant_id,
      type: alert.action_type === 'replace' || alert.action_type === 'repair' ? 'CBM' : 'PM',
      priority: alert.urgency,
      status: 'scheduled',
      assigned_technician: assignedTech,
      shadow_technician: alert.shadow_technician,
      scheduled_window: scheduledWindow,
      spares_reserved: sparesReserved,
      checklist,
      loto_permit_no: null,
      closure_notes: null,
      root_cause: null,
      downtime_hours: null,
      created_at: new Date().toISOString(),
      closed_at: null,
    };

    // Update alert status
    const updatedAlertUpdates: Partial<Alert> = {
      status: 'approved',
      decided_by: payload.decided_by,
      decision_reason: payload.decision_notes || 'Approved for scheduling',
      assigned_technician: assignedTech,
    };

    // Save locally
    const updatedAlert = mutateLocalAlert(alertId, updatedAlertUpdates);
    addLocalWorkOrder(newWorkOrder);
    reserveLocalSpares(sparesReserved);

    // If Supabase admin client is available, also persist
    const admin = getSupabaseAdminClient();
    if (admin) {
      try {
        await admin.from('work_orders').insert(newWorkOrder);
        await admin.from('alerts').update({
          status: 'approved',
          decided_by: payload.decided_by,
          decision_reason: payload.decision_notes || 'Approved for scheduling',
          assigned_technician: assignedTech,
        }).eq('id', alertId);

        for (const spare of sparesReserved) {
          const { data: currentSpare } = await admin
            .from('spares')
            .select('stock, reserved')
            .eq('id', spare.part_id)
            .single();

          if (currentSpare) {
            await admin
              .from('spares')
              .update({
                stock: Math.max(0, currentSpare.stock - 1),
                reserved: (currentSpare.reserved || 0) + 1,
              })
              .eq('id', spare.part_id);
          }
        }
      } catch (err) {
        console.warn('Failed to sync approval to Supabase, local state retained:', err);
      }
    }

    // Refresh affected views
    try {
      revalidatePath('/');
      revalidatePath('/alerts');
      revalidatePath(`/alerts/${alertId}`);
      revalidatePath('/work-orders');
      if (alert.machine_id) {
        revalidatePath(`/machines/${alert.machine_id}`);
      }
    } catch (e) {
      console.warn('revalidatePath warning in approve route:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Alert ${alertId} approved. Work order ${woId} scheduled.`,
      workOrder: newWorkOrder,
      alert: updatedAlert,
    });
  } catch (error: any) {
    console.error('Error approving alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error while approving alert',
      },
      { status: 500 }
    );
  }
}
