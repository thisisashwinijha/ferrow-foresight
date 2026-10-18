import { AgentExecuteOptions } from '../types';
import { ProviderCallResult } from './makeProvider';

/**
 * Remote Agent provider.
 * Calls a deployed Ferrow Foresight /api/agent endpoint so that local copies without keys still get live AI.
 */
export async function callRemoteProvider(
  options: AgentExecuteOptions,
  timeoutMs = 20000
): Promise<ProviderCallResult> {
  const remoteUrl =
    process.env.REMOTE_AGENT_URL ||
    'https://ferrow-foresight.vercel.app/api/agent';

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      agent: options.agent,
      request_id: options.request_id,
      plant_id: options.plant_id,
      machine_id: options.machine_id,
      trigger: options.trigger,
      prompt_version: options.prompt_version,
      interpreter_input: options.interpreter_input,
      triage_context: options.triage_context,
      context: options.context,
    };

    const res = await fetch(remoteUrl, {
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
        model: 'remote-endpoint',
        error: `Remote agent returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      rawText: typeof data === 'string' ? data : JSON.stringify(data.data || data),
      latency_ms: latency,
      model: data.model || 'remote-endpoint',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      latency_ms: latency,
      model: 'remote-endpoint',
      error: isTimeout
        ? `Remote provider timed out after ${timeoutMs}ms`
        : `Remote provider error: ${err.message || String(err)}`,
    };
  }
}
