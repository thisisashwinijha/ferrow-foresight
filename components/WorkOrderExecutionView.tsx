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
import { usePlantContext } from './PlantContext';
import { useToast } from './ToastContext';
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

  // Permission logic
  const allowedRoles = ['Plant Head', 'Head of Plant Operations', 'Maintenance Planner', 'plant_head'];
  const isPlannerOrHead = allowedRoles.includes(role);
  const isAssignedTech = workOrder.assigned_technician === activeTechId;
  const canExecute = isPlannerOrHead || isAssignedTech;

  // Handle toggling step
  const handleToggleStep = async (stepIndex: number, currentDone: boolean) => {
    if (!canExecute || isClosed) return;

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
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                    : workOrder.status === 'loto_applied'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'bg-surface-2 text-ink-muted'
                }`}
              >
                {workOrder.status.replace('_', ' ')}
              </span>

              {/* LOTO Permit pill */}
              {workOrder.loto_permit_no && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-chip text-xs font-mono font-medium bg-ok/10 text-ok border border-ok/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {workOrder.loto_permit_no}
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

          {/* Persona Swapping for verification */}
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
        </div>

        {/* Info Grid: Window, Techs, Spares */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-line/20 text-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] text-ink-muted">Scheduled Window</span>
            <div className="font-medium text-ink flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
              <span>{workOrder.scheduled_window?.date} · {workOrder.scheduled_window?.shift}</span>
            </div>
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

        {/* Permission Read-only Warning Notice */}
        {!canExecute && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs p-3 rounded-btn flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Read-only view:</strong> Step execution is restricted to assigned technician{' '}
              <strong>{assignedTechObj?.name || workOrder.assigned_technician}</strong> or users with Plant Head / Maintenance Planner role.
            </span>
          </div>
        )}
      </div>

      {/* 3. Main Execution Area: LOTO Safety Isolation Checklist */}
      <div className="bg-surface rounded-card p-6 border border-line/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-btn bg-amber-500/10 text-amber-600 dark:text-amber-400">
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

        {/* LOTO Checklist Table / Step List */}
        <div className="space-y-2">
          {lotoSteps.map((item, idx) => {
            const isPreviousDone = idx === 0 || lotoSteps[idx - 1].done;
            const isUnlocked = isPreviousDone && canExecute && !isClosed;

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
            <div className="p-1.5 rounded-btn bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Phase 2: Maintenance Task Steps
              </h2>
              <p className="text-xs text-ink-muted">
                {allLotoDone
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
            const isUnlocked = allLotoDone && canExecute && !isClosed;

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
              <div className="p-1.5 rounded-btn bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
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

      {/* 6. Post-Closure AI Suggestion Card (Knowledge Library & Junior Learning) */}
      {isClosed && (
        <div className="bg-agent/5 border border-agent/20 rounded-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-chip text-xs font-semibold bg-agent/15 text-agent flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" /> AI Suggestion
              </span>
              <h3 className="text-sm font-semibold text-ink">
                Knowledge Library & Junior Learning Card
              </h3>
            </div>
            <span className="text-[11px] text-ink-muted bg-surface px-2 py-0.5 rounded-chip border border-line/30">
              Awaiting veteran approval
            </span>
          </div>

          <p className="text-xs text-ink-muted">
            The system synthesized this lesson learned from the {workOrder.id} closure notes to train apprentice technicians:
          </p>

          <div className="bg-surface rounded-card p-4 border border-line/30 space-y-2.5 text-xs">
            <div className="font-semibold text-ink">
              Subject: Spherical Roller Bearing Replacement on {machine.type} ({machine.make})
            </div>
            <div className="text-ink-muted leading-relaxed">
              <strong>Failure Signature:</strong> Rapid temperature rise coupled with 4.5+ mm/s ISO vibration band spike.
            </div>
            <div className="text-ink-muted leading-relaxed">
              <strong>Crucial Junior Tip:</strong> Prior to reinstalling bearing cap, inspect oil seals for lip embrittlement. Clean housing bore thoroughly and verify radial internal clearance with feeler gauge. Always rotate shaft by hand before re-energizing.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => showToast('Knowledge entry acknowledged. Pending veteran technician sign-off.', 'info')}
              className="px-4 py-1.5 rounded-btn bg-surface border border-line/40 text-xs font-medium text-ink hover:bg-surface-2 transition-colors"
            >
              Approve for Knowledge Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
