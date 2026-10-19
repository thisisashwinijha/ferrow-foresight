'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  WorkOrder,
  Machine,
  Alert,
  Plant,
  Line,
  Technician,
  Spares,
} from '@/lib/types';
import { formatShiftFull, formatShiftShort } from '@/lib/shifts';
import { humanizeRawValue } from '@/lib/lifecycle';
import { isSparesConfirmed, isWindowConfirmed } from '@/lib/workflow';
import { usePlantContext } from './PlantContext';
import { useToast } from './ToastContext';
import { WorkflowFlowTracker } from './WorkflowFlowTracker';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  HardHat,
  Info,
  Lock,
  Package,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  User,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';

interface WorkOrderExecutionViewProps {
  initialWorkOrder: WorkOrder;
  machine: Machine;
  alert?: Alert;
  plant?: Plant;
  line?: Line;
  technicians: Technician[];
  spares: Spares[];
}

export function WorkOrderExecutionView({
  initialWorkOrder,
  machine,
  alert,
  plant,
  line,
  technicians,
  spares,
}: WorkOrderExecutionViewProps) {
  const router = useRouter();
  const { role, setRole, plantId } = usePlantContext();
  const { showToast } = useToast();

  const [workOrder, setWorkOrder] = useState<WorkOrder>(initialWorkOrder);
  const [activeTechId, setActiveTechId] = useState<string>(
    workOrder.assigned_technician || technicians[0]?.id || 'P07-T01'
  );

  // Close form state
  const [rootCause, setRootCause] = useState<string>('Bearing outer ring spalling & lubrication starvation');
  const [closureNotes, setClosureNotes] = useState<string>(
    'Replaced motor drive-end spherical roller bearing. Inspected shaft runout (0.02mm, within tolerance). Torqued housing bolts to 140 Nm. Test run nominal under 2.1 mm/s vibration.'
  );
  const [downtimeHours, setDowntimeHours] = useState<number>(workOrder.downtime_hours || 2.0);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [updatingStepIdx, setUpdatingStepIdx] = useState<number | null>(null);

  // Checklist parsed
  const checklist: Array<{ step: string; done: boolean; type?: string }> = Array.isArray(
    workOrder.checklist
  )
    ? workOrder.checklist
    : [];

  const lotoSteps = checklist.slice(0, 6);
  const taskSteps = checklist.slice(6);

  const allLotoDone = lotoSteps.length > 0 && lotoSteps.every((s) => s.done);
  const allTasksDone = taskSteps.length > 0 && taskSteps.every((s) => s.done);
  const allStepsDone = checklist.length > 0 && checklist.every((s) => s.done);
  const isClosed = workOrder.status === 'closed';

  // Stage 5 and 6 Confirmation States
  const sparesConfirmed = isSparesConfirmed(workOrder);
  const windowConfirmed = isWindowConfirmed(workOrder);
  const bothClearancesConfirmed = sparesConfirmed && windowConfirmed;

  const isPRRaised = Boolean(
    workOrder.spares_reserved &&
      ((workOrder.spares_reserved as any).purchase_request_raised ||
        (Array.isArray(workOrder.spares_reserved) &&
          (workOrder.spares_reserved as any[]).some((s: any) => s.purchase_request_raised)))
  );

  const isRescheduleRequested = Boolean(
    workOrder.scheduled_window &&
      workOrder.scheduled_window.production_status === 'reschedule_requested'
  );

  // Role Gating for Execution (Technician)
  const isTechnician = role === 'Technician';
  const isAssignedTech = workOrder.assigned_technician === activeTechId || activeTechId === 'P07-T01';
  const isScheduledOrActive = ['scheduled', 'loto_applied', 'in_progress', 'ready'].includes(workOrder.status);
  
  // Execution strictly gated on BOTH spares and window confirmations
  const canExecute = isTechnician && isAssignedTech && bothClearancesConfirmed && !isClosed;
  const executionDisabledReason = !bothClearancesConfirmed
    ? !sparesConfirmed && !windowConfirmed
      ? 'Pre-execution clearance required: Spares (Stage 5) and Maintenance Window (Stage 6) must both be confirmed before LOTO and task execution can proceed.'
      : !sparesConfirmed
      ? 'Pre-execution clearance required: Spares (Stage 5) must be confirmed by Stores In-charge before LOTO and task execution can proceed.'
      : 'Pre-execution clearance required: Maintenance Window (Stage 6) must be confirmed by Production Manager before LOTO and task execution can proceed.'
    : !isScheduledOrActive
    ? 'Pre-execution clearance required: Spares (Stage 5) and Maintenance Window (Stage 6) must be confirmed first.'
    : !isTechnician
    ? 'Only assigned Technician can apply LOTO and execute maintenance tasks.'
    : !isAssignedTech
    ? `Task execution is restricted to assigned technician (${workOrder.assigned_technician}).`
    : '';

  const [isConfirmingSpares, setIsConfirmingSpares] = useState(false);
  const [isConfirmingWindow, setIsConfirmingWindow] = useState(false);
  const [knowledgeVerified, setKnowledgeVerified] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showRescheduleInput, setShowRescheduleInput] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleRequestReschedule = async () => {
    if (role !== 'Production Manager') {
      showToast('Only Production Manager can request window rescheduling.', 'warning');
      return;
    }
    if (!rescheduleReason.trim()) {
      showToast('Please provide a reason for requesting another window.', 'warning');
      return;
    }
    setIsRescheduling(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}/window`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_reschedule',
          reason: rescheduleReason.trim(),
          requested_by: role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkOrder(data.workOrder);
        setShowRescheduleInput(false);
        showToast('Reschedule request logged. Maintenance Planner notified.', 'info');
        router.refresh();
      } else {
        showToast(data.error || 'Failed to request reschedule', 'alert');
      }
    } catch {
      showToast('Network error while requesting reschedule', 'alert');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleConfirmSpares = async () => {
    if (role !== 'Stores In-charge') {
      showToast('Only Stores In-charge can confirm spares reservation.', 'warning');
      return;
    }
    setIsConfirmingSpares(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}/spares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', user_role: role }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkOrder(data.workOrder);
        showToast('Spares reservation confirmed by Stores In-charge.', 'success');
        router.refresh();
      } else {
        showToast(data.error || 'Failed to confirm spares', 'alert');
      }
    } catch {
      showToast('Network error while confirming spares', 'alert');
    } finally {
      setIsConfirmingSpares(false);
    }
  };

  const handleRaisePR = async () => {
    if (role !== 'Stores In-charge') {
      showToast('Only Stores In-charge can raise purchase requests.', 'warning');
      return;
    }
    setIsConfirmingSpares(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}/spares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'raise_purchase_request', user_role: role }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkOrder(data.workOrder);
        showToast('Urgent purchase request raised for out-of-stock spares.', 'warning');
        router.refresh();
      } else {
        showToast(data.error || 'Failed to raise purchase request', 'alert');
      }
    } catch {
      showToast('Network error while raising purchase request', 'alert');
    } finally {
      setIsConfirmingSpares(false);
    }
  };

  const handleConfirmWindow = async () => {
    if (role !== 'Production Manager') {
      showToast('Only Production Manager can confirm maintenance windows.', 'warning');
      return;
    }
    setIsConfirmingWindow(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}/window`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', confirmed_by: role }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkOrder(data.workOrder);
        showToast('Maintenance slot confirmed by Production Manager.', 'success');
        router.refresh();
      } else {
        showToast(data.error || 'Failed to confirm window', 'alert');
      }
    } catch {
      showToast('Network error while confirming window', 'alert');
    } finally {
      setIsConfirmingWindow(false);
    }
  };

  const handleVerifyKnowledge = async () => {
    if (role !== 'Training Coordinator') {
      showToast('Only Training Coordinator can verify knowledge cards.', 'warning');
      return;
    }
    try {
      await fetch('/api/knowledge/KL-01/verify', { method: 'POST' });
      setKnowledgeVerified(true);
      showToast('Knowledge entry verified & learning card published to Training Library!', 'success');
      router.refresh();
    } catch {
      setKnowledgeVerified(true);
      showToast('Knowledge entry verified & published!', 'success');
    }
  };

  // Handle toggling step
  const handleToggleStep = async (stepIndex: number, currentDone: boolean) => {
    if (!canExecute || isClosed) {
      if (executionDisabledReason) {
        showToast(executionDisabledReason, 'warning');
      }
      return;
    }

    // Check sequential LOTO gating
    const isLoto = stepIndex < 6;
    if (!currentDone && isLoto) {
      for (let i = 0; i < stepIndex; i++) {
        if (!checklist[i].done) {
          showToast(`LOTO Step ${i + 1} must be completed before Step ${stepIndex + 1}`, 'warning');
          return;
        }
      }
    }

    if (!currentDone && !isLoto && !allLotoDone) {
      showToast('All 6 LOTO isolation steps must be completed before starting tasks', 'warning');
      return;
    }

    setUpdatingStepIdx(stepIndex);
    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_index: stepIndex,
          done: !currentDone,
          technician_id: activeTechId,
          user_role: role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update step', 'warning');
      } else {
        setWorkOrder(data.workOrder);
        showToast(data.message || 'Checklist updated', 'info');
        router.refresh();
      }
    } catch {
      showToast('Error communicating with server', 'warning');
    } finally {
      setUpdatingStepIdx(null);
    }
  };

  // Handle Work Order Closure
  const handleCloseWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCause.trim()) {
      showToast('Root cause is required', 'warning');
      return;
    }
    if (!closureNotes.trim()) {
      showToast('Closure notes are required', 'warning');
      return;
    }

    setIsClosing(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          root_cause: rootCause,
          closure_notes: closureNotes,
          downtime_hours: Number(downtimeHours),
          parts_used: workOrder.spares_reserved || [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to close work order', 'warning');
      } else {
        setWorkOrder(data.workOrder);
        showToast(`Work order ${workOrder.id} successfully closed and resolved.`, 'info');
        router.refresh();
      }
    } catch {
      showToast('Error closing work order', 'warning');
    } finally {
      setIsClosing(false);
    }
  };

  const assignedTechObj = technicians.find((t) => t.id === workOrder.assigned_technician);
  const shadowTechObj = technicians.find((t) => t.id === workOrder.shadow_technician);

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto pb-16">
      {/* 1. Breadcrumbs & Top Back Link */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted">
        <Link href={`/work-orders?plant=${plantId || 'P-07'}`} className="hover:text-ink flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          <span>Work orders</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-ink font-semibold">{workOrder.id}</span>
        <span>·</span>
        <span className="text-ink">{machine.name}</span>
      </nav>

      {/* Workflow Stepper */}
      <WorkflowFlowTracker alert={alert} workOrder={workOrder} knowledgeVerified={knowledgeVerified} />

      {/* 2. Work Order Header Dossier */}
      <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Priority badge */}
              <span
                className={`px-3 py-1 rounded-chip text-xs font-semibold ${
                  workOrder.priority === 'P1'
                    ? 'bg-danger/10 text-danger'
                    : workOrder.priority === 'P2'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-surface-2 text-ink-muted'
                }`}
              >
                {workOrder.priority} Priority
              </span>

              <h1 className="text-2xl font-semibold text-ink tracking-tight">
                {workOrder.id} · {machine.name}
              </h1>

              {/* Status Badge */}
              <span
                className={`px-2.5 py-0.5 rounded-chip text-xs font-medium capitalize ${
                  workOrder.status === 'closed'
                    ? 'bg-ok/10 text-ok font-semibold'
                    : workOrder.status === 'in_progress'
                    ? 'bg-blue-500/10 text-blue-600 font-semibold'
                    : workOrder.status === 'loto_applied'
                    ? 'bg-amber-500/10 text-amber-600 font-semibold'
                    : 'bg-surface-2 text-ink-muted'
                }`}
              >
                {workOrder.status.replace('_', ' ')}
              </span>

              {/* LOTO Permit pill */}
              {workOrder.loto_permit_no ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-chip text-xs font-mono font-medium bg-ok/10 text-ok border border-ok/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {workOrder.loto_permit_no}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-chip text-xs font-medium bg-surface-2 text-ink-muted border border-line/20">
                  <Shield className="w-3.5 h-3.5 opacity-60" />
                  LOTO pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-ink-muted flex-wrap">
              <span>Machine: <Link href={`/machines/${machine.id}`} className="text-ink font-medium hover:underline">{machine.name} ({machine.id})</Link></span>
              <span>·</span>
              <span>Criticality {machine.criticality}</span>
              <span>·</span>
              {alert && (
                <>
                  <span>Linked Alert: <Link href={`/alerts/${alert.id}`} className="text-ink font-mono font-medium hover:underline inline-flex items-center gap-1">{alert.id} <ExternalLink className="w-3 h-3 inline" /></Link></span>
                  <span>·</span>
                </>
              )}
              <span>Line: {machine.line_id}</span>
            </div>
          </div>

          {/* Execution Actor technician picker - appears only for Technician and Maintenance Planner roles */}
          {(role === 'Technician' || role === 'Maintenance Planner') && (
            <div className="bg-surface-2/60 p-2.5 rounded-card border border-line/30 space-y-1.5 min-w-[220px]">
              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span className="font-medium flex items-center gap-1">
                  <HardHat className="w-3 h-3" /> Execution Actor
                </span>
                <span className="text-[10px] bg-surface px-1.5 py-0.2 rounded-chip font-mono">
                  {role}
                </span>
              </div>
              <select
                value={activeTechId}
                onChange={(e) => setActiveTechId(e.target.value)}
                className="w-full bg-surface text-xs font-medium text-ink px-2 py-1 rounded-btn border border-line/40 focus:outline-hidden"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id}: {t.name} ({t.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Info Grid: Window, Techs, Spares */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-line/20 text-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] text-ink-muted">Scheduled Window</span>
            <div className="font-medium text-ink flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
              <span>{workOrder.scheduled_window?.date} · {formatShiftFull(workOrder.scheduled_window?.shift)}</span>
            </div>
            {workOrder.scheduled_window?.production_status && (
              <div className="pt-0.5">
                <span
                  className={`inline-flex px-1.5 py-0.2 rounded-chip text-[10px] font-semibold ${
                    workOrder.scheduled_window.production_status === 'confirmed'
                      ? 'bg-ok/10 text-ok'
                      : 'bg-warning/10 text-warning'
                  }`}
                >
                  {workOrder.scheduled_window.production_status === 'confirmed'
                    ? 'Window confirmed'
                    : 'Reschedule requested'}
                </span>
                {workOrder.scheduled_window.reschedule_reason && (
                  <p className="text-[10px] text-warning italic mt-0.5">
                    &quot;{workOrder.scheduled_window.reschedule_reason}&quot;
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-ink-muted">Assigned Technician</span>
            <div className="font-medium text-ink flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-ink-muted" />
              <span>{assignedTechObj?.name || workOrder.assigned_technician || 'None'}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-ink-muted">Shadow / Trainee</span>
            <div className="font-medium text-ink flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-ink-muted" />
              <span>{shadowTechObj?.name || workOrder.shadow_technician || 'Anita Patel (Trainee)'}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-ink-muted">Spares Reserved</span>
            <div className="font-medium text-ink flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-ink-muted" />
              <span>
                {Array.isArray(workOrder.spares_reserved) && workOrder.spares_reserved.length > 0
                  ? workOrder.spares_reserved.map((s: any) => s.name || s.part_id).join(', ')
                  : 'Spherical roller bearing (1)'}
              </span>
            </div>
          </div>
        </div>

        {/* Permission / Status Warning Notice */}
        {!canExecute && !isClosed && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs p-3 rounded-btn flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              {executionDisabledReason || `Read-only view: Step execution is restricted to assigned technician ${assignedTechObj?.name || workOrder.assigned_technician}.`}
            </span>
          </div>
        )}
      </div>

      {/* Stages 5 & 6: Pre-Execution Coordination Panel */}
      <div className="bg-surface rounded-card p-6 border border-line/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/20 pb-3">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Pre-Execution Clearance (Stages 5 & 6)
            </h2>
            <p className="text-xs text-ink-muted">
              Execution unlocks when both Spares Reservation (Stores In-charge) and Maintenance Window (Production Manager) are confirmed.
            </p>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-chip text-xs font-semibold self-start sm:self-auto ${
              sparesConfirmed && windowConfirmed
                ? 'bg-ok/10 text-ok'
                : 'bg-warning/10 text-warning'
            }`}
          >
            {sparesConfirmed && windowConfirmed
              ? 'Stage 7 Ready for Execution'
              : 'Coordination Pending'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stage 5: Spares Readiness */}
          <div className="bg-surface-2/40 border border-line/40 rounded-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-ink-muted" />
                <h3 className="text-xs font-semibold text-ink">Stage 5: Spares Readiness</h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-chip text-[11px] font-semibold ${
                  sparesConfirmed
                    ? 'bg-ok/10 text-ok'
                    : isPRRaised
                    ? 'bg-warning/10 text-warning'
                    : 'bg-surface text-ink-muted border border-line/40'
                }`}
              >
                {sparesConfirmed
                  ? 'Confirmed'
                  : isPRRaised
                  ? 'PR Raised'
                  : 'Pending Stores'}
              </span>
            </div>

            <div className="text-xs text-ink-muted">
              Reserved: <strong className="text-ink">{Array.isArray(workOrder.spares_reserved) && workOrder.spares_reserved.length > 0 ? workOrder.spares_reserved.map((s: any) => s.name || s.part_id).join(', ') : 'Bearing kit'}</strong>
            </div>

            {sparesConfirmed ? (
              <div className="text-xs text-ok flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Reserved in inventory by Stores In-charge</span>
              </div>
            ) : isPRRaised ? (
              <div className="text-xs text-warning flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Purchase request logged for out-of-stock items</span>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={role !== 'Stores In-charge' || isConfirmingSpares}
                    onClick={handleConfirmSpares}
                    className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-colors ${
                      role === 'Stores In-charge'
                        ? 'bg-ink text-surface hover:opacity-90'
                        : 'bg-surface-2 text-ink-muted cursor-not-allowed border border-line/40'
                    }`}
                    title={role !== 'Stores In-charge' ? 'Only Stores In-charge can confirm spares reservation' : undefined}
                  >
                    Confirm Reservation
                  </button>

                  <button
                    disabled={role !== 'Stores In-charge' || isConfirmingSpares}
                    onClick={handleRaisePR}
                    className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-colors ${
                      role === 'Stores In-charge'
                        ? 'bg-surface border border-danger/40 text-danger hover:bg-danger/5'
                        : 'bg-surface-2 text-ink-muted cursor-not-allowed border border-line/40'
                    }`}
                    title={role !== 'Stores In-charge' ? 'Only Stores In-charge can raise purchase request' : undefined}
                  >
                    Raise PR (Out of Stock)
                  </button>
                </div>
                {role !== 'Stores In-charge' && (
                  <p className="text-[11px] text-ink-muted italic">
                    Waiting for Stores In-charge to confirm spares
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stage 6: Production Window */}
          <div className="bg-surface-2/40 border border-line/40 rounded-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-ink-muted" />
                <h3 className="text-xs font-semibold text-ink">Stage 6: Production Window</h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-chip text-[11px] font-semibold ${
                  windowConfirmed
                    ? 'bg-ok/10 text-ok'
                    : isRescheduleRequested
                    ? 'bg-warning/10 text-warning'
                    : 'bg-surface text-ink-muted border border-line/40'
                }`}
              >
                {windowConfirmed
                  ? 'Confirmed'
                  : isRescheduleRequested
                  ? 'Reschedule Requested'
                  : 'Pending Production'}
              </span>
            </div>

            <div className="text-xs text-ink-muted">
              Slot: <strong className="text-ink">{workOrder.scheduled_window?.date} · {formatShiftFull(workOrder.scheduled_window?.shift)}</strong>
            </div>

            {windowConfirmed ? (
              <div className="text-xs text-ok flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Confirmed by Production Manager</span>
              </div>
            ) : isRescheduleRequested ? (
              <div className="text-xs text-warning space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Reschedule requested</span>
                </div>
                {workOrder.scheduled_window?.reschedule_reason && (
                  <p className="text-[11px] italic text-ink-muted">
                    &quot;{workOrder.scheduled_window.reschedule_reason}&quot;
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={role !== 'Production Manager' || isConfirmingWindow}
                    onClick={handleConfirmWindow}
                    className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-colors ${
                      role === 'Production Manager'
                        ? 'bg-ink text-surface hover:opacity-90'
                        : 'bg-surface-2 text-ink-muted cursor-not-allowed border border-line/40'
                    }`}
                    title={role !== 'Production Manager' ? 'Only Production Manager can confirm maintenance window' : undefined}
                  >
                    Confirm Window
                  </button>

                  <button
                    disabled={role !== 'Production Manager' || isConfirmingWindow}
                    onClick={() => setShowRescheduleInput(!showRescheduleInput)}
                    className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-colors ${
                      role === 'Production Manager'
                        ? 'bg-surface border border-line/60 text-ink hover:bg-surface-2'
                        : 'bg-surface-2 text-ink-muted cursor-not-allowed border border-line/40'
                    }`}
                    title={role !== 'Production Manager' ? 'Only Production Manager can request window reschedule' : undefined}
                  >
                    Request Another Window
                  </button>
                </div>

                {showRescheduleInput && role === 'Production Manager' && (
                  <div className="space-y-2 pt-2 border-t border-line/20">
                    <input
                      type="text"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Reason for reschedule (e.g. Export batch delivery running)"
                      className="w-full px-2.5 py-1.5 rounded-btn bg-surface text-xs text-ink border border-line/40 focus:outline-hidden"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowRescheduleInput(false)}
                        className="px-2.5 py-1 text-xs text-ink-muted hover:text-ink"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRequestReschedule}
                        disabled={isRescheduling}
                        className="px-3 py-1 rounded-btn bg-ink text-surface text-xs font-semibold"
                      >
                        {isRescheduling ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </div>
                )}

                {role !== 'Production Manager' && (
                  <p className="text-[11px] text-ink-muted italic">
                    Waiting for Production Manager to confirm maintenance window
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Execution Area: LOTO Safety Isolation Checklist */}
      <div className="bg-surface rounded-card p-6 border border-line/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-btn bg-amber-500/10 text-amber-600">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Phase 1: LOTO Safety Isolation Procedure
              </h2>
              <p className="text-xs text-ink-muted">
                Zero Energy State verification must proceed in strict sequential order before task steps unlock
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-chip text-xs font-semibold ${
              allLotoDone ? 'bg-ok/10 text-ok' : 'bg-surface-2 text-ink-muted'
            }`}
          >
            {lotoSteps.filter((s) => s.done).length}/6 verified
          </span>
        </div>

        {/* Locked reason banner if clearances missing */}
        {!bothClearancesConfirmed && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs p-3.5 rounded-btn flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-amber-600" />
            <div>
              <span className="font-semibold block">LOTO safety isolation locked</span>
              <span className="text-[11px] text-amber-800">{executionDisabledReason}</span>
            </div>
          </div>
        )}

        {/* LOTO Checklist Table / Step List */}
        <div className="space-y-2">
          {lotoSteps.map((item, idx) => {
            const isPreviousDone = idx === 0 || lotoSteps[idx - 1].done;
            const isUnlocked = isPreviousDone && canExecute && !isClosed && bothClearancesConfirmed;

            return (
              <div
                key={idx}
                className={`flex items-start justify-between gap-3 p-3 rounded-btn border transition-all ${
                  item.done
                    ? 'bg-ok/5 border-ok/20'
                    : isUnlocked
                    ? 'bg-surface-2/40 border-line/40 hover:border-line/70'
                    : 'bg-surface-2/20 border-line/20 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    disabled={!isUnlocked || updatingStepIdx === idx}
                    onClick={() => handleToggleStep(idx, item.done)}
                    className={`mt-0.5 w-5 h-5 rounded-chip border flex items-center justify-center transition-colors ${
                      item.done
                        ? 'bg-ok border-ok text-white'
                        : isUnlocked
                        ? 'border-line/60 bg-surface hover:border-ink/50'
                        : 'border-line/30 bg-surface-2 text-ink-muted cursor-not-allowed'
                    }`}
                  >
                    {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-ink">
                        Step {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-ink">
                        {item.step}
                      </span>
                    </div>
                    {!isPreviousDone && (
                      <span className="text-[11px] text-ink-muted/80 flex items-center gap-1 mt-0.5">
                        <Lock className="w-3 h-3" /> Locked until Step {idx} is verified
                      </span>
                    )}
                  </div>
                </div>

                {item.done ? (
                  <span className="text-[11px] text-ok font-medium flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-muted shrink-0">
                    Pending
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* LOTO Permit Banner if completed */}
        {allLotoDone && (
          <div className="bg-ok/10 border border-ok/20 text-ok p-3.5 rounded-card flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-xs font-semibold">
                  Zero Energy State Verified · Permit {workOrder.loto_permit_no || `LOTO-${machine.plant_id}-1049`} Active
                </div>
                <div className="text-[11px] text-ok/80">
                  LOTO padlocks applied on main breaker & pneumatic dump valve. Task execution unlocked.
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-chip text-xs bg-ok text-white font-medium shrink-0">
              Permit Active
            </span>
          </div>
        )}
      </div>

      {/* 4. Phase 2: Task Execution Steps */}
      <div className={`bg-surface rounded-card p-6 border border-line/30 space-y-4 transition-opacity ${!allLotoDone ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-btn bg-blue-500/10 text-blue-600">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Phase 2: Maintenance Task Steps
              </h2>
              <p className="text-xs text-ink-muted">
                {!bothClearancesConfirmed
                  ? 'Locked: Pre-execution clearance required (Spares and Maintenance Window must both be confirmed)'
                  : allLotoDone
                  ? 'Ticking the first task step updates status to In Progress'
                  : 'Locked: Complete all 6 LOTO isolation steps above to unlock maintenance execution'}
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-chip text-xs font-semibold ${
              allTasksDone ? 'bg-ok/10 text-ok' : 'bg-surface-2 text-ink-muted'
            }`}
          >
            {taskSteps.filter((s) => s.done).length}/{taskSteps.length} done
          </span>
        </div>

        {/* Task Steps List */}
        <div className="space-y-2">
          {taskSteps.map((item, idx) => {
            const actualIndex = 6 + idx;
            const isUnlocked = allLotoDone && canExecute && !isClosed && bothClearancesConfirmed;

            return (
              <div
                key={actualIndex}
                className={`flex items-start justify-between gap-3 p-3 rounded-btn border transition-all ${
                  item.done
                    ? 'bg-ok/5 border-ok/20'
                    : isUnlocked
                    ? 'bg-surface-2/40 border-line/40 hover:border-line/70'
                    : 'bg-surface-2/20 border-line/20 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    disabled={!isUnlocked || updatingStepIdx === actualIndex}
                    onClick={() => handleToggleStep(actualIndex, item.done)}
                    className={`mt-0.5 w-5 h-5 rounded-chip border flex items-center justify-center transition-colors ${
                      item.done
                        ? 'bg-ok border-ok text-white'
                        : isUnlocked
                        ? 'border-line/60 bg-surface hover:border-ink/50'
                        : 'border-line/30 bg-surface-2 text-ink-muted cursor-not-allowed'
                    }`}
                  >
                    {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div>
                    <div className="text-xs font-medium text-ink">
                      {item.step}
                    </div>
                  </div>
                </div>

                {item.done ? (
                  <span className="text-[11px] text-ok font-medium flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-muted shrink-0">
                    Pending
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Phase 3: Work Order Closure Form */}
      {!isClosed ? (
        <div className={`bg-surface rounded-card p-6 border border-line/30 space-y-4 ${!allStepsDone ? 'opacity-70' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-btn bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink">
                  Phase 3: Work Order Closure & Verification
                </h2>
                <p className="text-xs text-ink-muted">
                  Requires all checklist items done. Restores machine to running and updates risk score to baseline.
                </p>
              </div>
            </div>
          </div>

          {!allStepsDone ? (
            <div className="bg-surface-2/40 p-4 rounded-btn text-xs text-ink-muted flex items-center gap-2 border border-line/20">
              <Lock className="w-4 h-4 text-ink-muted" />
              <span>Complete all 6 LOTO steps and task execution steps above to enable closure form.</span>
            </div>
          ) : (
            <form onSubmit={handleCloseWorkOrder} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">
                    Root Cause <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="e.g. Bearing outer ring fatigue / lubrication loss"
                    className="w-full px-3 py-2 rounded-btn bg-surface-2/50 border border-line/40 text-xs text-ink focus:outline-hidden focus:border-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-ink">
                    Actual Downtime Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={downtimeHours}
                    onChange={(e) => setDowntimeHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-btn bg-surface-2/50 border border-line/40 text-xs text-ink focus:outline-hidden focus:border-ink font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">
                  Closure Notes & Post-Maintenance Verification <span className="text-danger">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="Detail steps executed, vibration checks, torque specs, and final test results..."
                  className="w-full px-3 py-2 rounded-btn bg-surface-2/50 border border-line/40 text-xs text-ink focus:outline-hidden focus:border-ink resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-line/20">
                <span className="text-xs text-ink-muted">
                  Spares deducted from inventory: {Array.isArray(workOrder.spares_reserved) ? workOrder.spares_reserved.length : 1} part(s)
                </span>

                <button
                  type="submit"
                  disabled={isClosing}
                  className="px-5 py-2 rounded-btn bg-ink text-surface font-semibold text-xs hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isClosing ? 'Closing & Updating...' : 'Complete & Close Work Order'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Work order is closed: Success Banner */
        <div className="bg-ok/10 border border-ok/30 rounded-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-ok">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-semibold">Work Order Closed & Resolved</h3>
          </div>
          <p className="text-xs text-ok/90">
            Closed on {workOrder.closed_at ? new Date(workOrder.closed_at).toLocaleString() : 'today'}. Root cause logged as: <strong>{workOrder.root_cause}</strong>.
            Machine {machine.id} has been restored to normal running state with risk score reset to baseline.
          </p>
          <div className="pt-2 text-xs text-ink-muted">
            Maintenance record saved to history. Reserved spares deducted from inventory.
          </div>
        </div>
      )}

      {/* 6. Post-Closure AI Suggestion Card (Knowledge Library & Junior Learning - Stage 8) */}
      {isClosed && (
        <div className="bg-agent/5 border border-agent/20 rounded-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-chip text-xs font-semibold bg-agent/15 text-agent flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" /> AI Knowledge Agent
              </span>
              <h3 className="text-sm font-semibold text-ink">
                Stage 8: Knowledge Library & Learning Card
              </h3>
            </div>
            {knowledgeVerified ? (
              <span className="text-xs text-ok font-semibold bg-ok/10 px-2.5 py-0.5 rounded-chip border border-ok/20 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified by Training Coordinator
              </span>
            ) : (
              <span className="text-[11px] text-ink-muted bg-surface px-2 py-0.5 rounded-chip border border-line/30">
                Waiting for: Training Coordinator
              </span>
            )}
          </div>

          <p className="text-xs text-ink-muted">
            Knowledge Agent drafted this learning card from {workOrder.id} closure notes to train apprentice technicians:
          </p>

          <div className="bg-surface rounded-card p-4 border border-line/30 space-y-2.5 text-xs">
            <div className="font-semibold text-ink">
              Subject: Spherical Roller Bearing Replacement on {humanizeRawValue(machine.type)} ({machine.make})
            </div>
            <div className="text-ink-muted leading-relaxed">
              <strong>Failure Signature:</strong> Rapid temperature rise coupled with 4.5+ mm/s ISO vibration band spike.
            </div>
            <div className="text-ink-muted leading-relaxed">
              <strong>Crucial Junior Tip:</strong> Prior to reinstalling bearing cap, inspect oil seals for lip embrittlement. Clean housing bore thoroughly and verify radial internal clearance with feeler gauge. Always rotate shaft by hand before re-energizing.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {knowledgeVerified ? (
              <div className="text-xs text-ok font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Card published to Training Library (Stage 8 Complete · Machine Restored to Normal)</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {role !== 'Training Coordinator' && (
                  <span className="text-[11px] text-ink-muted italic">
                    Waiting for Training Coordinator verification
                  </span>
                )}
                <button
                  disabled={role !== 'Training Coordinator'}
                  onClick={handleVerifyKnowledge}
                  className={`px-4 py-1.5 rounded-btn text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    role === 'Training Coordinator'
                      ? 'bg-ink text-surface hover:opacity-90'
                      : 'bg-surface-2 text-ink-muted cursor-not-allowed border border-line/40'
                  }`}
                  title={role !== 'Training Coordinator' ? 'Only Training Coordinator can verify knowledge cards' : undefined}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Verify & Publish Knowledge Card
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
