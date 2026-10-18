import { AgentExecuteOptions } from '../types';
import { getSystemPrompt } from '../systemPrompts';
import { ProviderCallResult } from './makeProvider';

export function getPrimaryModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
}

export function getFallbackModel(): string {
  return process.env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest';
}

/**
 * Executes a single generateContent call against Gemini REST API with temperature 0 and JSON response mode.
 */
async function callGeminiRest(
  model: string,
  systemInstructionText: string,
  userContentJson: string,
  timeoutMs: number
): Promise<{ text: string; tokens?: { input: number; output: number } }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const bodyPayload = {
    systemInstruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userContentJson }],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  };

  try {
    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    // Auto-retry on 429 rate limit
    if (res.status === 429) {
      console.warn(`[Gemini API] 429 limit hit on ${model}, waiting 7s before retry...`);
      await new Promise((r) => setTimeout(r, 7000));
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(errText);
        errorMsg = parsed.error?.message || errorMsg;
      } catch {
        // use fallback errorMsg
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let tokens: { input: number; output: number } | undefined;
    if (data.usageMetadata) {
      tokens = {
        input: data.usageMetadata.promptTokenCount || 0,
        output: data.usageMetadata.candidatesTokenCount || 0,
      };
    }

    return { text: candidateText, tokens };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error(`Gemini direct call timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * Direct Gemini API provider.
 * For triage: runs Interpreter then Planner like Make, separated by @@@TRIAGE@@@.
 * For other agents: runs with respective system prompt.
 */
export async function callDirectProvider(
  options: AgentExecuteOptions,
  modelName: string,
  timeoutMs: number
): Promise<ProviderCallResult> {
  const startTime = Date.now();

  try {
    if (options.agent === 'triage') {
      // Step A: Signal Interpreter
      const interpreterSystemPrompt = getSystemPrompt('interpreter');
      const interpreterInputJson =
        typeof options.interpreter_input === 'string'
          ? options.interpreter_input
          : JSON.stringify(options.interpreter_input || { observation: null });

      const interpRes = await callGeminiRest(
        modelName,
        interpreterSystemPrompt,
        interpreterInputJson,
        Math.floor(timeoutMs * 0.4) // give 40% of time to interpreter
      );

      // Step B: Planner
      const plannerSystemPrompt = getSystemPrompt('triage');
      let triageContextObj: any = {};
      try {
        triageContextObj =
          typeof options.triage_context === 'string'
            ? JSON.parse(options.triage_context)
            : options.triage_context || {};
      } catch {
        triageContextObj = {};
      }

      // Attach interpreter output to triage context
      try {
        const interpParsed = JSON.parse(interpRes.text);
        triageContextObj.interpreted_observation = interpParsed;
      } catch {
        triageContextObj.interpreted_observation_raw = interpRes.text;
      }

      const plannerRes = await callGeminiRest(
        modelName,
        plannerSystemPrompt,
        JSON.stringify(triageContextObj),
        Math.floor(timeoutMs * 0.6) // give 60% of time to planner
      );

      const totalTokens = {
        input: (interpRes.tokens?.input || 0) + (plannerRes.tokens?.input || 0),
        output: (interpRes.tokens?.output || 0) + (plannerRes.tokens?.output || 0),
      };

      const combinedText = `${interpRes.text}\n\n@@@TRIAGE@@@\n\n${plannerRes.text}`;
      return {
        success: true,
        rawText: combinedText,
        latency_ms: Date.now() - startTime,
        tokens: totalTokens,
        model: modelName,
      };
    } else {
      // Other agents: single prompt execution
      const systemPrompt = getSystemPrompt(options.agent);
      const userContentJson =
        typeof options.context === 'string'
          ? options.context
          : JSON.stringify(options.context || {});

      const result = await callGeminiRest(
        modelName,
        systemPrompt,
        userContentJson,
        timeoutMs
      );

      return {
        success: true,
        rawText: result.text,
        latency_ms: Date.now() - startTime,
        tokens: result.tokens,
        model: modelName,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      latency_ms: Date.now() - startTime,
      model: modelName,
      error: `Gemini direct (${modelName}) failed: ${err.message || String(err)}`,
    };
  }
}
