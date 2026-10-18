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
    const key = r.id || `${r.agent || ''}-${r.step || ''}-${r.created_at || ''}-${r.latency_ms || ''}`;
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
    const mapped = mapStepToId[r.step] || mapStepToId[r.agent] || r.step || r.agent;
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
      statsByAgent[id] = {
        totalRuns: list.length,
        avgLatencyMs: Math.round(sumLatency / list.length),
        provider: provider,
        model: latest.model || provider,
        lastRun: latest.created_at || null,
        lastRunDate: latest.created_at || null,
      };
    }
  }

  return statsByAgent;
}
