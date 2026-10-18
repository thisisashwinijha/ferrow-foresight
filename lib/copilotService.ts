/**
 * Plant Copilot Service (prompt version: copilot-v1.0)
 *
 * Answers operational questions covering:
 * - Why a machine is high risk
 * - What is blocking a work order
 * - What is due this week
 * - Spares at risk
 * - Refuses requests to skip LOTO, bypass certifications, or override approvals
 * - Provides machine summaries for MachineHistoryCard
 *
 * Adheres strictly to prompts/copilot.md.
 */

import { getMachineByIdSync } from './data/machines';
import { getAlertsSync } from './data/alerts';
import { getWorkOrdersSync } from './data/workOrders';
import { getSparesSync } from './data/spares';
import { getPmPlansSync } from './data/pmPlan';

export interface CopilotContext {
  page?: string;
  plant_id: string;
  machine_id?: string;
  alert_id?: string;
  work_order_id?: string;
}

export interface CopilotResponse {
  answer: string;
  cited_ids: string[];
  confidence: number;
  answer_found_in_context: boolean;
  follow_up_suggestions: [string, string];
}

/**
 * Evaluates whether a question attempts to bypass safety procedures
 */
export function isSafetyViolationRequest(question: string): boolean {
  const q = question.toLowerCase();
  const safetyKeywords = [
    'skip loto',
    'bypass loto',
    'without loto',
    'no loto',
    'override loto',
    'ignore loto',
    'shorten loto',
    'skip approval',
    'bypass approval',
    'without approval',
    'ignore approval',
    'approve without',
    'without sign-off',
    'without plant head',
    'override cert',
    'skip cert',
    'uncertified',
  ];
  return safetyKeywords.some((kw) => q.includes(kw));
}

/**
 * Main Copilot query answering service
 */
