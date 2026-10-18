import { getPmPlansSync } from './data/pmPlan';
import { getMachinesSync } from './data/machines';
import { getAlertsSync } from './data/alerts';
import { getObservationsSync } from './data/observations';
import { getSensorReadingsForMachineSync } from './data/sensorReadings';
import { checkPmDueDate } from './guardrails';
import { executeAgent } from './agents';

export interface PmOptimiserDecision {
  pm_task_id: string;
  machine_id: string;
  decision: 'keep' | 'defer' | 'pull_forward';
  current_due_date: string;
  new_due_date: string;
  confidence: number;
  reason: string;
  evidence_ids: string[];
  risk_if_wrong: 'low' | 'medium' | 'high';
}

export interface PmOptimiserSummary {
  tasks_reviewed: number;
  keep: number;
  defer: number;
  pull_forward: number;
  visits_avoided: number;
  technician_hours_saved: number;
  planned_downtime_hours_saved: number;
  headline: string;
}

export interface PmOptimiserResult {
  plant_id: string;
  summary: PmOptimiserSummary;
  decisions: PmOptimiserDecision[];
  provider?: string;
  cached_note?: string;
}

/**
 * Deterministic rule-based calculation matching prompts/pm_optimiser.md.
 */
export function computeRuleBasedPmOptimiser(plantId = 'P-07'): PmOptimiserResult {
  const pmTasks = getPmPlansSync(plantId);
  const machines = getMachinesSync(plantId);
  const alerts = getAlertsSync(plantId);
  const observations = getObservationsSync(plantId);

  const decisions: PmOptimiserDecision[] = [];

  for (const task of pmTasks) {
    const machine = machines.find((m) => m.id === task.machine_id);
    const machineCriticality = machine?.criticality || 'B';
    const hasSensors = Boolean(machine?.has_sensors);

    // Open alerts for this machine
    const machineAlerts = alerts.filter(
      (a) =>
        a.machine_id === task.machine_id &&
        (a.status === 'pending' || a.status === 'needs_review' || a.status === 'approved')
    );
    const activeAlert = machineAlerts.find((a) => a.urgency === 'P1') || machineAlerts[0];

    // Recent observations for this machine
    const machineObs = observations.filter((o) => o.machine_id === task.machine_id);
    const recentObs = machineObs[0];

    // Sensor readings for sensor machines
    const readings = hasSensors ? getSensorReadingsForMachineSync(task.machine_id, 14) : [];
    const latestReading = readings[readings.length - 1];

    let decision: 'keep' | 'defer' | 'pull_forward' = 'keep';
    let newDueDate = task.due_date;
    let confidence = 0.85;
    let reason = 'Baseline condition normal; maintain scheduled visit interval.';
    const evidenceIds: string[] = [task.machine_id];
    let riskIfWrong: 'low' | 'medium' | 'high' = 'medium';

    const originalDate = new Date(task.due_date);
    const isOverdue = originalDate < new Date('2026-10-18');

    // Rule 2: PULL_FORWARD when machine has open alert, recent observation, or rising sensor trend
    if (activeAlert) {
      decision = 'pull_forward';
      confidence = 0.92;
      evidenceIds.push(activeAlert.id);
      reason = `Open alert ${activeAlert.id} (${activeAlert.urgency}) detected. Pulling forward PM visit to align with intervention.`;
      riskIfWrong = 'low';

      const windowDate = activeAlert.proposed_window?.date;
      if (windowDate && new Date(windowDate) <= originalDate) {
        newDueDate = windowDate;
      } else {
        const pullDate = new Date(Math.min(originalDate.getTime() - 86400000 * 3, Date.now() + 86400000 * 2));
        newDueDate = pullDate.toISOString().slice(0, 10);
      }
    } else if (hasSensors && latestReading && latestReading.vibration_mm_s >= 4.5) {
      decision = 'pull_forward';
      confidence = 0.88;
      evidenceIds.push(`telemetry-${latestReading.date}`);
      reason = `Sensor telemetry shows elevated vibration (${latestReading.vibration_mm_s} mm/s). Moving visit forward for early inspection.`;
      riskIfWrong = 'low';
      const pullDate = new Date(Math.min(originalDate.getTime() - 86400000 * 5, Date.now() + 86400000 * 3));
      newDueDate = pullDate.toISOString().slice(0, 10);
    } else if (recentObs && (recentObs.symptom_tags?.length || 0) > 0) {
      decision = 'pull_forward';
      confidence = 0.82;
      evidenceIds.push(recentObs.id);
      reason = `Recent floor observation ${recentObs.id} flagged sensory cues (${recentObs.symptom_tags.join(', ')}).`;
      riskIfWrong = 'low';
      const pullDate = new Date(Math.min(originalDate.getTime() - 86400000 * 4, Date.now() + 86400000 * 2));
      newDueDate = pullDate.toISOString().slice(0, 10);
    }
    // Rule 3: DEFER only when conditions met
    else if (!isOverdue) {
      if (hasSensors) {
        const allNormal = readings.length > 0 && readings.every((r) => r.vibration_mm_s < 3.5 && r.data_quality === 'ok');
        if (allNormal && machineObs.length === 0) {
          decision = 'defer';
          confidence = 0.9;
          riskIfWrong = machineCriticality === 'A' ? 'medium' : 'low';
          evidenceIds.push(`telemetry-7d`);
          const deferDays = machineCriticality === 'A' ? 25 : machineCriticality === 'B' ? 35 : 45;
          reason = `Sensor telemetry confirms stable baseline for 14 days with zero open defects. Safe to defer by ${deferDays} days.`;
          const deferDate = new Date(originalDate.getTime() + deferDays * 86400000);
          newDueDate = deferDate.toISOString().slice(0, 10);
        }
      } else if (machineCriticality === 'C' && machineObs.length === 0) {
        decision = 'defer';
        confidence = 0.78;
        riskIfWrong = 'low';
        const deferDays = Math.floor((task.interval_days || 30) / 2);
        reason = `Criticality C legacy machine with clean maintenance record. Safe to defer by ${deferDays} days.`;
        const deferDate = new Date(originalDate.getTime() + deferDays * 86400000);
        newDueDate = deferDate.toISOString().slice(0, 10);
      }
    }

    // Rule 4: KEEP fallback
    if (decision === 'keep') {
      newDueDate = task.due_date;
      if (isOverdue) {
        reason = 'Task is currently overdue. Cannot defer; keep visit scheduled immediately.';
        confidence = 0.95;
        riskIfWrong = 'high';
      } else if (!hasSensors && machineCriticality !== 'C') {
        reason = `Criticality ${machineCriticality} machine without continuous telemetry. Statutory calendar schedule maintained.`;
        confidence = 0.85;
        riskIfWrong = 'medium';
      }
    }

    // ENFORCE GUARDRAIL: keep and pull_forward may NEVER move a date later than original
    const guardrailCheck = checkPmDueDate(decision, task.due_date, newDueDate);
    if (!guardrailCheck.pass) {
      newDueDate = task.due_date;
      if (decision === 'pull_forward') {
        const earlier = new Date(originalDate.getTime() - 86400000 * 2);
        newDueDate = earlier.toISOString().slice(0, 10);
      }
    }

    // Rule 9 Prompt Sync: If a task is already due today or earlier, keep its current date and label it keep with reason "due now"
    if (decision === 'pull_forward' && originalDate <= new Date('2026-10-18')) {
      decision = 'keep';
      newDueDate = task.due_date;
      reason = 'due now';
    }

    decisions.push({
      pm_task_id: task.id,
      machine_id: task.machine_id,
      decision,
      current_due_date: task.due_date,
      new_due_date: newDueDate,
      confidence,
      reason,
      evidence_ids: evidenceIds,
      risk_if_wrong: riskIfWrong,
    });
  }

  // Aggregate summary
  const keepCount = decisions.filter((d) => d.decision === 'keep').length;
  const deferCount = decisions.filter((d) => d.decision === 'defer').length;
  const pullCount = decisions.filter((d) => d.decision === 'pull_forward').length;

  const hoursPerTask = 2.5;
  const techHoursSaved = deferCount * hoursPerTask;
  const plannedDowntimeSaved = deferCount * 1.5;

  const headline = `Reviewed ${decisions.length} upcoming tasks for ${plantId}: safely deferred ${deferCount} tasks, pulled forward ${pullCount} urgent interventions, avoiding ${deferCount} visits and saving ${techHoursSaved} technician hours.`;

  return {
    plant_id: plantId,
    summary: {
      tasks_reviewed: decisions.length,
      keep: keepCount,
      defer: deferCount,
      pull_forward: pullCount,
      visits_avoided: deferCount,
      technician_hours_saved: techHoursSaved,
      planned_downtime_hours_saved: plannedDowntimeSaved,
      headline,
    },
    decisions,
  };
}

