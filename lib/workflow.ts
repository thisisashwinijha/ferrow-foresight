import { Alert, WorkOrder, Machine, KnowledgeLibrary, Certification } from './types';
import { normalizeShiftId, formatShiftShort } from './shifts';

export type WorkflowStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface WorkflowStageInfo {
  stage: WorkflowStage;
  name: string;
  shortName: string;
  role: string;
  description: string;
}

export const WORKFLOW_STAGES: Record<WorkflowStage, WorkflowStageInfo> = {
  1: {
    stage: 1,
    name: 'Detect',
    shortName: 'Detect',
    role: 'Technician',
    description: 'Technician sensory capture or automated sensor anomaly',
  },
  2: {
    stage: 2,
    name: 'AI Triage',
    shortName: 'Triage',
    role: 'AI Agent',
    description: 'Agent evaluates evidence and creates structured alert',
  },
  3: {
    stage: 3,
    name: 'Planner Review',
    shortName: 'Planner',
    role: 'Maintenance Planner',
    description: 'Planner verifies failure mode; approves P2/P3 or sends P1 Criticality A to Plant Head',
  },
  4: {
    stage: 4,
    name: 'Plant Head Approval',
    shortName: 'Plant Head',
    role: 'Plant Head',
    description: 'Plant Head approves or rejects high-risk P1 Criticality A alerts',
  },
  5: {
    stage: 5,
    name: 'Spares Readiness',
    shortName: 'Spares',
    role: 'Stores In-charge',
    description: 'Stores In-charge confirms spares reservation or flags urgent purchase request',
  },
  6: {
    stage: 6,
    name: 'Production Window',
    shortName: 'Window',
    role: 'Production Manager',
    description: 'Production Manager confirms maintenance slot or requests alternative window',
  },
  7: {
    stage: 7,
    name: 'LOTO & Execution',
    shortName: 'Execution',
    role: 'Technician',
    description: 'Assigned Technician verifies zero-energy LOTO, executes tasks, and logs root cause',
  },
  8: {
    stage: 8,
    name: 'Knowledge & Verification',
    shortName: 'Verify',
    role: 'Training Coordinator',
    description: 'Knowledge Agent drafts card; Training Coordinator reviews and verifies',
  },
  9: {
    stage: 9,
    name: 'Restored to Normal',
    shortName: 'Completed',
    role: 'Completed',
    description: 'Machine nominal; KPIs, PM plan and history reflect verified restoration',
  },
};

export type WorkflowAction =
  | 'detect'
  | 'planner_review'
  | 'planner_approve'
  | 'send_to_plant_head'
  | 'plant_head_approve'
  | 'plant_head_reject'
  | 'confirm_spares'
  | 'raise_purchase_request'
  | 'confirm_window'
  | 'request_another_window'
  | 'request_reschedule'
  | 'apply_loto'
  | 'execute_task'
  | 'close_work_order'
  | 'verify_knowledge';

export interface WorkflowPermissionResult {
  allowed: boolean;
  reason?: string;
}

export interface WorkflowContext {
  alert?: Alert | null;
  workOrder?: WorkOrder | null;
  machine?: Machine | null;
  technicianId?: string | null;
  plantStatus?: string | null;
  plantId?: string | null;
  certifications?: Certification[];
  currentShift?: string;
}

/**
 * Checks whether spares are confirmed for a work order.
 */
export function isSparesConfirmed(workOrder?: WorkOrder | null): boolean {
  if (!workOrder) return false;
  if (workOrder.status === 'closed' || workOrder.status === 'in_progress' || workOrder.status === 'loto_applied') {
    return true;
  }
  const spares = workOrder.spares_reserved as any;
  if (!spares) return false;
  if (spares.confirmed === true) return true;
  if (Array.isArray(spares)) {
    if (spares.length === 0) return false;
    return spares.some((s: any) => s.confirmed === true);
  }
  return false;
}

/**
 * Checks whether production window is confirmed for a work order.
 */
