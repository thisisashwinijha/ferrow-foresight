'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  FileCode,
  ShieldCheck,
  Zap,
  Terminal,
  Database,
  Search,
  Filter,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useToast } from './ToastContext';

export interface AgentCardInfo {
  id: string;
  name: string;
  job: string;
  prompt_version: string;
  provider: string;
  last_run: string;
  avg_latency_ms: number;
  total_runs: number;
  model?: string;
}

export interface AgentRunLogItem {
  id: string | number;
  time: string;
  agent: string;
  machine_id: string;
  latency_ms: number;
  schema_valid: boolean;
  guardrail_pass: boolean;
  notes?: string;
}

export interface PromptDoc {
  filename: string;
  title: string;
  version: string;
  content: string;
}

export interface GoldenScorecardMetric {
  metric: string;
  target: string;
  type: string;
  currentResult?: string;
}

interface AgentConsoleViewProps {
  agents: AgentCardInfo[];
  runLogs: AgentRunLogItem[];
  prompts: PromptDoc[];
  evalResults: Record<string, any> | null;
}

const GOLDEN_TARGET_METRICS: GoldenScorecardMetric[] = [
  { metric: 'Alert precision', target: '>= 0.85', type: 'Quality' },
  { metric: 'Alert recall', target: '>= 0.90', type: 'Quality' },
  { metric: 'False alarm rate on trap cases', target: '<= 10%', type: 'Business' },
  { metric: 'Failure-mode accuracy (alert cases)', target: '>= 0.80', type: 'Quality' },
  { metric: 'Urgency exact match', target: '>= 0.75', type: 'Quality' },
  { metric: 'LOTO correctness', target: '100%', type: 'Safety, release blocker' },
  { metric: 'Uncertified assignment', target: '0 cases', type: 'Safety, release blocker' },
  { metric: 'Insufficient-evidence detection', target: '>= 0.90', type: 'Reliability' },
  { metric: 'Valid JSON', target: '100%', type: 'Engineering' },
  { metric: 'p95 latency per case', target: '< 8 s', type: 'Engineering' },
];

const GOLDEN_CATEGORIES = [
  { category: 'sensor_true_positive', cases: 15, whatItTests: 'Correct mode, urgency, action from sensor trends' },
  { category: 'legacy_observation', cases: 15, whatItTests: 'Tacit-knowledge capture from veteran notes' },
  { category: 'false_alarm_trap', cases: 12, whatItTests: 'Spikes, ambient heat, healthy machines: must NOT alert' },
  { category: 'loto_required', cases: 6, whatItTests: 'Intrusive electrical / hydraulic work flags LOTO' },
  { category: 'no_certified_technician', cases: 6, whatItTests: 'Must escalate, never assign uncertified or expired-cert staff' },
  { category: 'conflicting_signals', cases: 5, whatItTests: 'Normal sensors vs specific veteran symptom: inspect' },
  { category: 'sensor_dropout', cases: 4, whatItTests: 'Missing data: insufficient evidence, inspect sensor' },
  { category: 'vague_observation', cases: 6, whatItTests: 'Vague junior notes: insufficient evidence, no guessing' },
  { category: 'hinglish_observation', cases: 5, whatItTests: 'Hindi/Hinglish notes understood correctly' },
  { category: 'spares_stockout', cases: 6, whatItTests: 'Flags blocked spares and procurement' },
  { category: 'production_window_conflict', cases: 5, whatItTests: 'Picks least-loss window around high-priority runs' },
];

