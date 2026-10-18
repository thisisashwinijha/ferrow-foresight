import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAgent, getProviderSequence } from '../lib/agents/agentRouter';
import * as makeModule from '../lib/agents/providers/makeProvider';
import * as directModule from '../lib/agents/providers/directProvider';
import * as cachedModule from '../lib/agents/providers/cachedProvider';
import { clearCache } from '../lib/agents/cache';

vi.mock('../lib/agents/providers/makeProvider');
vi.mock('../lib/agents/providers/directProvider');
vi.mock('../lib/agents/providers/cachedProvider');

const validPlannerJson = JSON.stringify({
  machine_id: 'P01-M01',
  failure_mode: 'bearing_wear',
  confidence: 0.9,
  urgency: 'P2',
  alert: true,
  insufficient_evidence: false,
  evidence: [
    {
      id: 'EV-1',
      type: 'vibration',
      text: 'Peak vibration 7.2 mm/s',
    },
  ],
  reasoning: 'Vibration pattern indicates bearing wear',
  action_type: 'inspect',
  recommended_action: 'Check lubrication',
  loto_required: false,
  required_certifications: [],
  assigned_technician: 'EMP-01',
});

describe('Agent Fallback Chain (Step 12 Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();

    // Default mock implementation for callCachedProvider so it always returns a valid structure
    vi.mocked(cachedModule.callCachedProvider).mockResolvedValue({
      success: true,
      data: JSON.parse(validPlannerJson),
      provider: 'cached',
      model: 'rule-based-baseline',
      prompt_version: 'v1.0.0',
      latency_ms: 5,
      schema_valid: true,
      guardrail_pass: true,
      fallback_used: true,
      fallback_chain: ['cached'],
      cached_note: 'Live AI busy, showing last validated recommendation',
    });
  });

  it('determines correct provider sequence for forced direct provider', () => {
    const seq = getProviderSequence('direct');
    expect(seq).toEqual(['direct', 'direct_fallback', 'cached']);
  });

  it('determines correct provider sequence for forced cached provider', () => {
    const seq = getProviderSequence('cached');
    expect(seq).toEqual(['cached']);
  });

  it('records provider as make when Make succeeds', async () => {
    vi.mocked(makeModule.callMakeProvider).mockResolvedValueOnce({
      success: true,
      rawText: validPlannerJson,
      model: 'make-scenario',
      latency_ms: 120,
    });

    const result = await executeAgent({
      agent: 'triage',
      forceProvider: 'make',
      context: { machine_id: 'P01-M01', reading: 'high_vibe' },
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('make');
    expect(result.fallback_used).toBe(false);
    expect(result.data.alert).toBe(true);
  });

  it('falls back from Make to Direct when Make fails', async () => {
    // Make fails
    vi.mocked(makeModule.callMakeProvider).mockResolvedValueOnce({
      success: false,
      error: 'Make webhook timed out',
      model: 'make-scenario',
      latency_ms: 25000,
    });

    // Direct succeeds
    vi.mocked(directModule.callDirectProvider).mockResolvedValueOnce({
      success: true,
      rawText: validPlannerJson,
      model: 'gemini-flash-lite-latest',
      latency_ms: 450,
    });

    const result = await executeAgent({
      agent: 'triage',
      forceProvider: 'make',
      context: { machine_id: 'P01-M02', reading: 'extreme_vibe' },
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('direct');
    expect(result.fallback_used).toBe(true);
    expect(result.fallback_chain).toContain('make');
    expect(result.fallback_chain).toContain('direct');
  });

  it('falls back through full chain to cached when all live providers fail, presenting calm note and no raw error', async () => {
    // Make fails
    vi.mocked(makeModule.callMakeProvider).mockResolvedValueOnce({
      success: false,
      error: 'Make HTTP 500',
      model: 'make-scenario',
      latency_ms: 100,
    });

    // Direct fails
    vi.mocked(directModule.callDirectProvider).mockResolvedValueOnce({
      success: false,
      error: 'Direct API quota exceeded (HTTP 429)',
      model: 'gemini-flash-lite-latest',
      latency_ms: 100,
    });

    // Direct fallback model fails
    vi.mocked(directModule.callDirectProvider).mockResolvedValueOnce({
      success: false,
      error: 'Direct fallback quota exceeded (HTTP 429)',
      model: 'gemini-flash-latest',
      latency_ms: 100,
    });

    const result = await executeAgent({
      agent: 'triage',
      forceProvider: 'make',
      context: { machine_id: 'P01-M03' },
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('cached');
    expect(result.fallback_used).toBe(true);
    expect(result.cached_note).toContain('Live AI busy');
    // Ensure no raw error or secret is leaked to the user
    expect(result.cached_note).not.toContain('HTTP 500');
    expect(result.cached_note).not.toContain('429');
    expect(result.data).toBeDefined();
  });
});