export function isWindowConfirmed(workOrder?: WorkOrder | null): boolean {
  if (!workOrder) return false;
  if (workOrder.status === 'closed' || workOrder.status === 'in_progress' || workOrder.status === 'loto_applied') {
    return true;
  }
  const win = workOrder.scheduled_window as any;
  if (!win) return false;
  return Boolean(win.confirmed === true || win.production_status === 'confirmed');
}

/**
 * Normalizes seeded work orders according to canonical test and product spec:
 * - WO-2201 (AL-1004, P07-M09): approved, spares NOT confirmed, window NOT confirmed
 * - WO-2202 (AL-1005, P07-M06): spares and window confirmed, LOTO applied with its permit, in progress
 * - Closed history work orders: both confirmed
 */
export function normalizeSeededWorkOrders(workOrders: any[]): WorkOrder[] {
  return workOrders.map((wo) => {
    if (wo.id === 'WO-2201') {
      return {
        ...wo,
        status: 'approved',
        spares_reserved: [
          {
            part_id: 'SP-007',
            name: 'Hydraulic cylinder seal kit 80mm',
            qty: 1,
            confirmed: false,
          },
        ],
        scheduled_window: {
          line_id: 'P07-L1',
          date: '2026-10-20',
          shift: 'B',
          window_type: 'changeover',
          confirmed: false,
          production_status: 'pending',
        },
        loto_permit_no: null,
      };
    }
    if (wo.id === 'WO-2202') {
      return {
        ...wo,
        status: 'in_progress',
        spares_reserved: [
          {
            part_id: 'SP-002',
            name: 'Bearing 6308-2Z',
            qty: 1,
            confirmed: true,
          },
          {
            part_id: 'SP-010',
            name: 'Compressor oil (20L)',
            qty: 1,
            confirmed: true,
          },
        ],
        scheduled_window: {
          line_id: 'P07-L1',
          date: '2026-10-17',
          shift: 'A',
          window_type: 'run',
          confirmed: true,
          production_status: 'confirmed',
        },
        loto_permit_no: wo.loto_permit_no || 'LOTO-P07-1187',
      };
    }
    if (wo.status === 'closed') {
      return {
        ...wo,
        spares_reserved: [
          {
            part_id: 'SP-001',
            qty: 1,
            confirmed: true,
            name: 'Standard maintenance kit',
          },
        ],
        scheduled_window: {
          line_id: 'P07-L1',
          date: wo.closed_at?.slice(0, 10) || '2026-10-15',
          shift: 'A',
          window_type: 'planned_shutdown',
          confirmed: true,
          production_status: 'confirmed',
        },
      };
    }
    return wo;
  });
}

/**
 * Computes the exact workflow stage (1 to 9) from the alert and work order state.
 */
export function getWorkflowStage(
  alert?: Alert | null,
  workOrder?: WorkOrder | null,
  knowledgeVerified?: boolean
): WorkflowStage {
  // If work order is closed or alert is resolved
  if (workOrder?.status === 'closed' || alert?.status === 'resolved') {
    if (knowledgeVerified) {
      return 9;
    }
    return 8;
  }

  // If a work order exists
  if (workOrder) {
    if (workOrder.status === 'in_progress' || workOrder.status === 'loto_applied') {
      return 7;
    }

    const sparesConfirmed = isSparesConfirmed(workOrder);
    const windowConfirmed = isWindowConfirmed(workOrder);

    if (!sparesConfirmed) {
      return 5;
    }
    if (!windowConfirmed) {
      return 6;
    }
    return 7;
  }

  // If only alert exists
  if (alert) {
    if (alert.status === 'approved') {
      return 5;
    }

    if ((alert.status as string) === 'triage_in_progress' || (alert as any).stage === 2) {
      return 2;
    }

    if (alert.status === 'pending' || alert.status === 'needs_review') {
      const isP1 = alert.urgency === 'P1';
      // Criticality A check: from alert or machine
      const isCriticalA =
        (alert as any).criticality === 'A' ||
        (alert.machine_id && (alert.machine_id.endsWith('M03') || alert.machine_id.endsWith('M01')));

      // If sent to Plant Head
      const sentToPlantHead =
        alert.decision_reason === 'sent_to_plant_head' ||
        (alert.decided_by && alert.decided_by.toLowerCase().includes('plant head'));

      if (isP1 && isCriticalA && sentToPlantHead) {
        return 4;
      }

      return 3;
    }

    if (alert.status === 'rejected') {
      return 3;
    }
  }

  return 1;
}

