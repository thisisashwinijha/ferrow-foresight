import {
  AgentExecuteOptions,
  AgentExecutionResult,
  AgentProviderName,
} from './types';
import { getDefaultPromptVersion } from './systemPrompts';
import { parseAgentResponse } from './parser';
import {
  getCachedResponse,
  setCachedResponse,
  checkIpLimit,
  getTodayLiveCallStats,
  recordLiveCall,
} from './cache';
import { logAgentRun } from './observability';
import { callMakeProvider } from './providers/makeProvider';
import {
  callDirectProvider,
  getPrimaryModel,
  getFallbackModel,
} from './providers/directProvider';
import { callRemoteProvider } from './providers/remoteProvider';
import { callCachedProvider } from './providers/cachedProvider';

/**
 * Normalizes input: truncates user text to 1,000 characters and places it strictly inside context.
 */
function sanitizeInput(options: AgentExecuteOptions): AgentExecuteOptions {
  const sanitized = { ...options };

  if (sanitized.user_text) {
    const truncated = sanitized.user_text.slice(0, 1000);
    sanitized.user_text = truncated;
    sanitized.context = {
      ...(sanitized.context || {}),
      user_text: truncated,
    };
  }

  // Also truncate any question or note inside context
  if (sanitized.context) {
    const ctx = { ...sanitized.context };
    if (typeof ctx.question === 'string' && ctx.question.length > 1000) {
      ctx.question = ctx.question.slice(0, 1000);
    }
    if (typeof ctx.note === 'string' && ctx.note.length > 1000) {
      ctx.note = ctx.note.slice(0, 1000);
    }
    sanitized.context = ctx;
  }

  return sanitized;
}

/**
 * Determines provider sequence according to env and options.
 */
export function getProviderSequence(forcedProvider?: AgentProviderName): AgentProviderName[] {
  const envProvider = forcedProvider || (process.env.AGENT_PROVIDER as AgentProviderName);

  if (envProvider) {
    if (envProvider === 'cached') return ['cached'];
    if (envProvider === 'direct') return ['direct', 'direct_fallback', 'cached'];
    if (envProvider === 'remote') return ['remote', 'cached'];
    return [envProvider, 'direct', 'direct_fallback', 'cached'];
  }

  const sequence: AgentProviderName[] = [];

  // 1. Make.com scenario (if env configured)
  if (process.env.MAKE_WEBHOOK_URL) {
    sequence.push('make');
  }

  // 2. Direct Gemini primary model
  if (process.env.GEMINI_API_KEY) {
    sequence.push('direct');
    sequence.push('direct_fallback');
  }

  // 3. Remote agent URL (if configured or as intermediate before cached)
  if (process.env.REMOTE_AGENT_URL || sequence.length === 0) {
    sequence.push('remote');
  }

  // 4. Always end with cached
  sequence.push('cached');

  return sequence;
}

/**
 * Main execution entry point for all agents.
 * Implements auto-selection, timeouts, fallback chain, zod schema validation,
 * guardrail enforcement, response caching, IP/daily abuse protection, and observability logging.
 */
