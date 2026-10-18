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
      const parsed = JSON.parse(jsonStr);

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

      return {
        success: guardrailOutcome.pass || guardrailOutcome.status !== 'needs_review',
        data: {
          ...validPlannerData,
          guardrail_result: {
            pass: guardrailOutcome.pass,
            checks: guardrailOutcome.checks,
          },
          status: guardrailOutcome.pass
            ? 'pending'
            : guardrailOutcome.status === 'suppressed'
            ? 'suppressed'
            : 'needs_review',
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
