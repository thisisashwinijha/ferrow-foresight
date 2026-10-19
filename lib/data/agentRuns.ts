import { queryWithFallback } from './db';
import { getMemoryAgentRuns } from '../agents/observability';
import { AgentRunRecord } from '../agents/types';

export function getAgentRunsSync(limit = 100): AgentRunRecord[] {
  return getMemoryAgentRuns().slice(0, limit);
}

export async function getAgentRuns(limit = 100): Promise<AgentRunRecord[]> {
  const memoryRuns = getAgentRunsSync(limit);
  const dbRuns = await queryWithFallback<AgentRunRecord[]>(
    async (client) => {
      const { data, error } = await client
        .from('agent_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error || !data) return { data: null, error };
      return { data: data as AgentRunRecord[], error: null };
    },
    () => memoryRuns,
    'getAgentRuns'
  );

  const seen = new Set<string>();
  const combined: AgentRunRecord[] = [];

  for (const r of [...memoryRuns, ...(dbRuns || [])]) {
    const key = String(r.id || `${(r as any).agent || ''}-${r.step || ''}-${r.created_at || ''}-${r.latency_ms || ''}`);
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(r);
    }
  }

  combined.sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tB - tA;
  });

  return combined.slice(0, limit);
}

export async function getAgentStatistics() {
  const runs = await getAgentRuns(200);

  const statsByAgent: Record<
    string,
    {
      totalRuns: number;
      avgLatencyMs: number;
      provider: string;
      model: string;
      lastRun: string | null;
      lastRunDate: string | null;
    }
  > = {};

  const agentIds = [
    'signal_interpreter',
    'triage_planner',
    'pm_optimiser',
    'plant_copilot',
    'knowledge_agent',
  ];

  for (const id of agentIds) {
    statsByAgent[id] = {
      totalRuns: 0,
      avgLatencyMs: 0,
      provider: 'No runs yet',
      model: 'No runs yet',
      lastRun: 'No runs yet',
      lastRunDate: null,
    };
  }

  const mapStepToId: Record<string, string> = {
    interpreter: 'signal_interpreter',
    signal_interpreter: 'signal_interpreter',
    triage: 'triage_planner',
    triage_planner: 'triage_planner',
    pm_optimiser: 'pm_optimiser',
    copilot: 'plant_copilot',
    plant_copilot: 'plant_copilot',
    knowledge: 'knowledge_agent',
    knowledge_agent: 'knowledge_agent',
  };

  const runsByMappedId: Record<string, AgentRunRecord[]> = {};

  for (const r of runs) {
    const agentVal = (r as any).agent;
    const mapped = mapStepToId[r.step] || (agentVal && mapStepToId[agentVal]) || r.step || agentVal;
    if (!runsByMappedId[mapped]) {
      runsByMappedId[mapped] = [];
    }
    runsByMappedId[mapped].push(r);
  }

  for (const id of agentIds) {
    const list = runsByMappedId[id] || [];
    if (list.length > 0) {
      const sumLatency = list.reduce((acc, curr) => acc + (curr.latency_ms || 0), 0);
      const latest = list[0];
      const provider = latest.input?.provider || latest.output?.provider || latest.model || 'live';
      const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const resolvedModel = latest.model && latest.model.includes('gemini') ? latest.model : defaultModel;
      statsByAgent[id] = {
        totalRuns: list.length,
        avgLatencyMs: Math.round(sumLatency / list.length),
        provider: provider,
        model: resolvedModel,
        lastRun: latest.created_at || null,
        lastRunDate: latest.created_at || null,
      };
    }
  }

  return statsByAgent;
}

export async function getLastAgentErrors(limit = 5): Promise<
  Array<{
    id: string;
    agent: string;
    step: string;
    error: string;
    created_at: string;
  }>
> {
  const runs = await getAgentRuns(200);
  const errors: Array<{
    id: string;
    agent: string;
    step: string;
    error: string;
    created_at: string;
  }> = [];

  for (const r of runs) {
    if (r.error || (r as any).status === 'failure') {
      errors.push({
        id: String(r.id || `ERR-${errors.length + 1}`),
        agent: (r as any).agent || r.step || 'Agent',
        step: r.step || 'Execution',
        error: r.error || 'Execution failed',
        created_at: r.created_at || new Date().toISOString(),
      });
      if (errors.length >= limit) break;
    }
  }

  return errors;
}

export async function getLastMakeRun(): Promise<{
  timestamp: string | null;
  status: string;
  latency_ms: number;
} | null> {
  const runs = await getAgentRuns(200);
  for (const r of runs) {
    const isMake =
      r.input?.provider === 'make' ||
      r.output?.provider === 'make' ||
      r.model === 'make-webhook' ||
      (r as any).agent === 'make';
    if (isMake && !r.error) {
      return {
        timestamp: r.created_at || null,
        status: 'Operational',
        latency_ms: r.latency_ms || 0,
      };
    }
  }
  return null;
}
