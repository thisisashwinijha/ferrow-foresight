import { Machine, Alert, WorkOrder, MachineCriticality, AlertUrgency } from './types';

export type MachineLifecycleState = 'alert' | 'in_progress' | 'scheduled' | 'normal';

export interface DerivedMachineTileState {
  state: MachineLifecycleState;
  urgency?: AlertUrgency;
  alertId?: string;
  workOrderId?: string;
  badgeLabel: string;
  detailLabel: string;
  iconType: 'alert' | 'wrench' | 'calendar' | 'normal';
  isAbnormal: boolean;
  colorClasses: {
    tileBg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type:
    | 'alert_raised'
    | 'alert_approved'
    | 'alert_rejected'
    | 'alert_resolved'
    | 'alert_escalated'
    | 'spares_confirmed'
    | 'purchase_request_raised'
    | 'window_confirmed'
    | 'window_reschedule'
    | 'loto_applied'
    | 'wo_started'
    | 'wo_closed';
  title: string;
  description: string;
  machineId: string;
  alertId?: string;
  workOrderId?: string;
  badge: {
    label: string;
    variant: 'alarm' | 'warning' | 'ok' | 'neutral' | 'agent';
  };
}

export function getBaselineRiskScore(criticality: MachineCriticality): number {
  switch (criticality) {
    case 'A':
      return 14;
    case 'B':
      return 9;
    case 'C':
    default:
      return 5;
  }
}

export function getBaselineHealthScore(criticality: MachineCriticality): number {
  return 100 - getBaselineRiskScore(criticality);
}

/**
 * Formats a failure mode string into clean, human-readable sentence case.
 * e.g. "electrical_fault" -> "Electrical fault"
 *      "bearing_wear" -> "Bearing wear"
 *      "BEARING WEAR" -> "Bearing wear"
 */
export function formatFailureMode(mode?: string | null): string {
  if (!mode) return '';
  const clean = mode.replace(/_/g, ' ').trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Formats an observation symptom tag into a readable chip text.
 * e.g. "sound:grinding" -> "Sound: grinding"
 *      "heat:hot_to_touch" -> "Heat: hot to touch"
 *      "visual:smoke" -> "Visual: smoke"
 */
export function formatObservationTag(tag?: string | null): string {
  if (!tag) return '';
  const clean = tag.replace(/^#/, '').trim();
  if (!clean.includes(':')) {
    return clean.charAt(0).toUpperCase() + clean.slice(1).replace(/_/g, ' ');
  }
  const [category, ...rest] = clean.split(':');
  const catCapitalized = category.charAt(0).toUpperCase() + category.slice(1);
  const detail = rest.join(':').replace(/_/g, ' ');
  return `${catCapitalized}: ${detail}`;
}

/**
 * Shared Lifecycle Derivation function:
 * Derives machine tile state in one authoritative place:
 * open alert (urgency colour) > work order in_progress or loto_applied (wrench, "In progress") > work order scheduled/approved (neutral tile with calendar icon and "WO-id · date, shift") > normal.
 * IMPORTANT: Under maintenance NEVER uses alarm colours!
 */
export function getDerivedMachineTileState(
  machine: Machine,
  alerts: Alert[] = [],
  workOrders: WorkOrder[] = []
): DerivedMachineTileState {
  // 1. Priority: Open Alert (pending or needs_review), highest urgency first
  const openAlerts = alerts.filter(
    (a) => a.machine_id === machine.id && (a.status === 'pending' || a.status === 'needs_review')
  );
  const openAlert =
    openAlerts.find((a) => a.urgency === 'P1') ||
    openAlerts.find((a) => a.urgency === 'P2') ||
    openAlerts[0];

  if (openAlert) {
    const isP1 = openAlert.urgency === 'P1';
    const isP2 = openAlert.urgency === 'P2';
    const isP3 = openAlert.urgency === 'P3';

    return {
      state: 'alert',
      urgency: openAlert.urgency,
      alertId: openAlert.id,
      badgeLabel: openAlert.urgency || 'Alert',
      detailLabel: formatFailureMode(openAlert.failure_mode) || 'Needs attention',
      iconType: 'alert',
      isAbnormal: true,
      colorClasses: {
        tileBg: isP1 ? 'bg-alarm/10' : isP2 ? 'bg-amber-500/10' : 'bg-yellow-500/10',
        border: isP1 ? 'border-alarm/40' : isP2 ? 'border-amber-500/40' : 'border-yellow-500/40',
        text: isP1 ? 'text-alarm' : isP2 ? 'text-amber-600 dark:text-amber-400' : 'text-yellow-600 dark:text-yellow-400',
        badgeBg: isP1 ? 'bg-alarm text-white' : isP2 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
        badgeText: isP1 ? 'text-white' : isP2 ? 'text-amber-700 dark:text-amber-300' : 'text-yellow-700 dark:text-yellow-300',
      },
    };
  }

  // 2. Priority: Work Order in_progress or loto_applied
  const activeWO = workOrders.find(
    (wo) =>
      wo.machine_id === machine.id &&
      (wo.status === 'in_progress' || wo.status === 'loto_applied')
  );

  if (activeWO) {
    const statusText = activeWO.status === 'loto_applied' ? 'LOTO applied' : 'In progress';
    return {
      state: 'in_progress',
      workOrderId: activeWO.id,
      badgeLabel: statusText,
      detailLabel: `${activeWO.id} · ${statusText}`,
      iconType: 'wrench',
      isAbnormal: true,
      // Under maintenance NEVER uses alarm colours: neutral surface tint
      colorClasses: {
        tileBg: 'bg-surface-2',
        border: 'border-line/70',
        text: 'text-ink',
        badgeBg: 'bg-ink/10',
        badgeText: 'text-ink font-medium',
      },
    };
  }

  // 3. Priority: Work Order scheduled or approved
  const scheduledWO = workOrders.find(
    (wo) =>
      wo.machine_id === machine.id &&
      (wo.status === 'scheduled' || wo.status === 'approved')
  );

  if (scheduledWO) {
    const windowDate = scheduledWO.scheduled_window?.date || 'Upcoming';
    const windowShift = scheduledWO.scheduled_window?.shift || 'Shift';
    return {
      state: 'scheduled',
      workOrderId: scheduledWO.id,
      badgeLabel: 'Scheduled',
      detailLabel: `${scheduledWO.id} · ${windowDate}, ${windowShift}`,
      iconType: 'calendar',
      isAbnormal: false, // Scheduled PM/CBM is planned, renders neutral tile
      colorClasses: {
        tileBg: 'bg-surface-2/60',
        border: 'border-line/40',
        text: 'text-ink-muted',
        badgeBg: 'bg-surface-2 text-ink-muted',
        badgeText: 'text-ink-muted',
      },
    };
  }

  // 4. Priority: Normal
  return {
    state: 'normal',
    badgeLabel: 'Running',
    detailLabel: 'Nominal',
    iconType: 'normal',
    isAbnormal: false,
    colorClasses: {
      tileBg: 'bg-surface-2/30',
      border: 'border-transparent',
      text: 'text-ink-muted',
      badgeBg: 'bg-ink/5',
      badgeText: 'text-ink-muted',
    },
  };
}

/**
 * Builds the chronological list of lifecycle events for Recent Activity:
 * - Alert raised
 * - Alert approved
 * - Alert rejected
 * - LOTO applied
 * - Work order started (in_progress)
 * - Work order closed (resolved)
 */
export function getRecentActivityEvents(
  alerts: Alert[] = [],
  workOrders: WorkOrder[] = []
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // 1. Alert events
  for (const alert of alerts) {
    // Alert raised event
    events.push({
      id: `evt-raise-${alert.id}`,
      timestamp: alert.created_at,
      type: 'alert_raised',
      title: `Alert raised: ${formatFailureMode(alert.failure_mode)}`,
      description: `${alert.id} (${alert.urgency}) trigger: ${alert.trigger}`,
      machineId: alert.machine_id,
      alertId: alert.id,
      badge: {
        label: alert.urgency || 'Alert',
        variant: alert.urgency === 'P1' ? 'alarm' : 'warning',
      },
    });

    // Escalated to Plant Head
    if (alert.decision_reason === 'sent_to_plant_head') {
      events.push({
        id: `evt-sent-ph-${alert.id}`,
        timestamp: alert.created_at,
        type: 'alert_escalated',
        title: `Sent to Plant Head: ${alert.id}`,
        description: `Maintenance Planner forwarded P1 on critical machine ${alert.machine_id} for Plant Head authorization`,
        machineId: alert.machine_id,
        alertId: alert.id,
        badge: {
          label: 'Awaiting Plant Head',
          variant: 'alarm',
        },
      });
    }

    // Alert decision events
    if (alert.status === 'approved') {
      events.push({
        id: `evt-appr-${alert.id}`,
        timestamp: alert.created_at, // or decision time
        type: 'alert_approved',
        title: `Alert approved: ${alert.id}`,
        description: `Approved by ${alert.decided_by || 'Maintenance Planner'} for work order creation`,
        machineId: alert.machine_id,
        alertId: alert.id,
        badge: {
          label: 'Approved',
          variant: 'ok',
        },
      });
    } else if (alert.status === 'rejected') {
      events.push({
        id: `evt-rej-${alert.id}`,
        timestamp: alert.created_at,
        type: 'alert_rejected',
        title: `Alert rejected: ${alert.id}`,
        description: `Reason: ${alert.decision_reason || 'Rejected by planner'}`,
        machineId: alert.machine_id,
        alertId: alert.id,
        badge: {
          label: 'Rejected',
          variant: 'neutral',
        },
      });
    } else if (alert.status === 'resolved') {
      events.push({
        id: `evt-res-${alert.id}`,
        timestamp: (alert as any).resolved_at || alert.created_at,
        type: 'alert_resolved',
        title: `Alert resolved: ${alert.id}`,
        description: `Maintenance closed and machine returned to nominal`,
        machineId: alert.machine_id,
        alertId: alert.id,
        badge: {
          label: 'Resolved',
          variant: 'ok',
        },
      });
    }
  }

  // 2. Work Order events
  for (const wo of workOrders) {
    // Spares confirmation or PR
    const sparesObj = wo.spares_reserved as any;
    const sparesConfirmed = Boolean(
      sparesObj && (sparesObj.confirmed || (Array.isArray(sparesObj) && sparesObj.some((s: any) => s.confirmed)))
    );
    const prRaised = Boolean(
      sparesObj && (sparesObj.purchase_request_raised || (Array.isArray(sparesObj) && sparesObj.some((s: any) => s.purchase_request_raised)))
    );

    if (sparesConfirmed) {
      events.push({
        id: `evt-spares-conf-${wo.id}`,
        timestamp: sparesObj?.confirmed_at || wo.created_at,
        type: 'spares_confirmed',
        title: `Spares confirmed: ${wo.id}`,
        description: `Stores In-charge confirmed parts reservation for machine ${wo.machine_id}`,
        machineId: wo.machine_id,
        workOrderId: wo.id,
        alertId: wo.alert_id,
        badge: {
          label: 'Spares Ready',
          variant: 'ok',
        },
      });
    } else if (prRaised) {
      events.push({
        id: `evt-spares-pr-${wo.id}`,
        timestamp: sparesObj?.requested_at || wo.created_at,
        type: 'purchase_request_raised',
        title: `Purchase request raised: ${wo.id}`,
        description: `Stores In-charge raised PR for out-of-stock spares on machine ${wo.machine_id}`,
        machineId: wo.machine_id,
        workOrderId: wo.id,
        alertId: wo.alert_id,
        badge: {
          label: 'PR Raised',
          variant: 'warning',
        },
      });
    }

    // Window confirmation or reschedule
    const winObj = wo.scheduled_window as any;
    if (winObj && (winObj.confirmed || winObj.production_status === 'confirmed')) {
      events.push({
        id: `evt-win-conf-${wo.id}`,
        timestamp: winObj.confirmed_at || wo.created_at,
        type: 'window_confirmed',
        title: `Window confirmed: ${wo.id}`,
        description: `Production Manager confirmed slot: ${winObj.date || 'upcoming'} Shift ${winObj.shift || 'A'}`,
        machineId: wo.machine_id,
        workOrderId: wo.id,
        alertId: wo.alert_id,
        badge: {
          label: 'Window Locked',
          variant: 'ok',
        },
      });
    } else if (winObj && winObj.production_status === 'reschedule_requested') {
      events.push({
        id: `evt-win-resched-${wo.id}`,
        timestamp: winObj.requested_at || wo.created_at,
        type: 'window_reschedule',
        title: `Reschedule requested: ${wo.id}`,
        description: `Production Manager requested new slot: "${winObj.reschedule_reason || 'Production conflict'}"`,
        machineId: wo.machine_id,
        workOrderId: wo.id,
        alertId: wo.alert_id,
        badge: {
          label: 'Reschedule Req',
          variant: 'warning',
        },
      });
    }

    if (wo.loto_permit_no || wo.status === 'loto_applied' || wo.status === 'in_progress' || wo.status === 'closed') {
      events.push({
        id: `evt-loto-${wo.id}`,
        timestamp: wo.created_at,
        type: 'loto_applied',
        title: `LOTO applied: ${wo.loto_permit_no || `LOTO-${wo.id}`}`,
        description: `Safety isolation verified for ${wo.id} by ${wo.assigned_technician || 'Technician'}`,
        machineId: wo.machine_id,
        workOrderId: wo.id,
        alertId: wo.alert_id,
        badge: {
          label: 'LOTO Applied',
          variant: 'neutral',
        },
      });
    }

    if (wo.status === 'in_progress' || wo.status === 'closed') {
      events.push({
        id: `evt-start-${wo.id}`,
        timestamp: wo.created_at,
        type: 'wo_started',
        title: `Work order in progress: ${wo.id}`,
        description: `Task execution commenced by ${wo.assigned_technician || 'Technician'} on machine ${wo.machine_id}`,
        machineId: wo.machine_id,
        workOrderId: wo.id,
        alertId: wo.alert_id,
        badge: {
          label: 'In Progress',
          variant: 'neutral',
        },
      });
    }

    if (wo.status === 'closed' && wo.closed_at) {
      events.push({
        id: `evt-close-${wo.id}`,
        timestamp: wo.closed_at,
        type: 'wo_closed',
        title: `Work order closed: ${wo.id} (Resolved)`,
        description: `Closed by ${wo.assigned_technician || 'Technician'}. Root cause: ${wo.root_cause || 'Component repaired'}. Machine restored to nominal.`,
        machineId: wo.machine_id,
        workOrderId: wo.id,
        alertId: wo.alert_id,
        badge: {
          label: 'Resolved',
          variant: 'ok',
        },
      });
    }
  }

  // Sort descending by timestamp
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
