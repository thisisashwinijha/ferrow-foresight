import { getSupabaseAdminClient } from '../supabaseAdmin';
import { AgentRunRecord } from './types';

// In-memory buffer of recent agent runs for fast retrieval and offline fallback
const memoryRuns: AgentRunRecord[] = [];
const MAX_MEMORY_RUNS = 100;

// Last 5 errors without secrets
const lastErrors: Array<{ time: string; agent: string; code: string; message: string }> = [];

/**
 * Sanitizes an error message or code to ensure zero secrets or sensitive keys are exposed.
 */
export function sanitizeError(err: any): string {
  if (!err) return '';
  let msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);

  // Redact potential API keys or tokens
  msg = msg.replace(/[A-Za-z0-9_-]{25,}/g, '[REDACTED_SECRET]');
  msg = msg.replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]');
  msg = msg.replace(/bearer\s+[^\s]+/gi, 'Bearer [REDACTED]');
  return msg.slice(0, 200);
}

export async function logAgentRun(run: AgentRunRecord): Promise<void> {
  const sanitizedError = run.error ? sanitizeError(run.error) : null;
  const entry: AgentRunRecord = {
    ...run,
    id: run.id || `RUN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: run.created_at || new Date().toISOString(),
    error: sanitizedError,
  };

  // Prepend to in-memory buffer
  memoryRuns.unshift(entry);
  if (memoryRuns.length > MAX_MEMORY_RUNS) {
    memoryRuns.pop();
  }

  // Record to last errors if failure
  if (sanitizedError) {
    lastErrors.unshift({
      time: entry.created_at!,
      agent: run.step || 'unknown',
      code: sanitizedError.split(':')[0] || 'AGENT_ERROR',
      message: sanitizedError,
    });
    if (lastErrors.length > 5) {
      lastErrors.pop();
    }
  }

  // Sync to Supabase if admin client available
  const admin = getSupabaseAdminClient();
  if (admin) {
    try {
      await admin.from('agent_runs').insert({
        alert_id: entry.alert_id || null,
        created_at: entry.created_at,
        step: entry.step,
        model: entry.model,
        prompt_version: entry.prompt_version,
        latency_ms: entry.latency_ms,
        input_tokens: entry.input_tokens || null,
        output_tokens: entry.output_tokens || null,
        input: entry.input,
        output: entry.output,
        schema_valid: entry.schema_valid,
        guardrail_pass: entry.guardrail_pass,
        error: entry.error || null,
      });
    } catch (e: any) {
      console.warn('Could not insert to Supabase agent_runs:', sanitizeError(e));
    }
  }
}

export function getMemoryAgentRuns(): AgentRunRecord[] {
  return [...memoryRuns];
}

export function getLastAgentErrors() {
  return [...lastErrors];
}

export function getLastMakeRunTime(): string | null {
  const makeRun = memoryRuns.find((r) => {
    const inputObj = r.input;
    return inputObj?.provider === 'make' && !r.error;
  });
  return makeRun?.created_at || null;
}
