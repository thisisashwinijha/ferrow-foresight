'use client';

import React from 'react';
import Link from 'next/link';
import { usePlantContext } from './PlantContext';
import { Alert, WorkOrder, Machine, Spares, Technician, Plant } from '@/lib/types';
import {
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Clock,
  ArrowRight,
  Shield,
  Package,
  Calendar,
  Sparkles,
  HardHat,
  ChevronRight,
} from 'lucide-react';

interface MyTasksViewProps {
  initialAlerts: Alert[];
  initialWorkOrders: WorkOrder[];
  initialMachines: Machine[];
  initialSpares: Spares[];
  initialTechnicians: Technician[];
  initialPlant?: Plant;
}

export function MyTasksView({
  initialAlerts,
  initialWorkOrders,
  initialMachines,
  initialSpares,
  initialTechnicians,
  initialPlant,
}: MyTasksViewProps) {
  const { role, plantId } = usePlantContext();

  const machineMap = new Map(initialMachines.map((m) => [m.id, m]));

  // Helper to format failure mode nicely
  const formatFailure = (mode?: string) => {
    if (!mode) return 'Anomaly detected';
    return mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Collect tasks specific to role
  const tasks: Array<{
    id: string;
    stage: number;
    title: string;
    subtitle: string;
    badge: { label: string; variant: 'alarm' | 'warning' | 'ok' | 'neutral' };
    meta: string[];
    actionLabel: string;
    actionHref: string;
    icon: React.ElementType;
  }> = [];

  // 1. Technician tasks
  if (role === 'Technician') {
    const actionableWos = initialWorkOrders.filter((wo) =>
      ['scheduled', 'loto_applied', 'in_progress', 'ready'].includes(wo.status)
    );

    for (const wo of actionableWos) {
      const machine = machineMap.get(wo.machine_id);
      const isLotoDone =
        Array.isArray(wo.checklist) &&
        wo.checklist.length >= 6 &&
        wo.checklist.slice(0, 6).every((s) => s.done);

      let actionLabel = 'Apply LOTO & Execute';
      if (wo.status === 'in_progress' || (wo.status === 'loto_applied' && isLotoDone)) {
        actionLabel = 'Continue Task Execution';
      } else if (wo.status === 'loto_applied') {
        actionLabel = 'Verify Safety Isolation';
      }

      tasks.push({
        id: `task-${wo.id}`,
        stage: 7,
        title: `${wo.id} · ${machine?.name || wo.machine_id}`,
        subtitle: `Scheduled maintenance on ${machine?.name || wo.machine_id}. Pre-execution clearance confirmed.`,
        badge: {
          label: wo.priority === 'P1' ? 'P1 Priority' : 'P2 Priority',
          variant: wo.priority === 'P1' ? 'alarm' : 'warning',
        },
        meta: [
          `Shift ${wo.scheduled_window?.shift || 'A'} · ${wo.scheduled_window?.date || 'Today'}`,
          `Machine: ${machine?.name || wo.machine_id} (${machine?.line_id || 'Line 1'})`,
          wo.loto_permit_no ? `Permit ${wo.loto_permit_no}` : 'LOTO pending',
        ],
        actionLabel,
        actionHref: `/work-orders/${wo.id}`,
        icon: HardHat,
      });
    }
  }

  // 2. Maintenance Planner tasks
  if (role === 'Maintenance Planner') {
    // Alerts needing planner review or escalation
    const reviewAlerts = initialAlerts.filter(
      (a) =>
        (a.status === 'pending' || a.status === 'needs_review') &&
        a.decision_reason !== 'sent_to_plant_head'
    );

    for (const alert of reviewAlerts) {
      const machine = machineMap.get(alert.machine_id);
      const isCriticalA = (alert as any).criticality === 'A' || alert.machine_id === 'P07-M03';
      const isP1CritA = alert.urgency === 'P1' && isCriticalA;

      tasks.push({
        id: `task-${alert.id}`,
        stage: isP1CritA ? 3 : 3,
        title: `${alert.id} · ${machine?.name || alert.machine_id}`,
        subtitle: isP1CritA
          ? `High-risk anomaly on Criticality A asset. Review evidence to forward for Plant Head sign-off.`
          : `Triaged: ${formatFailure(alert.failure_mode)}. Verify failure mode and assign technician.`,
        badge: {
          label: alert.urgency || 'P2',
          variant: alert.urgency === 'P1' ? 'alarm' : 'warning',
        },
        meta: [
          `Trigger: ${alert.trigger || 'Vibration / Sensory'}`,
          `Confidence: ${Math.round((alert.confidence || 0.85) * 100)}%`,
          `Machine: ${machine?.name || alert.machine_id}`,
        ],
        actionLabel: isP1CritA ? 'Forward to Plant Head' : 'Review & Approve',
        actionHref: `/alerts/${alert.id}`,
        icon: AlertTriangle,
      });
    }

    // Work orders with reschedule requested by Production
    const rescheduleWos = initialWorkOrders.filter(
      (wo) => wo.scheduled_window?.production_status === 'reschedule_requested'
    );

    for (const wo of rescheduleWos) {
      const machine = machineMap.get(wo.machine_id);
      tasks.push({
        id: `task-resched-${wo.id}`,
        stage: 6,
        title: `Reschedule Requested · ${wo.id}`,
        subtitle: `Production Manager requested slot change: "${wo.scheduled_window?.reschedule_reason || 'Production batch delay'}"`,
        badge: {
          label: 'Reschedule',
          variant: 'warning',
        },
        meta: [
          `Machine: ${machine?.name || wo.machine_id}`,
          `Requested slot: ${wo.scheduled_window?.date} Shift ${wo.scheduled_window?.shift}`,
        ],
        actionLabel: 'Adjust Maintenance Window',
        actionHref: `/production`,
        icon: Calendar,
      });
    }
  }

  // 3. Plant Head tasks
  if (role === 'Plant Head') {
    // Criticality A + P1 alerts needing authorization
    const criticalApprovals = initialAlerts.filter(
      (a) =>
        (a.urgency === 'P1' || a.id === 'AL-1001') &&
        (a.decision_reason === 'sent_to_plant_head' || a.status === 'pending' || a.status === 'needs_review') &&
        a.status !== 'approved' &&
        a.status !== 'resolved'
    );

    for (const alert of criticalApprovals) {
      const machine = machineMap.get(alert.machine_id);
      tasks.push({
        id: `task-ph-${alert.id}`,
        stage: 4,
        title: `P1 Authorization · ${machine?.name || alert.machine_id}`,
        subtitle: `Maintenance Planner forwarded high-risk bearing alert on Criticality A asset for authorization.`,
        badge: {
          label: 'Authorization Required',
          variant: 'alarm',
        },
        meta: [
          `Alert ID: ${alert.id}`,
          `Failure mode: ${formatFailure(alert.failure_mode)}`,
          `Machine: ${machine?.name || alert.machine_id} (Criticality ${machine?.criticality || 'A'})`,
        ],
        actionLabel: 'Authorize Work Order',
        actionHref: `/alerts/${alert.id}`,
        icon: Shield,
      });
    }
  }

  // 4. Production Manager tasks
  if (role === 'Production Manager') {
    // Work orders needing window confirmation (Stage 6)
    const pendingWindowWos = initialWorkOrders.filter(
      (wo) =>
        (wo.status === 'approved' || wo.status === 'raised') &&
        !wo.scheduled_window?.confirmed &&
        wo.scheduled_window?.production_status !== 'confirmed' &&
        wo.scheduled_window?.production_status !== 'reschedule_requested'
    );

    for (const wo of pendingWindowWos) {
      const machine = machineMap.get(wo.machine_id);
      tasks.push({
        id: `task-win-${wo.id}`,
        stage: 6,
        title: `Confirm Maintenance Slot · ${wo.id}`,
        subtitle: `Planned maintenance proposed for Shift ${wo.scheduled_window?.shift || 'A'} on ${wo.scheduled_window?.date || 'upcoming date'}.`,
        badge: {
          label: 'Window Clearance',
          variant: 'warning',
        },
        meta: [
          `Proposed slot: ${wo.scheduled_window?.date} Shift ${wo.scheduled_window?.shift}`,
          `Machine: ${machine?.name || wo.machine_id} (${machine?.line_id || 'Line 1'})`,
        ],
        actionLabel: 'Confirm Window in Schedule',
        actionHref: `/work-orders/${wo.id}`,
        icon: Calendar,
      });
    }
  }

  // 5. Stores In-charge tasks
  if (role === 'Stores In-charge') {
    // Work orders needing spares confirmation (Stage 5)
    const pendingSparesWos = initialWorkOrders.filter((wo) => {
      if (wo.status !== 'approved' && wo.status !== 'raised') return false;
      const sparesObj = wo.spares_reserved as any;
      if (!sparesObj) return true;
      if (Array.isArray(sparesObj)) {
        return !sparesObj.some((s: any) => s.confirmed);
      }
      return !sparesObj.confirmed;
    });

    for (const wo of pendingSparesWos) {
      const machine = machineMap.get(wo.machine_id);
      const sparesList = Array.isArray(wo.spares_reserved)
        ? wo.spares_reserved.map((s: any) => s.name || s.part_id).join(', ')
        : 'Spherical roller bearing (1)';

      tasks.push({
        id: `task-spares-${wo.id}`,
        stage: 5,
        title: `Spares Reservation · ${wo.id}`,
        subtitle: `Work order approved for maintenance. Parts required: ${sparesList}.`,
        badge: {
          label: 'Spares Required',
          variant: 'warning',
        },
        meta: [
          `Parts required: ${sparesList}`,
          `Machine: ${machine?.name || wo.machine_id}`,
          `Window: Shift ${wo.scheduled_window?.shift || 'A'}`,
        ],
        actionLabel: 'Confirm Spares Reservation',
        actionHref: `/work-orders/${wo.id}`,
        icon: Package,
      });
    }

    // Low stock items needing purchase request
    const lowStock = initialSpares.filter((s) => s.stock <= s.min_level);
    for (const spare of lowStock.slice(0, 3)) {
      tasks.push({
        id: `task-stock-${spare.id}`,
        stage: 5,
        title: `Low Stock Alert · ${spare.name}`,
        subtitle: `Inventory level (${spare.stock} units) is at or below reorder threshold (${spare.min_level} units).`,
        badge: {
          label: 'Reorder Flagged',
          variant: 'alarm',
        },
        meta: [
          `Part No: ${spare.part_no}`,
          `Lead time: ${spare.lead_time_days} days`,
          `Stock: ${spare.stock} / Min: ${spare.min_level}`,
        ],
        actionLabel: 'Open Spares Management',
        actionHref: `/spares`,
        icon: Package,
      });
    }
  }

  // 6. Training Coordinator tasks
  if (role === 'Training Coordinator') {
    // Closed work orders awaiting knowledge card verification (Stage 8)
    const closedWos = initialWorkOrders.filter((wo) => wo.status === 'closed');
    for (const wo of closedWos) {
      const machine = machineMap.get(wo.machine_id);
      tasks.push({
        id: `task-know-${wo.id}`,
        stage: 8,
        title: `Verify Learning Card · ${wo.id}`,
        subtitle: `Maintenance completed. AI synthesized lesson learned on "${wo.root_cause || 'Bearing replacement'}".`,
        badge: {
          label: 'Verification Pending',
          variant: 'ok',
        },
        meta: [
          `Root cause: ${wo.root_cause || 'Spherical roller bearing spalling'}`,
          `Machine: ${machine?.name || wo.machine_id}`,
          `Executed by: ${wo.assigned_technician || 'Technician'}`,
        ],
        actionLabel: 'Verify & Publish Card',
        actionHref: `/work-orders/${wo.id}`,
        icon: Sparkles,
      });
    }

    // Expiring technician certs
    const expiringTechs = initialTechnicians.filter(
      (t) => t.id === 'P07-T03' || t.name.toLowerCase().includes('anita')
    );
    for (const tech of expiringTechs) {
      tasks.push({
        id: `task-cert-${tech.id}`,
        stage: 8,
        title: `Certification Recertification · ${tech.name}`,
        subtitle: `Apprentice technician shadow qualification due for review.`,
        badge: {
          label: 'Recertification',
          variant: 'warning',
        },
        meta: [
          `Technician: ${tech.name} (${tech.id})`,
          `Role: ${tech.role}`,
          `Shift: Shift ${tech.shift}`,
        ],
        actionLabel: 'Review Technician in People',
        actionHref: `/people`,
        icon: HardHat,
      });
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/30 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">
            My tasks
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Action items waiting for <strong>{role}</strong> in {initialPlant?.city || plantId}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-chip text-xs font-semibold bg-surface border border-line/40 text-ink">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} waiting
          </span>
        </div>
      </div>

      {/* Task List or Empty State */}
      {tasks.length === 0 ? (
        <div className="bg-surface rounded-card p-12 border border-line/30 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-ok/10 text-ok flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-ink">
            Nothing waiting for you
          </h2>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            All tasks, approvals, and clearances for <strong>{role}</strong> in {initialPlant?.city || plantId} are completely up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <div
                key={task.id}
                className="bg-surface rounded-card p-5 border border-line/30 hover:border-line/70 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-chip text-[11px] font-semibold ${
                        task.badge.variant === 'alarm'
                          ? 'bg-danger/10 text-danger'
                          : task.badge.variant === 'warning'
                          ? 'bg-warning/10 text-warning'
                          : task.badge.variant === 'ok'
                          ? 'bg-ok/10 text-ok'
                          : 'bg-surface-2 text-ink-muted'
                      }`}
                    >
                      {task.badge.label}
                    </span>

                    <span className="px-2 py-0.5 rounded-chip text-[10px] font-mono font-medium bg-surface-2 text-ink-muted">
                      Stage {task.stage}
                    </span>

                    <h3 className="text-sm font-semibold text-ink truncate">
                      {task.title}
                    </h3>
                  </div>

                  <p className="text-xs text-ink-muted line-clamp-2">
                    {task.subtitle}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-ink-muted flex-wrap pt-0.5">
                    {task.meta.map((m, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span>·</span>}
                        <span>{m}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Exactly One Primary Action Button */}
                <div className="shrink-0 self-end md:self-center">
                  <Link
                    href={task.actionHref}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-ink text-surface text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
                  >
                    <span>{task.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