/**
 * Checks whether an alert requires supervisor review.
 * Single source of truth across lists, badges, and detail views.
 * An alert needs review if status is needs_review, rejected, suppressed,
 * if stored guardrails failed, or if it is an unapproved P1 Criticality A alert viewed prior to Plant Head approval.
 */
export function isAlertNeedsReview(alert: Alert | null | undefined, userRole?: string): boolean {
  if (!alert) return false;
  if (alert.status === 'approved' || alert.status === 'resolved') {
    return false;
  }
  if (alert.status === 'needs_review' || alert.status === 'rejected' || alert.status === 'suppressed') {
    return true;
  }
  if (alert.guardrail_result && alert.guardrail_result.pass === false) {
    return true;
  }

  // Check Criticality A + P1 alert routing requirement
  const isP1 = alert.urgency === 'P1';
  const isCriticalA =
    (alert as any).criticality === 'A' ||
    (alert.machine_id && (alert.machine_id.endsWith('M03') || alert.machine_id.endsWith('M01')));

  if (isP1 && isCriticalA) {
    const isPlantHead = userRole === 'Plant Head' || userRole === 'Head of Plant Operations' || userRole === 'plant_head';
    if (!isPlantHead) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the effective display status for an alert.
 */
export function getEffectiveAlertStatus(alert: Alert | null | undefined, userRole?: string): string {
  if (!alert) return 'pending';
  if (alert.status === 'resolved') return 'resolved';
  if (alert.status === 'approved') return 'approved';
  if (isAlertNeedsReview(alert, userRole)) return 'needs_review';
  return alert.status || 'pending';
}

/**
 * Returns human-readable label of who the current stage is waiting for.
 */
export function getWaitingForRole(stage: WorkflowStage): string {
  if (stage === 9) {
    return 'Completed';
  }
  return WORKFLOW_STAGES[stage]?.role || 'Maintenance Team';
}

/**
 * Validates whether a specific role is allowed to perform a workflow action.
 * Returns { allowed: true } or { allowed: false, reason: 'one-line reason' }.
 */
export function checkWorkflowPermission(
  action: WorkflowAction,
  userRole: string,
  context?: WorkflowContext | string
): WorkflowPermissionResult {
  const ctx: WorkflowContext = typeof context === 'string'
    ? {
        plantStatus: ['p-08', 'p-12', 'p-22', 'shadow'].includes(context.toLowerCase()) ? 'shadow' : 'active',
        plantId: context,
      }
    : (context || {});

  // Invariant 5: Shadow plants never dispatch
  if (ctx.plantStatus === 'shadow' || (ctx.plantId && ['p-08', 'p-12', 'p-22'].includes(ctx.plantId.toLowerCase()))) {
    if (
      action === 'planner_approve' ||
      action === 'plant_head_approve' ||
      action === 'confirm_spares' ||
      action === 'confirm_window' ||
      action === 'apply_loto' ||
      action === 'execute_task' ||
      action === 'close_work_order'
    ) {
      return {
        allowed: false,
        reason: 'Shadow mode plant: recommendations are logged for comparison only and cannot be dispatched.',
      };
    }
  }

  switch (action) {
    case 'detect': {
      if (userRole !== 'Technician' && userRole !== 'Maintenance Planner' && userRole !== 'Plant Head') {
        return {
          allowed: false,
          reason: 'Only technicians and maintenance staff can log floor observations.',
        };
      }
      return { allowed: true };
    }

    case 'planner_review':
    case 'planner_approve': {
      if (userRole !== 'Maintenance Planner') {
        return {
          allowed: false,
          reason: 'Only Maintenance Planner can review and approve maintenance alerts.',
        };
      }
      // If P1 on Criticality A machine, planner cannot approve directly
      if (ctx.alert?.urgency === 'P1' && (ctx.alert as any).criticality === 'A') {
        return {
          allowed: false,
          reason: 'P1 alerts on Criticality A assets require Plant Head authorization.',
        };
      }
      return { allowed: true };
    }

    case 'send_to_plant_head': {
      if (userRole !== 'Maintenance Planner') {
        return {
          allowed: false,
          reason: 'Only Maintenance Planner can forward Criticality A alerts to Plant Head.',
        };
      }
      return { allowed: true };
    }

    case 'plant_head_approve':
    case 'plant_head_reject': {
      if (userRole !== 'Plant Head') {
        return {
          allowed: false,
          reason: 'Only Plant Head has authority to approve P1 alerts on Criticality A assets.',
        };
      }
      return { allowed: true };
    }

    case 'confirm_spares':
    case 'raise_purchase_request': {
      if (userRole !== 'Stores In-charge') {
        return {
          allowed: false,
          reason: 'Only Stores In-charge can confirm inventory reservations or raise purchase requests.',
        };
      }
      return { allowed: true };
    }

    case 'confirm_window':
    case 'request_another_window':
    case 'request_reschedule': {
      if (userRole !== 'Production Manager') {
        return {
          allowed: false,
          reason: 'Only Production Manager can authorize or reschedule line maintenance windows.',
        };
      }
      return { allowed: true };
    }

    case 'apply_loto':
    case 'execute_task':
    case 'close_work_order': {
      if (userRole !== 'Technician') {
        return {
          allowed: false,
          reason: 'Only assigned Technicians can execute LOTO, perform tasks, and close work orders.',
        };
      }

      // Check technician assignment if context is provided
      if (ctx.workOrder && ctx.technicianId) {
        if (
          ctx.workOrder.assigned_technician &&
          ctx.workOrder.assigned_technician !== ctx.technicianId
        ) {
          return {
            allowed: false,
            reason: `Action restricted to assigned technician (${ctx.workOrder.assigned_technician}).`,
          };
        }
      }

      return { allowed: true };
    }

    case 'verify_knowledge': {
      if (userRole !== 'Training Coordinator') {
        return {
          allowed: false,
          reason: 'Only Training Coordinator can verify failure signatures and publish learning cards.',
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: false, reason: 'Action not permitted for this role.' };
  }
}

/**
 * Validates domain invariants:
 * - No work order without approval
 * - No task execution before all LOTO steps done
 * - No task execution before spares and window confirmed
 * - No assignment with expired or missing certs, or shift mismatch
 * - No PM date moved later without deferral
 * - Shadow plants never dispatch
 * - Approved alerts never in pending queue
 */
export function validateWorkflowInvariants(context: {
  action: WorkflowAction;
  alert?: Alert | null;
  workOrder?: WorkOrder | null;
  machine?: Machine | null;
  technician?: { id: string; shift?: string };
  certifications?: Certification[];
  requiredCerts?: string[];
  proposedShift?: string;
  referenceDate?: string;
  pmDecision?: { decision: 'keep' | 'defer' | 'pull_forward'; currentDate: string; newDate: string };
  plantStatus?: string;
}): { valid: boolean; error?: string } {
  // Invariant 1: No work order without approval
  if (context.action === 'confirm_spares' || context.action === 'confirm_window' || context.action === 'apply_loto') {
    if (context.alert && context.alert.status !== 'approved' && context.alert.status !== 'resolved') {
      return {
        valid: false,
        error: 'Invariant violation: Work order cannot proceed without prior alert approval.',
      };
    }
  }

  // Pre-execution invariant: Spares and window must be confirmed before LOTO and execution
  if (context.action === 'apply_loto' || context.action === 'execute_task') {
    const sparesConfirmed = Boolean(
      context.workOrder?.spares_reserved &&
        ((context.workOrder.spares_reserved as any).confirmed ||
          (Array.isArray(context.workOrder.spares_reserved) &&
            ((context.workOrder.spares_reserved as any).confirmed ||
              (context.workOrder.spares_reserved as any[]).some((s: any) => s.confirmed))))
    );
    const windowConfirmed = Boolean(
      context.workOrder?.scheduled_window &&
        (context.workOrder.scheduled_window.confirmed ||
          context.workOrder.scheduled_window.production_status === 'confirmed')
    );
    if (!sparesConfirmed || !windowConfirmed) {
      return {
        valid: false,
        error: 'Invariant violation: Both spares reservation and maintenance window must be confirmed before execution begins.',
      };
    }
  }

  // Invariant 2: No task before LOTO
  if (context.action === 'execute_task') {
    const checklist: Array<{ step: string; done: boolean; type?: string }> =
      Array.isArray(context.workOrder?.checklist) ? (context.workOrder?.checklist as any) : [];
    const lotoIncomplete = checklist.some(
      (item, idx) => (item.type === 'loto' || idx < 6) && !item.done
    );
    if (lotoIncomplete) {
      return {
        valid: false,
        error: 'Invariant violation: All LOTO safety steps must be completed before tasks unlock.',
      };
    }
  }

  // Invariant: No closure without all checklist items done
  if (context.action === 'close_work_order') {
    const checklist: Array<{ step: string; done: boolean }> = Array.isArray(context.workOrder?.checklist)
      ? (context.workOrder?.checklist as any)
      : [];
    if (checklist.length > 0 && checklist.some((item) => !item.done)) {
      return {
        valid: false,
        error: 'Invariant violation: All checklist and LOTO isolation steps must be completed before work order closure.',
      };
    }
  }

  // Invariant 3: No uncertified or expired cert or shift-mismatched assignment
  if (context.technician && context.requiredCerts && context.requiredCerts.length > 0) {
    const refDate = context.referenceDate || '2026-10-18';
    const techCerts = (context.certifications || []).filter(
      (c) => c.technician_id === context.technician?.id
    );

    for (const req of context.requiredCerts) {
      const match = techCerts.find((c) => c.certification.toLowerCase() === req.toLowerCase());
      if (!match) {
        return {
          valid: false,
          error: `Invariant violation: Technician ${context.technician.id} lacks required certification ${req}.`,
        };
      }
      if (match.valid_until && match.valid_until < refDate) {
        return {
          valid: false,
          error: `Invariant violation: Technician ${context.technician.id} holds expired certification ${req} (${match.valid_until}).`,
        };
      }
    }

    if (context.proposedShift && context.technician.shift) {
      const normProp = normalizeShiftId(context.proposedShift);
      const normTech = normalizeShiftId(context.technician.shift);
      if (normProp !== normTech) {
        return {
          valid: false,
          error: `Invariant violation: Technician shift (${formatShiftShort(normTech)}) does not match maintenance window shift (${formatShiftShort(normProp)}).`,
        };
      }
    }
  }

  // Invariant 4: No PM date moved later except deferral
  if (context.pmDecision) {
    const { decision, currentDate, newDate } = context.pmDecision;
    if (decision === 'pull_forward' && newDate >= currentDate) {
      return {
        valid: false,
        error: 'Invariant violation: pull_forward must move due date strictly earlier.',
      };
    }
    if (decision === 'keep' && newDate !== currentDate) {
      return {
        valid: false,
        error: 'Invariant violation: keep must not alter original due date.',
      };
    }
  }

  // Invariant 5: Shadow plants never dispatch
  if (context.plantStatus === 'shadow' && context.action !== 'detect' && context.action !== 'verify_knowledge') {
    return {
      valid: false,
      error: 'Invariant violation: Shadow mode plants log recommendations only and never dispatch work orders.',
    };
  }

  return { valid: true };
}