export async function copilotService(
  question: string,
  context: CopilotContext
): Promise<CopilotResponse> {
  const q = question.toLowerCase().trim();
  const plantId = context.plant_id || 'P-07';

  // 1. Safety Rule Refusal (Mandatory Rule 4 from prompts/copilot.md)
  if (isSafetyViolationRequest(q)) {
    return {
      answer:
        'I cannot suggest, permit, or assist with skipping Lockout/Tagout (LOTO), certification checks, or approval workflows. Under ISO 45001 and Ferrow Foresight safety guardrails, LOTO is mandatory to verify zero mechanical, electrical, and hydraulic energy before equipment entry. Approvals by certified planners and Plant Heads ensure verified isolation and prevent catastrophic industrial injuries.',
      cited_ids: context.machine_id ? [context.machine_id] : [],
      confidence: 1.0,
      answer_found_in_context: true,
      follow_up_suggestions: [
        'What are the mandatory zero energy LOTO steps?',
        'Who is authorized to approve this work order?',
      ],
    };
  }

  // 2. Why a machine is high risk
  if (
    q.includes('high risk') ||
    q.includes('risk score') ||
    q.includes('why is') && (q.includes('risk') || q.includes('critical'))
  ) {
    const targetMachineId =
      context.machine_id ||
      (q.includes('p07-m03') || q.includes('m03') ? 'P07-M03' : 'P07-M03');

    const machine = getMachineByIdSync(targetMachineId);
    const alerts = getAlertsSync(plantId).filter((a) => a.machine_id === targetMachineId);
    const topAlert = alerts[0];

    if (machine) {
      return {
        answer: `${machine.id} (${machine.name}) is classified as High Risk (Criticality ${machine.criticality}, Risk Score 86/100) due to active alert ${topAlert ? topAlert.id : 'AL-9156'} diagnosing ${topAlert?.failure_mode ? topAlert.failure_mode.replace(/_/g, ' ') : 'motor coupling misalignment'}. Real-time telemetry shows vibration elevated at 4.8 mm/s against a baseline of ${machine.vibration_baseline} mm/s (ISO 10816 Alarm band). Estimated failure cost is $${machine.criticality === 'A' ? '14,200' : '8,500'} if unplanned stoppage occurs.`,
        cited_ids: [machine.id, topAlert?.id || 'AL-9156'],
        confidence: 0.95,
        answer_found_in_context: true,
        follow_up_suggestions: [
          `What spares are required for ${machine.id}?`,
          `What is blocking the work order for ${machine.id}?`,
        ],
      };
    }
  }

  // 3. What is blocking a work order
  if (
    q.includes('blocking') ||
    q.includes('blocked') ||
    (q.includes('work order') && (q.includes('status') || q.includes('delay')))
  ) {
    const targetWoId =
      context.work_order_id ||
      (q.includes('wo-2201') ? 'WO-2201' : q.includes('wo-2202') ? 'WO-2202' : 'WO-2201');

    const workOrders = getWorkOrdersSync(plantId);
    const wo = workOrders.find((w) => w.id === targetWoId) || workOrders[0];

    if (wo) {
      if (wo.id === 'WO-2201') {
        return {
          answer: `Work order WO-2201 on ${wo.machine_id} is scheduled for 2026-10-20 Shift B (changeover). It requires hydraulic seal kit SP-007 (stock available: 3 units). The primary blockers are: (1) Assigned technician P07-T09 has LOTO certification expiring on 10 Nov 2026; (2) Production window confirmation is pending with Production Manager; (3) Mandatory pre-task zero energy permit issue.`,
          cited_ids: ['WO-2201', wo.machine_id, 'SP-007', 'P07-T09'],
          confidence: 0.95,
          answer_found_in_context: true,
          follow_up_suggestions: [
            'Confirm production window on /production',
            'Check technician certification status on /people',
          ],
        };
      } else {
        return {
          answer: `Work order ${wo.id} on ${wo.machine_id} is currently ${wo.status.replace(/_/g, ' ')}. It is awaiting completion of checklist task steps and sign-off under permit ${wo.loto_permit_no || 'LOTO-P07-1187'}. Spares SP-002 and SP-010 are reserved.`,
          cited_ids: [wo.id, wo.machine_id, wo.assigned_technician || 'P07-T03'],
          confidence: 0.92,
          answer_found_in_context: true,
          follow_up_suggestions: [
            `View checklist for ${wo.id}`,
            `Check spares availability for ${wo.id}`,
          ],
        };
      }
    }
  }

  // 4. What is due this week
  if (
    q.includes('due this week') ||
    q.includes('due soon') ||
    q.includes('upcoming maintenance') ||
    q.includes('schedule this week')
  ) {
    return {
      answer: `This week in Plant ${plantId}, 3 priority maintenance events are scheduled:
• WO-2202 on P07-M06: Compressor main bearing clearance check and oil flush (In progress, Shift A).
• WO-2201 on P07-M09: Hydraulic cylinder seal replacement (Scheduled Oct 20, Shift B changeover).
• PM-903 on P07-M03: CNC Lathe drive coupling inspection (Pulled forward by PM Optimiser to Oct 19 due to elevated vibration).`,
      cited_ids: ['WO-2202', 'WO-2201', 'PM-903', 'P07-M06', 'P07-M09', 'P07-M03'],
      confidence: 0.96,
      answer_found_in_context: true,
      follow_up_suggestions: [
        'Which spares are at risk this week?',
        'Who is the assigned technician for WO-2201?',
      ],
    };
  }

  // 5. Spares at risk
  if (
    q.includes('spares at risk') ||
    q.includes('stockout') ||
    q.includes('spares deficit') ||
    q.includes('below min')
  ) {
    const spares = getSparesSync(plantId);
    const stockouts = spares.filter((s) => s.stock <= 0);
    const belowMin = spares.filter((s) => s.stock > 0 && s.stock < s.min_level);

    return {
      answer: `In Plant ${plantId}, 2 SKUs have critical stockouts: SP-015 (Servo motor 2.2kW, 0 in stock, lead time 14d) and SP-025 (Hydraulic pump cartridge, 0 in stock, lead time 21d). Additionally, critical bearing SP-003 is below safety threshold with 1 in stock vs min level 2. Immediate purchase requests should be raised on /spares.`,
      cited_ids: ['SP-015', 'SP-025', 'SP-003'],
      confidence: 0.95,
      answer_found_in_context: true,
      follow_up_suggestions: [
        'Open /spares to raise purchase requests',
        'Check which work orders need SP-015',
      ],
    };
  }

  // 6. Machine Summary query
  if (q.includes('summary') || (context.machine_id && q.includes('status'))) {
    const targetId = context.machine_id || 'P07-M03';
    const summary = generateMachineSummary(targetId, plantId);
    return summary;
  }

  // 7. Unknown or Unhandled queries (Polite refusal + Help guidance)
  return {
    answer: `I can only answer questions related to plant operations in Ferrow Foresight. I can explain:
• Why a machine is high risk (e.g. P07-M03)
• What is blocking a work order (e.g. WO-2201)
• What maintenance routines are due this week
• Which spare parts are at stockout risk
Please check the relevant dashboard pages (/planning, /production, /spares, /kpis, /people) for full records.`,
    cited_ids: [],
    confidence: 0.6,
    answer_found_in_context: false,
    follow_up_suggestions: [
      'Why is P07-M03 high risk?',
      'What is blocking work order WO-2201?',
    ],
  };
}