export function AgentConsoleView({
  agents,
  runLogs,
  prompts,
  evalResults,
}: AgentConsoleViewProps) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'agents' | 'logs' | 'scorecard' | 'prompts'>('agents');
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number>(0);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [searchLogQuery, setSearchLogQuery] = useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Filtered run logs
  const filteredLogs = useMemo(() => {
    return runLogs.filter((log) => {
      if (selectedAgentFilter !== 'all' && log.agent !== selectedAgentFilter) return false;
      if (searchLogQuery.trim()) {
        const q = searchLogQuery.toLowerCase();
        const matchesMachine = log.machine_id.toLowerCase().includes(q);
        const matchesAgent = log.agent.toLowerCase().includes(q);
        if (!matchesMachine && !matchesAgent) return false;
      }
      return true;
    });
  }, [runLogs, selectedAgentFilter, searchLogQuery]);

  const activePrompt = prompts[selectedPromptIndex] || prompts[0];

  const handleCopyPrompt = () => {
    if (!activePrompt) return;
    navigator.clipboard.writeText(activePrompt.content);
    setCopiedPrompt(true);
    showToast(`Copied ${activePrompt.filename} to clipboard`, 'success');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Operations engineering
            </span>
            <span className="text-xs text-slate-400">Make.com Agent Architecture • LLM Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Agent console
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status of the 5 specialized AI agents, execution run logs, golden-set evaluation benchmarks, and prompt contracts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'agents'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Agent fleet ({agents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Execution run log</span>
        </button>

        <button
          onClick={() => setActiveTab('scorecard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'scorecard'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Golden-set scorecard</span>
        </button>

        <button
          onClick={() => setActiveTab('prompts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'prompts'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Prompt viewer</span>
        </button>
      </div>

      {/* TAB 1: 5 Agent Cards */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Active agent instances
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Service implementations with deterministic guardrail wrappers and cached/rule-based Make.com agent integration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-indigo-400" />
                        <span>{agent.name}</span>
                      </h3>
                      <div className="text-xs font-mono text-indigo-400 mt-0.5">
                        {agent.prompt_version}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      agent.total_runs > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}>
                      {agent.total_runs > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {agent.total_runs > 0 ? 'Active' : 'No runs yet'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {agent.job}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Provider:</span>
                    <span className="font-medium text-slate-200">
                      {agent.total_runs === 0 ? 'No runs yet' : agent.provider}
                    </span>
                  </div>
                  {agent.model && agent.model !== 'No runs yet' && (
                    <div className="flex justify-between text-slate-400">
                      <span>Model:</span>
                      <span className="font-mono text-slate-200">{agent.model}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Average latency:</span>
                    <span className="font-mono text-slate-200">
                      {agent.total_runs === 0 ? 'No runs yet' : `${agent.avg_latency_ms} ms`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Last run:</span>
                    <span className="text-slate-300">
                      {agent.total_runs === 0 ? 'No runs yet' : agent.last_run}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total executions:</span>
                    <span className="font-mono text-slate-200">
                      {agent.total_runs === 0 ? 'No runs yet' : agent.total_runs}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Execution Run Log Table */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-200">
                Agent execution telemetry log
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Timestamped runs showing target machine, execution latency, schema validation, and guardrail decisions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by machine ID..."
                  value={searchLogQuery}
                  onChange={(e) => setSearchLogQuery(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="bg-slate-950/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-3 font-semibold">Time</th>
                  <th className="py-3 px-3 font-semibold">Agent</th>
                  <th className="py-3 px-3 font-semibold">Machine</th>
                  <th className="py-3 px-3 font-semibold text-right">Latency</th>
                  <th className="py-3 px-3 font-semibold text-center">Schema valid</th>
                  <th className="py-3 px-3 font-semibold text-center">Guardrail pass</th>
                  <th className="py-3 px-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      {runLogs.length === 0 ? 'No runs yet' : 'No agent run logs match your filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {log.time}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 font-medium">
                          {log.agent}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/machines/${log.machine_id}`}
                          className="font-mono text-indigo-400 hover:underline"
                        >
                          {log.machine_id}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {log.latency_ms} ms
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {log.schema_valid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                            Invalid
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {log.guardrail_pass ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Needs review
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                        {log.notes || 'Routine telemetry evaluation'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Golden-Set Scorecard */}
      {activeTab === 'scorecard' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100">
                  Golden dataset evaluation scorecard
                </h2>
                {evalResults ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Evaluation completed
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Evaluation not run yet
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                85 hand-labelled reference cases covering sensor true positives, tacit observations, traps, LOTO rules, and scheduling conflicts.
              </p>
            </div>
          </div>

          {/* Scoring Targets Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Evaluation target criteria (golden/README.md)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-3 font-semibold">Evaluation metric</th>
                    <th className="py-3 px-3 font-semibold">Target threshold</th>
                    <th className="py-3 px-3 font-semibold">Type</th>
                    <th className="py-3 px-3 font-semibold text-right">Status / Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {GOLDEN_TARGET_METRICS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-200">{row.metric}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-400 font-semibold">{row.target}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            row.type.includes('Safety')
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : row.type.includes('Quality')
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {evalResults && evalResults[row.metric] ? (
                          <span className="font-mono text-emerald-400 font-bold">
                            {evalResults[row.metric]}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            Pending eval script execution
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 85-Case Breakdown Table */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Golden set case categories (85 labelled cases)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3 font-semibold">Category</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Cases</th>
                    <th className="py-2.5 px-3 font-semibold">What it tests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {GOLDEN_CATEGORIES.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 font-mono text-indigo-300 text-[11px]">{cat.category}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-200">{cat.cases}</td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">{cat.whatItTests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Read-Only Prompt Viewer */}
      {activeTab === 'prompts' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-200">
                Agent prompt specifications
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Read-only contracts defining system instructions, schema expectations, and strict guardrails.
              </p>
            </div>

            <button
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 self-start sm:self-auto"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPrompt ? 'Copied' : 'Copy prompt markdown'}</span>
            </button>
          </div>

          {/* Prompt Selector Pills */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800">
            {prompts.map((p, idx) => (
              <button
                key={p.filename}
                onClick={() => setSelectedPromptIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                  selectedPromptIndex === idx
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{p.filename}</span>
                <span className="text-[10px] opacity-75 font-mono">({p.version})</span>
              </button>
            ))}
          </div>

          {/* Prompt Content Viewer */}
          {activePrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-slate-300">{activePrompt.title}</span>
                <span className="font-mono">prompts/{activePrompt.filename}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed selection:bg-indigo-900">
                {activePrompt.content}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
