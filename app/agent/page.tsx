import fs from 'fs';
import path from 'path';
import {
  AgentConsoleView,
  AgentCardInfo,
  AgentRunLogItem,
  PromptDoc,
} from '@/components/AgentConsoleView';
import { unstable_noStore as noStore } from 'next/cache';
import { getAgentRuns, getAgentStatistics } from '@/lib/data/agentRuns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'No runs yet';
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'No runs yet';
  }
}

export default async function AgentConsolePage() {
  noStore();

  const [stats, rawRuns] = await Promise.all([
    getAgentStatistics(),
    getAgentRuns(100),
  ]);

  // 1. Define the 5 Agent Cards using real statistics from agent_runs
  const agentCardsConfig = [
    {
      id: 'signal_interpreter',
      name: 'Signal Interpreter',
      job: 'Continuous telemetry screening to detect early vibration anomalies and temperature divergence across plant equipment.',
      prompt_version: 'interp-v1.0',
    },
    {
      id: 'triage_planner',
      name: 'Triage Planner',
      job: 'Synthesises sensor anomalies, technician observations, and machine history into validated alerts with recommended intervention and certified staff assignment.',
      prompt_version: 'triage-v1.0',
    },
    {
      id: 'pm_optimiser',
      name: 'PM Optimiser',
      job: 'Evaluates planned maintenance schedules against live equipment risk to safely defer unneeded routines or pull forward urgent interventions.',
      prompt_version: 'pm-v1.0',
    },
    {
      id: 'plant_copilot',
      name: 'Plant Copilot',
      job: 'Context-aware maintenance assistant answering operational queries, risk explanations, and schedule blockers with strict safety guardrails.',
      prompt_version: 'copilot-v1.0',
    },
    {
      id: 'knowledge_agent',
      name: 'Knowledge Agent',
      job: 'Converts completed work orders and veteran observations into institutional sensory heuristics and junior learning cards.',
      prompt_version: 'knowledge-v1.0',
    },
  ];

  const agents: AgentCardInfo[] = agentCardsConfig.map((cfg) => {
    const s = stats[cfg.id];
    const hasRuns = s && s.totalRuns > 0;
    return {
      id: cfg.id,
      name: cfg.name,
      job: cfg.job,
      prompt_version: cfg.prompt_version,
      provider: hasRuns ? s.provider : 'No runs yet',
      model: hasRuns ? s.model : 'No runs yet',
      last_run: hasRuns ? formatRelativeTime(s.lastRunDate) : 'No runs yet',
      avg_latency_ms: hasRuns ? s.avgLatencyMs : 0,
      total_runs: hasRuns ? s.totalRuns : 0,
    };
  });

  // 2. Execution Run Logs directly from agent_runs
  const agentNameMap: Record<string, string> = {
    signal_interpreter: 'Signal Interpreter',
    interpreter: 'Signal Interpreter',
    triage_planner: 'Triage Planner',
    triage: 'Triage Planner',
    pm_optimiser: 'PM Optimiser',
    plant_copilot: 'Plant Copilot',
    copilot: 'Plant Copilot',
    knowledge_agent: 'Knowledge Agent',
    knowledge: 'Knowledge Agent',
  };

  const runLogs: AgentRunLogItem[] = rawRuns.map((r, idx) => {
    const agentName =
      agentNameMap[r.step] ||
      agentNameMap[r.agent] ||
      r.agent ||
      r.step ||
      'Unknown Agent';

    const machineId =
      r.input?.machine_id ||
      r.input?.context?.machine_id ||
      r.input?.alert_id ||
      '—';

    let formattedTime = 'Just now';
    if (r.created_at) {
      try {
        const d = new Date(r.created_at);
        formattedTime = d.toISOString().replace('T', ' ').slice(0, 19);
      } catch {
        formattedTime = r.created_at;
      }
    }

    const providerStr = r.input?.provider || 'live';
    const note = r.error ? `Error: ${r.error}` : `Provider: ${providerStr} (${r.model})`;

    return {
      id: r.id || `RUN-${idx + 1}`,
      time: formattedTime,
      agent: agentName,
      machine_id: machineId,
      latency_ms: r.latency_ms || 0,
      schema_valid: r.input?.schema_valid !== false && r.status === 'success',
      guardrail_pass: r.input?.guardrail_pass !== false && r.status === 'success',
      notes: note,
    };
  });

  // 3. Read Prompts from prompts/*.md
  const promptFiles = [
    { filename: 'signal_interpreter.md', title: 'Signal Interpreter Agent', version: 'interp-v1.0' },
    { filename: 'triage_planner.md', title: 'Triage Planner Agent', version: 'triage-v1.0' },
    { filename: 'pm_optimiser.md', title: 'PM Optimiser Agent', version: 'pm-v1.0' },
    { filename: 'copilot.md', title: 'Plant Copilot Agent', version: 'copilot-v1.0' },
    { filename: 'knowledge_agent.md', title: 'Knowledge Agent', version: 'knowledge-v1.0' },
  ];

  const prompts: PromptDoc[] = [];
  const promptsDir = path.join(process.cwd(), 'prompts');

  for (const pf of promptFiles) {
    const fullPath = path.join(promptsDir, pf.filename);
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        prompts.push({
          filename: pf.filename,
          title: pf.title,
          version: pf.version,
          content,
        });
      }
    } catch (err) {
      console.error(`Error reading prompt file ${pf.filename}:`, err);
    }
  }

  // 4. Read Golden Evaluation Results if available
  let evalResults: Record<string, any> | null = null;
  const evalPath = path.join(process.cwd(), 'golden', 'eval_results.json');
  try {
    if (fs.existsSync(evalPath)) {
      evalResults = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read golden/eval_results.json, displaying target metrics instead.');
  }

  return (
    <AgentConsoleView
      agents={agents}
      runLogs={runLogs}
      prompts={prompts}
      evalResults={evalResults}
    />
  );
}
