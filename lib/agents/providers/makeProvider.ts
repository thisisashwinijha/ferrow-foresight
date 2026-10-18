import { AgentExecuteOptions } from '../types';
import { getDefaultPromptVersion } from '../systemPrompts';

export interface ProviderCallResult {
  success: boolean;
  rawText?: string;
  latency_ms: number;
  tokens?: { input: number; output: number };
  model: string;
  error?: string;
}

/**
 * Calls Make.com webhook scenario with exact payload shape matching make/test_payload_*.json.
 * 25 second timeout. Rejects "Accepted", HTTP errors, or timeouts.
 */
export async function callMakeProvider(
  options: AgentExecuteOptions,
  timeoutMs = 25000
): Promise<ProviderCallResult> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  const authToken = process.env.MAKE_AUTH_TOKEN || '';

  if (!webhookUrl) {
    return {
      success: false,
      latency_ms: 0,
      model: 'make-scenario',
      error: 'MAKE_WEBHOOK_URL not configured',
    };
  }

  const payload = {
    agent: options.agent,
    auth_token: authToken,
    request_id: options.request_id || `REQ-${Date.now()}`,
    plant_id: options.plant_id || 'P-07',
    machine_id: options.machine_id || '',
    trigger: options.trigger || 'user_request',
    prompt_version: options.prompt_version || getDefaultPromptVersion(options.agent),
    interpreter_input:
      typeof options.interpreter_input === 'string'
        ? options.interpreter_input
        : JSON.stringify(options.interpreter_input || ''),
    triage_context:
      typeof options.triage_context === 'string'
        ? options.triage_context
        : JSON.stringify(options.triage_context || ''),
    context:
      typeof options.context === 'string'
        ? options.context
        : JSON.stringify(options.context || {}),
  };

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (!res.ok) {
      return {
        success: false,
        latency_ms: latency,
        model: 'make-scenario',
        error: `Make webhook HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const text = await res.text();

    // A body of exactly "Accepted" is a failure per spec
    if (text.trim() === 'Accepted') {
      return {
        success: false,
        latency_ms: latency,
        model: 'make-scenario',
        error: 'Make webhook returned "Accepted" (asynchronous webhook execution)',
      };
    }

    if (!text.trim()) {
      return {
        success: false,
        latency_ms: latency,
        model: 'make-scenario',
        error: 'Empty body from Make webhook',
      };
    }

    return {
      success: true,
      rawText: text,
      latency_ms: latency,
      model: 'make-scenario',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const isTimeout = err?.name === 'AbortError' || latency >= timeoutMs;
    return {
      success: false,
      latency_ms: latency,
      model: 'make-scenario',
      error: isTimeout ? `Make webhook timed out after ${timeoutMs}ms` : `Make error: ${err?.message || String(err)}`,
    };
  }
}
