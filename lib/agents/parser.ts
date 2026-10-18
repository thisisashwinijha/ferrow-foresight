import {
  TriagePlannerOutputSchema,
  InterpreterOutputSchema,
  PmOptimiserOutputSchema,
  CopilotOutputSchema,
  KnowledgeOutputSchema,
} from './schemas';
import { runAllGuardrails, checkPmDueDate } from '../guardrails';
import { AgentType } from './types';

/**
 * Strips code fences, markdown wrappers, and extraneous text surrounding a JSON structure.
 */
export function stripCodeFences(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();

  // Strip leading ```json or ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  // Strip trailing ```
  cleaned = cleaned.replace(/\s*```$/i, '');

  cleaned = cleaned.trim();
  return cleaned;
}

/**
 * Extracts a single valid JSON block from a string.
 */
export function extractJsonString(text: string): string {
  const stripped = stripCodeFences(text);
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  const firstBracket = stripped.indexOf('[');
  const lastBracket = stripped.lastIndexOf(']');

  // Check whether an object or an array comes first
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      return stripped.slice(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    if (lastBracket !== -1 && lastBracket > firstBracket) {
      return stripped.slice(firstBracket, lastBracket + 1);
    }
  }

  return stripped;
}

export interface ParseResult<T = any> {
  success: boolean;
  data?: T;
  interpreter_data?: any;
  error?: string;
  schema_valid: boolean;
  guardrail_pass: boolean;
}

/**
 * Normalises raw failure mode strings into strict taxonomy.
 * Handles lowercasing, space/hyphen to underscore, synonyms and invalid fallbacks.
 */
export function normalizeFailureMode(raw: any): { mode: string; normalized: boolean } {
  if (!raw || typeof raw !== 'string') {
    return { mode: 'unknown', normalized: false };
  }
  const cleaned = raw.trim().toLowerCase().replace(/[-\s]+/g, '_');

  const synonymMap: Record<string, string> = {
    electrical: 'electrical_fault',
    electrical_fault: 'electrical_fault',
    electric: 'electrical_fault',
    electric_fault: 'electrical_fault',
    electrical_burn: 'electrical_fault',
    short_circuit: 'electrical_fault',
    contactor_burn: 'electrical_fault',
    mcc_fault: 'electrical_fault',
    overheating: 'motor_overheating',
    overheat: 'motor_overheating',
    motor_overheating: 'motor_overheating',
    motor_overheat: 'motor_overheating',
    thermal_overheating: 'motor_overheating',
    bearing: 'bearing_wear',
    bearing_wear: 'bearing_wear',
    bearing_damage: 'bearing_wear',
    bearing_fatigue: 'bearing_wear',
    bearing_failure: 'bearing_wear',
    belt: 'belt_wear',
    belt_wear: 'belt_wear',
    belt_slip: 'belt_wear',
    belt_slippage: 'belt_wear',
    lubrication: 'lubrication_failure',
    lubrication_failure: 'lubrication_failure',
    lube_failure: 'lubrication_failure',
    lubricant_failure: 'lubrication_failure',
    misaligned: 'misalignment',
    misalignment: 'misalignment',
    shaft_misalignment: 'misalignment',
    coupling_misalignment: 'misalignment',
    hydraulic: 'hydraulic_leak',
    hydraulic_leak: 'hydraulic_leak',
    hydraulic_fluid_leak: 'hydraulic_leak',
    oil_leak: 'hydraulic_leak',
    seal: 'seal_failure',
    seal_failure: 'seal_failure',
    seal_leak: 'seal_failure',
    lip_seal_wear: 'seal_failure',
    pneumatic: 'pneumatic_leak',
    pneumatic_leak: 'pneumatic_leak',
    air_leak: 'pneumatic_leak',
    pressure_leak: 'pneumatic_leak',
    sensor: 'sensor_fault',
    sensor_fault: 'sensor_fault',
    sensor_dropout: 'sensor_fault',
    sensor_error: 'sensor_fault',
    sensor_anomaly: 'sensor_fault',
    normal: 'none',
    none: 'none',
    false_alarm: 'none',
    healthy: 'none',
    unknown: 'unknown',
    unrecognized: 'unknown',
    insufficient: 'unknown',
    not_recognized: 'unknown',
  };

  if (synonymMap[cleaned]) {
    return { mode: synonymMap[cleaned], normalized: true };
  }

  const valid = [
    'bearing_wear',
    'belt_wear',
    'misalignment',
    'lubrication_failure',
    'motor_overheating',
    'hydraulic_leak',
    'seal_failure',
    'electrical_fault',
    'pneumatic_leak',
    'sensor_fault',
    'unknown',
    'none',
  ];

  if (valid.includes(cleaned)) {
    return { mode: cleaned, normalized: true };
  }

  return { mode: 'unknown', normalized: false };
}

/**
 * Safely parses and validates agent response strings according to agent type.
 */
export function parseAgentResponse(
  agent: AgentType,
  rawText: string,
  guardrailContext: any = {}
): ParseResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      success: false,
      error: 'Empty response received from agent',
      schema_valid: false,
      guardrail_pass: false,
    };
  }

  // Exact "Accepted" check for Make.com failure per spec
  if (rawText.trim() === 'Accepted') {
    return {
      success: false,
      error: 'Make webhook returned asynchronous "Accepted" instead of synchronous JSON payload',
      schema_valid: false,
      guardrail_pass: false,
    };
  }

  // 1. Triage Agent: Handles two JSON blocks separated by @@@TRIAGE@@@ or single Planner block
  if (agent === 'triage') {
    let interpreterRaw: string | null = null;
    let plannerRaw = rawText;

    if (rawText.includes('@@@TRIAGE@@@')) {
      const parts = rawText.split('@@@TRIAGE@@@');
      interpreterRaw = parts[0]?.trim() || null;
      plannerRaw = parts[1]?.trim() || '';
    }

    let interpreterData: any = null;
    if (interpreterRaw) {
      try {
        const jsonStr = extractJsonString(interpreterRaw);
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object' && parsed.failure_mode) {
          const norm = normalizeFailureMode(parsed.failure_mode);
          parsed.failure_mode = norm.mode;
        }
        const val = InterpreterOutputSchema.safeParse(parsed);
        if (val.success) {
          interpreterData = val.data;
        }
      } catch {
        // Non-blocking: interpreter failure alone doesn't kill triage if planner is valid
      }
    }

    try {
      const jsonStr = extractJsonString(plannerRaw);
      let parsed = JSON.parse(jsonStr);

      let failureModeUnrecognised = false;
      if (parsed && typeof parsed === 'object') {
        const norm = normalizeFailureMode(parsed.failure_mode);
        parsed.failure_mode = norm.mode;
        if (!norm.normalized) {
          failureModeUnrecognised = true;
          parsed.insufficient_evidence = true;
        }

        // Urgency normalization
        if (typeof parsed.urgency === 'string') {
          const u = parsed.urgency.trim().toUpperCase();
          if (['P1', 'P2', 'P3'].includes(u)) {
            parsed.urgency = u;
          } else if (u.toLowerCase() === 'none') {
            parsed.urgency = 'none';
          } else {
            parsed.urgency = 'P3';
          }
        }

        // Action type normalization
        if (typeof parsed.action_type === 'string') {
          const a = parsed.action_type.trim().toLowerCase().replace(/[-\s]+/g, '_');
          if (['monitor', 'inspect', 'repair', 'replace', 'escalate'].includes(a)) {
            parsed.action_type = a;
          } else {
            parsed.action_type = 'inspect';
          }
        }

        // Proposed window normalization
        if (parsed.proposed_window && typeof parsed.proposed_window === 'object') {
          if (typeof parsed.proposed_window.window_type === 'string') {
            const wt = parsed.proposed_window.window_type.trim().toLowerCase().replace(/[-\s]+/g, '_');
            if (['run', 'changeover', 'low_load', 'planned_shutdown'].includes(wt)) {
              parsed.proposed_window.window_type = wt;
            } else {
              parsed.proposed_window.window_type = 'changeover';
            }
          }
        }
      }

      const schemaValidation = TriagePlannerOutputSchema.safeParse(parsed);
      if (!schemaValidation.success) {
        const issueMsg = schemaValidation.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        return {
          success: false,
          error: `Triage schema validation error: ${issueMsg}`,
          schema_valid: false,
          guardrail_pass: false,
          interpreter_data: interpreterData,
        };
      }

      const validPlannerData = schemaValidation.data;

      // Run Guardrails
      const guardrailOutcome = runAllGuardrails(validPlannerData, guardrailContext);
      if (failureModeUnrecognised) {
        guardrailOutcome.pass = false;
        guardrailOutcome.status = 'needs_review';
        guardrailOutcome.checks.unshift({
          rule: 'failure_mode_recognized',
          pass: false,
          detail: 'Failure mode not recognised. Pick one below.',
          failBehavior: 'needs_review',
        });
      }

      const finalStatus = failureModeUnrecognised
        ? 'needs_review'
        : guardrailOutcome.pass
        ? 'pending'
        : guardrailOutcome.status === 'suppressed'
        ? 'suppressed'
        : 'needs_review';

      return {
        success: true,
        data: {
          ...validPlannerData,
          status: finalStatus,
          guardrail_result: {
            pass: guardrailOutcome.pass,
            checks: guardrailOutcome.checks,
          },
          assigned_technician: guardrailOutcome.modifiedData.assigned_technician,
          loto_required: guardrailOutcome.modifiedData.loto_required,
          required_certifications: guardrailOutcome.modifiedData.required_certifications,
          spares_blocked: guardrailOutcome.modifiedData.spares_blocked,
        },
        interpreter_data: interpreterData,
        schema_valid: true,
        guardrail_pass: guardrailOutcome.pass,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `JSON parse error: ${err.message || String(err)}`,
        schema_valid: false,
        guardrail_pass: false,
      };
    }
  }

  // 2. PM Optimiser Agent
  if (agent === 'pm_optimiser') {
    try {
      const jsonStr = extractJsonString(rawText);
      const parsed = JSON.parse(jsonStr);
      const schemaValidation = PmOptimiserOutputSchema.safeParse(parsed);

      if (!schemaValidation.success) {
        return {
          success: false,
          error: `PM Optimiser schema error: ${schemaValidation.error.message}`,
          schema_valid: false,
          guardrail_pass: false,
        };
      }

      // Check Rule 9 guardrail on all decisions
      let guardrailPass = true;
      for (const dec of schemaValidation.data.decisions) {
        const check = checkPmDueDate(dec.decision, dec.current_due_date, dec.new_due_date);
        if (!check.pass) {
          guardrailPass = false;
        }
      }

      return {
        success: true,
        data: schemaValidation.data,
        schema_valid: true,
        guardrail_pass: guardrailPass,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `PM Optimiser parse error: ${err.message || String(err)}`,
        schema_valid: false,
        guardrail_pass: false,
      };
    }
  }

  // 3. Copilot Agent
  if (agent === 'copilot') {
    try {
      const jsonStr = extractJsonString(rawText);
      const parsed = JSON.parse(jsonStr);
      const schemaValidation = CopilotOutputSchema.safeParse(parsed);

      if (!schemaValidation.success) {
        return {
          success: false,
          error: `Copilot schema error: ${schemaValidation.error.message}`,
          schema_valid: false,
          guardrail_pass: false,
        };
      }

      return {
        success: true,
        data: schemaValidation.data,
        schema_valid: true,
        guardrail_pass: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Copilot parse error: ${err.message || String(err)}`,
        schema_valid: false,
        guardrail_pass: false,
      };
    }
  }

  // 4. Knowledge Agent
  if (agent === 'knowledge') {
    try {
      const jsonStr = extractJsonString(rawText);
      const parsed = JSON.parse(jsonStr);
      const schemaValidation = KnowledgeOutputSchema.safeParse(parsed);

      if (!schemaValidation.success) {
        return {
          success: false,
          error: `Knowledge agent schema error: ${schemaValidation.error.message}`,
          schema_valid: false,
          guardrail_pass: false,
        };
      }

      return {
        success: true,
        data: schemaValidation.data,
        schema_valid: true,
        guardrail_pass: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Knowledge agent parse error: ${err.message || String(err)}`,
        schema_valid: false,
        guardrail_pass: false,
      };
    }
  }

  // 5. Interpreter standalone
  if (agent === 'interpreter') {
    try {
      const jsonStr = extractJsonString(rawText);
      const parsed = JSON.parse(jsonStr);
      const schemaValidation = InterpreterOutputSchema.safeParse(parsed);

      if (!schemaValidation.success) {
        return {
          success: false,
          error: `Interpreter schema error: ${schemaValidation.error.message}`,
          schema_valid: false,
          guardrail_pass: false,
        };
      }

      return {
        success: true,
        data: schemaValidation.data,
        schema_valid: true,
        guardrail_pass: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Interpreter parse error: ${err.message || String(err)}`,
        schema_valid: false,
        guardrail_pass: false,
      };
    }
  }

  return {
    success: false,
    error: `Unknown agent type: ${agent}`,
    schema_valid: false,
    guardrail_pass: false,
  };
}
