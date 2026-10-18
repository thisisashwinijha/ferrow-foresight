import { getPmPlansSync } from './data/pmPlan';
import { getMachinesSync } from './data/machines';
import { getAlertsSync } from './data/alerts';
import { getObservationsSync } from './data/observations';
import { getSensorReadingsForMachineSync } from './data/sensorReadings';
import { checkPmDueDate } from './guardrails';

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
}

/**
 * Service function for PM Optimiser.
 * Analyzes upcoming PM tasks against live machine condition, alerts, and sensory observations.
 * Adheres strictly to prompts/pm_optimiser.md rules and enforces guardrails.
 */
export async function pmOptimiserService(plantId = 'P-07'): Promise<PmOptimiserResult> {
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

      // Due date set to alert proposed window date or within 3 days
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
      // Force date to comply with safety rule
      newDueDate = task.due_date;
      if (decision === 'pull_forward') {
        const earlier = new Date(originalDate.getTime() - 86400000 * 2);
        newDueDate = earlier.toISOString().slice(0, 10);
      } else {
        decision = 'keep';
      }
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

  const keepCount = decisions.filter((d) => d.decision === 'keep').length;
  const deferCount = decisions.filter((d) => d.decision === 'defer').length;
  const pullCount = decisions.filter((d) => d.decision === 'pull_forward').length;

  const visitsAvoided = deferCount;
  const techHoursSaved = parseFloat((deferCount * 1.5).toFixed(1));
  const plannedDowntimeSaved = techHoursSaved;

  const headline = `AI reviewed ${decisions.length} upcoming tasks: recommended ${deferCount} safe deferrals saving ${techHoursSaved} technician hours, and pulled forward ${pullCount} at-risk tasks.`;

  return {
    plant_id: plantId,
    summary: {
      tasks_reviewed: decisions.length,
      keep: keepCount,
      defer: deferCount,
      pull_forward: pullCount,
      visits_avoided: visitsAvoided,
      technician_hours_saved: techHoursSaved,
      planned_downtime_hours_saved: plannedDowntimeSaved,
      headline,
    },
    decisions,
  };
}
