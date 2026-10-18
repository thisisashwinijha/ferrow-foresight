import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { executeAgentWithFallback } from '@/lib/agents/agentRouter';
import { AgentName } from '@/lib/agents/types';
import {
  checkRateLimit,
  isDailyCapExceeded,
  getClientIpFromHeaders,
  getCachedResponse,
} from '@/lib/agents/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_BODY_BYTES = 50 * 1024; // 50 KB

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const agentRequestSchema = z.object({
  agent: z.enum(['triage', 'pm_optimiser', 'copilot', 'knowledge', 'interpreter']),
  context: z.record(z.string(), z.any()).optional().default({}),
  request_id: z.string().optional(),
  plant_id: z.string().optional(),
  machine_id: z.string().optional(),
  trigger: z.string().optional(),
  prompt_version: z.string().optional(),
  interpreter_input: z.any().optional(),
  triage_context: z.any().optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce max body size of 50 KB
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Payload too large. Maximum body size is 50 KB.' },
        { status: 413, headers: CORS_HEADERS }
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Payload too large. Maximum body size is 50 KB.' },
        { status: 413, headers: CORS_HEADERS }
      );
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 2. Validate payload with Zod schema
    const parseResult = agentRequestSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed. Field "agent" must be one of: triage, pm_optimiser, copilot, knowledge, interpreter.',
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const {
      agent,
      context,
      request_id,
      plant_id,
      machine_id,
      trigger,
      interpreter_input,
      triage_context,
    } = parseResult.data;

    // 3. Rate limiting and daily cap protection
    const clientIp = getClientIpFromHeaders(request.headers);
    const rateLimit = checkRateLimit(clientIp);
    const dailyCap = isDailyCapExceeded();

    if (!rateLimit.allowed || dailyCap.exceeded) {
      const cached = getCachedResponse(
        agent as AgentName,
        'v1.0',
        context
      );
      if (cached) {
        return NextResponse.json(
          {
            success: true,
            data: cached.data,
            provider: 'cached',
            model: cached.model || 'local-cache',
            cached_note:
              'Rate limit reached. Serving validated cached recommendation.',
          },
          { headers: CORS_HEADERS }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            'Live agent rate limit reached. Please try again shortly or use cached mode.',
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // 4. Execute agent through fallback chain with guardrails and observability
    const targetMachineId =
      machine_id || (context as any)?.machine_id || 'P07-M01';
    const targetPlantId =
      plant_id || (context as any)?.plant_id || 'P-07';

    const result = await executeAgentWithFallback({
      agent: agent as AgentName,
      context,
      request_id,
      machine_id: targetMachineId,
      plant_id: targetPlantId,
      trigger: trigger || 'remote_agent_api',
      interpreter_input,
      triage_context,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        provider: result.provider,
        model: result.model,
        prompt_version: result.prompt_version,
        cached_note: result.cached_note,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    // Never expose secrets, internal paths, or database errors
    console.error('Remote /api/agent error:', error?.message || 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: 'Agent service temporarily unavailable. Please try again later.',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
