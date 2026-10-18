import fs from 'fs';
import path from 'path';
import {
  AgentConsoleView,
  AgentCardInfo,
  AgentRunLogItem,
  PromptDoc,
} from '@/components/AgentConsoleView';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AgentConsolePage() {
  noStore();

  // 1. Define the 5 Agent Cards
  const agents: AgentCardInfo[] = [
    {
      id: 'signal_interpreter',
      name: 'Signal Interpreter',
      job: 'Continuous telemetry screening to detect early vibration anomalies and temperature divergence across plant equipment.',
      prompt_version: 'interp-v1.0',
      provider: 'Gemini 1.5 Flash via Make.com (cached for now)',
      last_run: '4 minutes ago',
      avg_latency_ms: 620,
      total_runs: 1420,
    },
    {
      id: 'triage_planner',
      name: 'Triage Planner',
      job: 'Synthesises sensor anomalies, technician observations, and machine history into validated alerts with recommended intervention and certified staff assignment.',
      prompt_version: 'triage-v1.0',
      provider: 'Gemini 1.5 Flash via Make.com (cached for now)',
      last_run: '12 minutes ago',
      avg_latency_ms: 1180,
      total_runs: 486,
    },
    {
      id: 'pm_optimiser',
      name: 'PM Optimiser',
      job: 'Evaluates planned maintenance schedules against live equipment risk to safely defer unneeded routines or pull forward urgent interventions.',
      prompt_version: 'pm-v1.0',
      provider: 'Gemini 1.5 Flash via Make.com (cached for now)',
      last_run: '18 minutes ago',
      avg_latency_ms: 840,
      total_runs: 230,
    },
    {
      id: 'plant_copilot',
      name: 'Plant Copilot',
      job: 'Context-aware maintenance assistant answering operational queries, risk explanations, and schedule blockers with strict safety guardrails.',
      prompt_version: 'copilot-v1.0',
      provider: 'Gemini 1.5 Flash via Make.com (cached for now)',
      last_run: 'Just now',
      avg_latency_ms: 450,
      total_runs: 890,
    },
    {
      id: 'knowledge_agent',
      name: 'Knowledge Agent',
      job: 'Converts completed work orders and veteran observations into institutional sensory heuristics and junior learning cards.',
      prompt_version: 'knowledge-v1.0',
      provider: 'Gemini 1.5 Flash via Make.com (cached for now)',
      last_run: '25 minutes ago',
      avg_latency_ms: 710,
      total_runs: 175,
    },
  ];

  // 2. Execution Run Logs
  const runLogs: AgentRunLogItem[] = [
    {
      id: 'RUN-1092',
      time: '2026-10-18 14:48:12',
      agent: 'Signal Interpreter',
      machine_id: 'P07-M03',
      latency_ms: 540,
      schema_valid: true,
      guardrail_pass: true,
      notes: 'Telemetry screening: vibration 4.8 mm/s elevated above 4.5 mm/s limit',
    },
    {
      id: 'RUN-1091',
      time: '2026-10-18 14:45:00',
      agent: 'Triage Planner',
      machine_id: 'P07-M03',
      latency_ms: 1240,
      schema_valid: true,
      guardrail_pass: false,
      notes: 'Rule 7 triggered: P1 alert on Criticality A equipment flagged for Plant Head review',
    },
    {
      id: 'RUN-1090',
      time: '2026-10-18 14:30:22',
      agent: 'PM Optimiser',
      machine_id: 'P07-M03',
      latency_ms: 810,
      schema_valid: true,
      guardrail_pass: true,
      notes: 'Pulled forward PM-903 from Oct 24 to Oct 19 to align with AL-9156 urgency',
    },
    {
      id: 'RUN-1089',
      time: '2026-10-18 14:15:05',
      agent: 'Plant Copilot',
      machine_id: 'P07-M03',
      latency_ms: 420,
      schema_valid: true,
      guardrail_pass: true,
      notes: 'Operational risk explanation for Line 1 CNC lathe',
    },
    {
      id: 'RUN-1088',
      time: '2026-10-18 13:55:40',
      agent: 'Knowledge Agent',
      machine_id: 'P07-M09',
      latency_ms: 730,
      schema_valid: true,
      guardrail_pass: true,
      notes: 'Extracted sensory cues for hydraulic cylinder seal extrusion',
    },
    {
      id: 'RUN-1087',
      time: '2026-10-18 13:30:11',
      agent: 'Triage Planner',
      machine_id: 'P07-M06',
      latency_ms: 1110,
      schema_valid: true,
      guardrail_pass: true,
      notes: 'Compressor bearing wear P2 alert verified and scheduled on changeover',
    },
    {
      id: 'RUN-1086',
      time: '2026-10-18 12:45:19',
      agent: 'Signal Interpreter',
      machine_id: 'P07-M01',
      latency_ms: 590,
      schema_valid: true,
      guardrail_pass: true,
      notes: 'Normal screening: 1.8 mm/s within ISO 10816 Class II good zone',
    },
    {
      id: 'RUN-1085',
      time: '2026-10-18 11:20:00',
      agent: 'PM Optimiser',
      machine_id: 'P07-M02',
      latency_ms: 790,
      schema_valid: true,
      guardrail_pass: true,
      notes: 'Deferred routine lubrication by 14 days based on low operating hours',
    },
  ];

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
