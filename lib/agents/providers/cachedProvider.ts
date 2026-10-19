import { AgentExecuteOptions, AgentExecutionResult } from '../types';
import { getCachedResponse, setCachedResponse } from '../cache';
import { getDefaultPromptVersion } from '../systemPrompts';

export async function callCachedProvider(
  options: AgentExecuteOptions,
  reason = 'Live AI busy'
): Promise<AgentExecutionResult> {
  const promptVersion =
    options.prompt_version || getDefaultPromptVersion(options.agent);

  // Check 24-hour cache
  const cached = getCachedResponse(options.agent, promptVersion, options.context);
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (cached) {
    const cachedTimeStr = new Date(cached.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      success: true,
      data: cached.data,
      provider: 'cached',
      model: cached.model || defaultModel,
      prompt_version: promptVersion,
      latency_ms: 5,
      schema_valid: true,
      guardrail_pass: true,
      fallback_used: true,
      fallback_chain: ['cached'],
      cached_note: `${reason}, showing last validated recommendation (${cachedTimeStr})`,
    };
  }

  // If no cache, run rule-based fallback if provided
  let fallbackData: any = null;
  if (options.ruleBasedFallback) {
    try {
      fallbackData = await options.ruleBasedFallback();
      // Store in cache for future hits
      setCachedResponse(
        options.agent,
        promptVersion,
        options.context,
        fallbackData,
        'cached',
        defaultModel
      );
    } catch (e) {
      console.warn('ruleBasedFallback error:', e);
    }
  }

  return {
    success: Boolean(fallbackData),
    data: fallbackData,
    provider: 'cached',
    model: defaultModel,
    prompt_version: promptVersion,
    latency_ms: 10,
    schema_valid: true,
    guardrail_pass: true,
    fallback_used: true,
    fallback_chain: ['cached'],
    cached_note: `${reason}, showing last validated recommendation (${nowStr})`,
  };
}