export async function executeAgent<T = any>(
  rawOptions: AgentExecuteOptions
): Promise<AgentExecutionResult<T>> {
  const startTime = Date.now();
  const options = sanitizeInput(rawOptions);
  const promptVersion =
    options.prompt_version || getDefaultPromptVersion(options.agent);

  // If DEMO_MODE, skipLive requested, or AGENT_PROVIDER is cached, serve cached immediately without live call
  if (options.skipLive || process.env.AGENT_PROVIDER === 'cached' || options.forceProvider === 'cached') {
    const cachedResult = await callCachedProvider(
      options,
      'Cached provider enabled'
    );
    await logAgentRun({
      alert_id: options.machine_id,
      step: options.agent,
      model: cachedResult.model,
      prompt_version: promptVersion,
      latency_ms: Date.now() - startTime,
      input: {
        agent: options.agent,
        provider: 'cached',
        trigger: options.trigger,
      },
      output: cachedResult.data,
      schema_valid: true,
      guardrail_pass: true,
      error: null,
    });
    return cachedResult as AgentExecutionResult<T>;
  }

  // 1. Check 24-hour cache
  const cached = getCachedResponse(options.agent, promptVersion, options.context);
  if (cached) {
    const cachedTimeStr = new Date(cached.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const result: AgentExecutionResult<T> = {
      success: true,
      data: cached.data,
      provider: cached.provider,
      model: cached.model || 'cached-24h',
      prompt_version: promptVersion,
      latency_ms: Date.now() - startTime,
      schema_valid: true,
      guardrail_pass: true,
      fallback_used: false,
      fallback_chain: [cached.provider],
      cached_note: `Cached response (${cachedTimeStr})`,
    };

    await logAgentRun({
      alert_id: options.machine_id,
      step: options.agent,
      model: result.model,
      prompt_version: promptVersion,
      latency_ms: result.latency_ms,
      input: {
        agent: options.agent,
        provider: 'cached',
        cache_hit: true,
      },
      output: result.data,
      schema_valid: true,
      guardrail_pass: true,
      error: null,
    });

    return result;
  }

  // 2. Abuse protection checks (per-IP limit & global daily cap)
  const isEval =
    (options as any).bypassRateLimit ||
    options.trigger === 'golden_eval' ||
    options.trigger === 'eval';

  if (!isEval) {
    const ipCheck = checkIpLimit(options.clientIp);
    if (!ipCheck.allowed) {
      const cachedResult = await callCachedProvider(
        options,
        'Hourly rate limit reached (10 calls/hour)'
      );
      return cachedResult as AgentExecutionResult<T>;
    }

    const dailyStats = getTodayLiveCallStats();
    if (dailyStats.isCapped) {
      const cachedResult = await callCachedProvider(
        options,
        `Daily limit reached (${dailyStats.dailyCap} calls/day)`
      );
      return cachedResult as AgentExecutionResult<T>;
    }
  }

  // 3. Fallback chain
  const effectiveProvider = options.forceProvider || (options as any).forcedProvider;
  const providerSequence = getProviderSequence(effectiveProvider);
  const attemptedProviders: AgentProviderName[] = [];

  for (let i = 0; i < providerSequence.length; i++) {
    const provider = providerSequence[i];
    attemptedProviders.push(provider);

    if (provider === 'cached') {
      const cachedResult = await callCachedProvider(
        options,
        attemptedProviders.length > 1 ? 'Live AI busy' : 'Cached baseline'
      );
      await logAgentRun({
        alert_id: options.machine_id,
        step: options.agent,
        model: cachedResult.model,
        prompt_version: promptVersion,
        latency_ms: Date.now() - startTime,
        input: {
          agent: options.agent,
          provider: 'cached',
          fallback_used: attemptedProviders.length > 1,
          attempted_chain: attemptedProviders,
        },
        output: cachedResult.data,
        schema_valid: cachedResult.schema_valid,
        guardrail_pass: cachedResult.guardrail_pass,
        error: null,
      });
      return {
        ...cachedResult,
        fallback_used: attemptedProviders.length > 1,
        fallback_chain: attemptedProviders,
      } as AgentExecutionResult<T>;
    }

    try {
      let callRes;
      if (provider === 'make') {
        callRes = await callMakeProvider(options, 25000);
      } else if (provider === 'direct') {
        callRes = await callDirectProvider(options, getPrimaryModel(), 20000);
      } else if (provider === 'direct_fallback') {
        callRes = await callDirectProvider(options, getFallbackModel(), 15000);
      } else if (provider === 'remote') {
        callRes = await callRemoteProvider(options, 20000);
      }

      if (!callRes || !callRes.success || !callRes.rawText) {
        // Log provider failure to agent_runs
        await logAgentRun({
          alert_id: options.machine_id,
          step: options.agent,
          model: callRes?.model || provider,
          prompt_version: promptVersion,
          latency_ms: callRes?.latency_ms || 0,
          input: {
            agent: options.agent,
            provider,
            step_index: i,
          },
          output: null,
          schema_valid: false,
          guardrail_pass: false,
          error: callRes?.error || 'Provider execution failed',
        });
        // Move to next provider
        continue;
      }

      // Parse & Validate with Zod schemas and Guardrails
      const parseResult = parseAgentResponse(
        options.agent,
        callRes.rawText,
        options.context
      );

      if (!parseResult.success || !parseResult.schema_valid) {
        // Schema invalid -> move to next provider
        await logAgentRun({
          alert_id: options.machine_id,
          step: options.agent,
          model: callRes.model,
          prompt_version: promptVersion,
          latency_ms: callRes.latency_ms,
          input: {
            agent: options.agent,
            provider,
            rawTextSample: callRes.rawText.slice(0, 200),
          },
          output: null,
          schema_valid: false,
          guardrail_pass: false,
          error: parseResult.error || 'Schema validation failed',
        });
        continue;
      }

      // Provider call succeeded!
      recordLiveCall(options.clientIp);

      // Save in 24-hour cache
      setCachedResponse(
        options.agent,
        promptVersion,
        options.context,
        parseResult.data,
        provider,
        callRes.model
      );

      // Log success to agent_runs
      await logAgentRun({
        alert_id: options.machine_id,
        step: options.agent,
        model: callRes.model,
        prompt_version: promptVersion,
        latency_ms: callRes.latency_ms,
        input_tokens: callRes.tokens?.input,
        output_tokens: callRes.tokens?.output,
        input: {
          agent: options.agent,
          provider,
          fallback_used: i > 0,
          attempted_chain: attemptedProviders,
        },
        output: parseResult.data,
        schema_valid: parseResult.schema_valid,
        guardrail_pass: parseResult.guardrail_pass,
        error: null,
      });

      return {
        success: true,
        data: parseResult.data,
        provider,
        model: callRes.model,
        prompt_version: promptVersion,
        latency_ms: callRes.latency_ms,
        tokens: callRes.tokens,
        schema_valid: parseResult.schema_valid,
        guardrail_pass: parseResult.guardrail_pass,
        fallback_used: i > 0,
        fallback_chain: attemptedProviders,
      };
    } catch (err: any) {
      await logAgentRun({
        alert_id: options.machine_id,
        step: options.agent,
        model: provider,
        prompt_version: promptVersion,
        latency_ms: Date.now() - startTime,
        input: { agent: options.agent, provider },
        output: null,
        schema_valid: false,
        guardrail_pass: false,
        error: err?.message || String(err),
      });
      // Move to next provider
      continue;
    }
  }

  // Fallback to cached
  const finalCached = await callCachedProvider(options, 'Live AI busy');
  return {
    ...finalCached,
    fallback_used: true,
    fallback_chain: attemptedProviders,
  } as AgentExecutionResult<T>;
}

export const executeAgentWithFallback = executeAgent;