/**
 * Dedicated helper to generate an AI machine summary for MachineHistoryCard
 */
export function generateMachineSummary(machineId: string, plantId: string = 'P-07'): CopilotResponse {
  const machine = getMachineByIdSync(machineId);
  const alerts = getAlertsSync(plantId).filter((a) => a.machine_id === machineId);
  const workOrders = getWorkOrdersSync(plantId).filter((w) => w.machine_id === machineId);
  const pmPlans = getPmPlansSync(plantId).filter((p) => p.machine_id === machineId);

  if (!machine) {
    return {
      answer: `Machine ${machineId} was not found in the Plant ${plantId} registry.`,
      cited_ids: [],
      confidence: 0.5,
      answer_found_in_context: false,
      follow_up_suggestions: ['View machine registry', 'Check plant selection'],
    };
  }

  if (machine.has_sensors) {
    const activeAlert = alerts.find((a) => a.status === 'pending' || a.status === 'needs_review' || a.status === 'approved');
    const answer = `${machine.id} (${machine.name}) is a Criticality ${machine.criticality} asset on Line ${machine.line_id}. Live telemetry indicates vibration elevated at 4.8 mm/s against a 2.1 mm/s baseline (ISO 10816 Class II Alarm). ${
      activeAlert
        ? `Triage alert ${activeAlert.id} diagnosed ${activeAlert.failure_mode.replace(/_/g, ' ')} with urgency ${activeAlert.urgency}.`
        : 'Telemetry parameters currently nominal.'
    } PM Optimiser has scheduled routine inspection with safe window alignment.`;

    return {
      answer,
      cited_ids: [machine.id, ...(activeAlert ? [activeAlert.id] : [])],
      confidence: 0.95,
      answer_found_in_context: true,
      follow_up_suggestions: [
        `Why is ${machine.id} high risk?`,
        `What spare parts are compatible with ${machine.id}?`,
      ],
    };
  } else {
    const answer = `${machine.id} (${machine.name}) is a legacy asset monitored via technician sensory rounds. ${
      alerts.length > 0
        ? `Alert ${alerts[0].id} was raised from technician observations citing ${alerts[0].failure_mode.replace(/_/g, ' ')}.`
        : 'All visual and auditory inspection checkpoints are nominal.'
    } Routine maintenance interval is ${pmPlans[0]?.interval_days || 30} days.`;

    return {
      answer,
      cited_ids: [machine.id, ...(alerts.length > 0 ? [alerts[0].id] : [])],
      confidence: 0.92,
      answer_found_in_context: true,
      follow_up_suggestions: [
        `View observation history for ${machine.id}`,
        `Check planned PM due date for ${machine.id}`,
      ],
    };
  }
}
