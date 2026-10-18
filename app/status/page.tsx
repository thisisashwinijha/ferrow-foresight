import React from 'react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Cpu,
  Zap,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { getTodayLiveCallStats } from '@/lib/agents/cache';
import { getLastAgentErrors, getLastMakeRun } from '@/lib/data/agentRuns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory cache for Gemini direct check (60-second TTL)
let geminiCheckCache: {
  status: 'operational' | 'unavailable' | 'not_configured';
  model: string;
  latency_ms: number;
  timestamp: number;
  error?: string;
} | null = null;

async function checkGeminiDirect(): Promise<{
  status: 'operational' | 'unavailable' | 'not_configured';
  model: string;
  latency_ms: number;
  error?: string;
  cached: boolean;
}> {
  const now = Date.now();
  if (geminiCheckCache && now - geminiCheckCache.timestamp < 60000) {
    return {
      status: geminiCheckCache.status,
      model: geminiCheckCache.model,
      latency_ms: geminiCheckCache.latency_ms,
      error: geminiCheckCache.error,
      cached: true,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    geminiCheckCache = {
      status: 'not_configured',
      model: primaryModel,
      latency_ms: 0,
      timestamp: now,
    };
    return { ...geminiCheckCache, cached: false };
  }

  const start = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'status ping' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    });

    const latency = Date.now() - start;

    if (res.ok) {
      geminiCheckCache = {
        status: 'operational',
        model: primaryModel,
        latency_ms: latency,
        timestamp: now,
      };
    } else {
      geminiCheckCache = {
        status: 'unavailable',
        model: primaryModel,
        latency_ms: latency,
        error: `HTTP ${res.status}`,
        timestamp: now,
      };
    }
  } catch (err: any) {
    const latency = Date.now() - start;
    geminiCheckCache = {
      status: 'unavailable',
      model: primaryModel,
      latency_ms: latency,
      error: err?.message || 'Connection error',
      timestamp: now,
    };
  }

  return { ...geminiCheckCache, cached: false };
}

async function checkSupabase(): Promise<{
  status: 'connected' | 'disconnected' | 'not_configured';
  latency_ms: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const { getSupabaseBrowserClient } = await import('@/lib/supabase');
    const client = getSupabaseBrowserClient();
    if (!client) {
      return { status: 'not_configured', latency_ms: 0 };
    }

    const { error } = await client.from('plants').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      return {
        status: 'disconnected',
        latency_ms: latency,
        error: error.message,
      };
    }

    return { status: 'connected', latency_ms: latency };
  } catch (err: any) {
    return {
      status: 'disconnected',
      latency_ms: Date.now() - start,
      error: err?.message || 'Connection failed',
    };
  }
}

export default async function StatusPage() {
  noStore();

  const [supabase, gemini, makeRun, callStats, errors] = await Promise.all([
    checkSupabase(),
    checkGeminiDirect(),
    getLastMakeRun(),
    getTodayLiveCallStats(),
    getLastAgentErrors(5),
  ]);

  const capPct = Math.min(
    100,
    Math.round((callStats.todayCalls / callStats.dailyCap) * 100)
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              System health
            </span>
            <span className="text-xs text-slate-400">
              Live Infrastructure & Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Service status & observability
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status of database backends, multi-provider LLM integrations, quota consumption, and operational errors.
          </p>
        </div>

        <Link
          href="/agent"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 self-start sm:self-auto"
        >
          <span>Agent console</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supabase Service */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Supabase</h3>
                  <p className="text-[11px] text-slate-400">PostgreSQL Cloud DB</p>
                </div>
              </div>

              {supabase.status === 'connected' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Operational
                </span>
              ) : supabase.status === 'not_configured' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Seed fallback
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  <XCircle className="w-3 h-3" />
                  Degraded
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Live query health check querying plant records with automatic seed fallback circuit breaker.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Query latency:</span>
              <span className="font-mono text-slate-200">
                {supabase.latency_ms > 0 ? `${supabase.latency_ms} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Connection:</span>
              <span className="text-slate-300 font-medium capitalize">
                {supabase.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Gemini Direct Service */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Gemini Direct</h3>
                  <p className="text-[11px] text-slate-400">Google AI Studio</p>
                </div>
              </div>

              {gemini.status === 'operational' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Operational
                </span>
              ) : gemini.status === 'not_configured' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                  No API key
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  <XCircle className="w-3 h-3" />
                  Unavailable
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Direct Gemini API connection with temperature 0. Cheap 1-token health check cached for 60 seconds.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Model ID:</span>
              <span className="font-mono text-indigo-400 font-medium">
                {gemini.model}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Latency (check):</span>
              <span className="font-mono text-slate-200">
                {gemini.latency_ms > 0 ? `${gemini.latency_ms} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cache state:</span>
              <span className="text-slate-400">
                {gemini.cached ? 'Cached (60s TTL)' : 'Live queried'}
              </span>
            </div>
          </div>
        </div>

        {/* Make.com Service */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Make.com</h3>
                  <p className="text-[11px] text-slate-400">Webhook Scenario</p>
                </div>
              </div>

              {makeRun ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                  Idle / Ready
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Telemetry derived strictly from recorded agent runs. Never pings Make webhooks purely for status.
            </p>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Last successful run:</span>
              <span className="font-mono text-slate-200">
                {makeRun?.timestamp
                  ? new Date(makeRun.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'No runs yet'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Last run latency:</span>
              <span className="font-mono text-slate-200">
                {makeRun?.latency_ms ? `${makeRun.latency_ms} ms` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quota & Daily Cap Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Live AI quota & abuse protection
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cost safeguards enforce a per-IP rate limit of 10 calls/hr and a global daily ceiling of {callStats.dailyCap} live calls.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">Consumption: </span>
            <span className="text-sm font-mono font-bold text-slate-100">
              {callStats.todayCalls} / {callStats.dailyCap}
            </span>
            <span className="text-xs text-slate-400"> calls today</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                capPct > 90
                  ? 'bg-rose-500'
                  : capPct > 70
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${capPct}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500">
            <span>0 calls</span>
            <span>{callStats.dailyCap - callStats.todayCalls} live calls remaining today</span>
            <span>Cap: {callStats.dailyCap} calls</span>
          </div>
        </div>
      </div>

      {/* Last 5 Errors Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-200">
              Recent agent errors
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Last 5 recorded errors sanitized to ensure zero credentials, tokens, or webhook URLs are logged.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3 font-semibold">Time</th>
                <th className="py-2.5 px-3 font-semibold">Agent</th>
                <th className="py-2.5 px-3 font-semibold">Step</th>
                <th className="py-2.5 px-3 font-semibold">Sanitized error message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {errors.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-slate-500 italic"
                  >
                    No errors recorded
                  </td>
                </tr>
              ) : (
                errors.map((err) => (
                  <tr key={err.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                      {err.created_at ? err.created_at.slice(0, 19).replace('T', ' ') : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">
                      {err.agent}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {err.step}
                    </td>
                    <td className="py-2.5 px-3 text-rose-400 font-mono text-[11px] max-w-md truncate">
                      {err.error}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