/**
 * Service function for PM Optimiser.
 * Wires to live AI agent layer with fallback to deterministic logic.
 */
export async function pmOptimiserService(plantId = 'P-07'): Promise<PmOptimiserResult> {
  const pmTasks = getPmPlansSync(plantId);
  const machines = getMachinesSync(plantId);
  const alerts = getAlertsSync(plantId);
  const observations = getObservationsSync(plantId);

  // Format context matching make/test_payload_pm_optimiser.json
  const formattedTasks = pmTasks.map((task) => {
    const machine = machines.find((m) => m.id === task.machine_id);
    const machineAlerts = alerts.filter(
      (a) => a.machine_id === task.machine_id && a.status !== 'rejected' && a.status !== 'suppressed'
    );
    const machineObs = observations.filter((o) => o.machine_id === task.machine_id);
    const readings = machine?.has_sensors ? getSensorReadingsForMachineSync(task.machine_id, 7) : [];
    const latest = readings[readings.length - 1];

    return {
      pm_task_id: task.id,
      machine: {
        id: machine?.id || task.machine_id,
        name: machine?.name || task.machine_id,
        type: (machine as any)?.type || 'conveyor_drive',
        criticality: machine?.criticality || 'B',
        has_sensors: Boolean(machine?.has_sensors),
      },
      task: task.task_name,
      due_date: task.due_date,
      interval_days: task.interval_days || 30,
      statutory_or_safety: false,
      sensor_summary: latest
        ? {
            severity_7d: latest.vibration_mm_s >= 4.5 ? 'alarm' : 'normal',
            vibration_now: latest.vibration_mm_s,
            vibration_baseline: 2.0,
            vibration_7d_trend_pct: 5,
            temp_rise_c: 1.0,
            data_quality: latest.data_quality || 'ok',
          }
        : null,
      last_two_pm_visits: [],
      open_alerts: machineAlerts.slice(0, 2),
      recent_observations: machineObs.slice(0, 2),
    };
  });

  const context = {
    plant_id: plantId,
    today: '2026-10-18',
    tasks: formattedTasks,
  };

  const agentResult = await executeAgent<PmOptimiserResult>({
    agent: 'pm_optimiser',
    plant_id: plantId,
    trigger: 'user_request',
    prompt_version: 'pm-v1.0',
    context,
    ruleBasedFallback: () => computeRuleBasedPmOptimiser(plantId),
  });

  return {
    ...agentResult.data,
    provider: agentResult.provider,
    cached_note: agentResult.cached_note,
  };
}
