'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Machine,
  Plant,
  Line,
  PmPlan,
  Alert,
} from '@/lib/types';
import { usePlantContext } from './PlantContext';
import { useToast } from './ToastContext';
import type { PmOptimiserDecision, PmOptimiserResult } from '@/lib/pmOptimiserService';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Check,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

interface MaintenancePlanningViewProps {
  initialPmPlans: PmPlan[];
  machines: Machine[];
  plant?: Plant;
  lines: Line[];
  alerts: Alert[];
  initialOptimiserResult?: PmOptimiserResult | null;
}

export function MaintenancePlanningView({
  initialPmPlans,
  machines,
  plant,
  lines,
  alerts,
  initialOptimiserResult,
}: MaintenancePlanningViewProps) {
  const router = useRouter();
  const { plantId, role } = usePlantContext();
  const { showToast } = useToast();

  const [pmPlans, setPmPlans] = useState<PmPlan[]>(initialPmPlans);
  const [optimiserResult, setOptimiserResult] = useState<PmOptimiserResult | null>(
    initialOptimiserResult || null
  );
  const [isRunningOptimiser, setIsRunningOptimiser] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'defer' | 'pull_forward' | 'keep'>('all');

  // Override dialog state
  const [overrideTarget, setOverrideTarget] = useState<PmPlan | null>(null);
  const [overrideDecision, setOverrideDecision] = useState<'keep' | 'defer' | 'pull_forward'>('keep');
  const [overrideDate, setOverrideDate] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Machine map for fast lookups
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach((m) => map.set(m.id, m));
    return map;
  }, [machines]);

  // Merge AI decisions map with PM plans
  const decisionsMap = useMemo(() => {
    const map = new Map<string, PmOptimiserDecision>();
    if (optimiserResult?.decisions) {
      optimiserResult.decisions.forEach((d) => map.set(d.pm_task_id, d));
    }
    return map;
  }, [optimiserResult]);

  // Strategy mix breakdown for selected plant
  const strategyMix = useMemo(() => {
    const counts = { CBM: 0, PM: 0, RBM: 0, BM: 0 };
    machines.forEach((m) => {
      const strat = m.strategy || 'PM';
      if (counts[strat] !== undefined) {
        counts[strat]++;
      }
    });
    const total = machines.length || 1;
    return {
      counts,
      total,
      percentages: {
        CBM: Math.round((counts.CBM / total) * 100),
        PM: Math.round((counts.PM / total) * 100),
        RBM: Math.round((counts.RBM / total) * 100),
        BM: Math.round((counts.BM / total) * 100),
      },
    };
  }, [machines]);

  // 3x3 Risk Matrix: Criticality (A, B, C) vs Probability (Low, Medium, High)
  const riskMatrix = useMemo(() => {
    const matrix: Record<'A' | 'B' | 'C', Record<'high' | 'medium' | 'low', Machine[]>> = {
      A: { high: [], medium: [], low: [] },
      B: { high: [], medium: [], low: [] },
      C: { high: [], medium: [], low: [] },
    };

    machines.forEach((m) => {
      const crit = (m.criticality || 'B') as 'A' | 'B' | 'C';
      const machineAlerts = alerts.filter(
        (a) => a.machine_id === m.id && (a.status === 'pending' || a.status === 'needs_review')
      );
      const hasP1P2 = machineAlerts.some((a) => a.urgency === 'P1' || a.urgency === 'P2');

      let prob: 'high' | 'medium' | 'low' = 'low';
      if (hasP1P2 || (m.risk_score && m.risk_score >= 60)) {
        prob = 'high';
      } else if (machineAlerts.length > 0 || (m.risk_score && m.risk_score >= 30)) {
        prob = 'medium';
      } else {
        prob = 'low';
      }

      if (matrix[crit] && matrix[crit][prob]) {
        matrix[crit][prob].push(m);
      }
    });

    return matrix;
  }, [machines, alerts]);

  // Filtered PM plan rows
  const filteredPlans = useMemo(() => {
    return pmPlans.filter((p) => {
      const aiDecision = decisionsMap.get(p.id)?.decision || p.ai_suggestion;
      if (filterType === 'all') return true;
      return aiDecision === filterType;
    });
  }, [pmPlans, decisionsMap, filterType]);

  // Summary strip metrics
  const summaryMetrics = useMemo(() => {
    if (optimiserResult?.summary) {
      return optimiserResult.summary;
    }
    const defCount = pmPlans.filter((p) => p.ai_suggestion === 'defer').length;
    const pullCount = pmPlans.filter((p) => p.ai_suggestion === 'pull_forward').length;
    const keepCount = pmPlans.filter((p) => p.ai_suggestion === 'keep').length;
    return {
      tasks_reviewed: pmPlans.length,
      keep: keepCount,
      defer: defCount,
      pull_forward: pullCount,
      visits_avoided: defCount,
      technician_hours_saved: parseFloat((defCount * 1.5).toFixed(1)),
      planned_downtime_hours_saved: parseFloat((defCount * 1.5).toFixed(1)),
      headline: `${defCount} PM visits can be safely deferred based on real-time asset condition.`,
    };
  }, [optimiserResult, pmPlans]);

  // Handler: Run PM Optimiser
  const handleRunOptimiser = async () => {
    setIsRunningOptimiser(true);
    try {
      const res = await fetch('/api/pm-optimiser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: plant?.id || 'P-07' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOptimiserResult(data.result);
        showToast(
          `PM Optimiser complete: ${data.result.summary.defer} deferrals identified, ${data.result.summary.pull_forward} pulled forward.`,
          'success'
        );
      } else {
        showToast(data.error || 'Failed to run PM Optimiser', 'alert');
      }
    } catch {
      showToast('Network error while running PM Optimiser', 'alert');
    } finally {
      setIsRunningOptimiser(false);
    }
  };

  // Handler: Accept Single Suggestion
  const handleAccept = async (plan: PmPlan) => {
    const aiDec = decisionsMap.get(plan.id);
    const newDueDate = aiDec?.new_due_date || plan.due_date;

    try {
      const res = await fetch('/api/pm-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          id: plan.id,
          new_due_date: newDueDate,
          decided_by: role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPmPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, status: 'accepted', due_date: newDueDate } : p))
        );
        showToast(`AI suggestion accepted for ${plan.task} (${plan.machine_id})`, 'success');
      } else {
        showToast(data.error || 'Failed to accept suggestion', 'alert');
      }
    } catch {
      showToast('Network error while accepting suggestion', 'alert');
    }
  };

  // Handler: Bulk Accept Safe Deferrals
  const handleBulkAcceptDeferrals = async () => {
    try {
      const res = await fetch('/api/pm-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_all_safe_deferrals',
          plantId: plant?.id || 'P-07',
          decided_by: role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPmPlans((prev) =>
          prev.map((p) => {
            const aiDec = decisionsMap.get(p.id)?.decision || p.ai_suggestion;
            return aiDec === 'defer' ? { ...p, status: 'accepted' } : p;
          })
        );
        showToast(`Accepted all ${data.count} safe deferrals! Saved technician visits.`, 'success');
      } else {
        showToast(data.error || 'Failed to accept deferrals', 'alert');
      }
    } catch {
      showToast('Network error while applying bulk deferrals', 'alert');
    }
  };

  // Handler: Open Override Modal
  const handleOpenOverride = (plan: PmPlan) => {
    setOverrideTarget(plan);
    setOverrideDecision(plan.ai_suggestion || 'keep');
    setOverrideDate(plan.due_date);
    setOverrideReason('');
  };

  // Handler: Submit Override
  const handleSubmitOverride = async () => {
    if (!overrideTarget) return;
    if (!overrideReason.trim()) {
      showToast('Please provide an operational reason for the override', 'warning');
      return;
    }

    // Guardrail: keep and pull_forward may never move date later
    if (
      (overrideDecision === 'keep' || overrideDecision === 'pull_forward') &&
      new Date(overrideDate) > new Date(overrideTarget.due_date)
    ) {
      showToast(`Guardrail violation: A ${overrideDecision} decision cannot move due date later than ${overrideTarget.due_date}`, 'alert');
      return;
    }

    setIsSubmittingOverride(true);
    try {
      const res = await fetch('/api/pm-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'override',
          id: overrideTarget.id,
          override_decision: overrideDecision,
          current_due_date: overrideTarget.due_date,
          new_due_date: overrideDate,
          reason: overrideReason.trim(),
          decided_by: role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPmPlans((prev) =>
          prev.map((p) =>
            p.id === overrideTarget.id
              ? {
                  ...p,
                  status: 'overridden',
                  ai_suggestion: overrideDecision,
                  ai_reason: `Override: ${overrideReason}`,
                  due_date: overrideDate,
                }
              : p
          )
        );
        setOverrideTarget(null);
        showToast(`Override saved for ${overrideTarget.task}`, 'success');
      } else {
        showToast(data.error || 'Failed to save override', 'alert');
      }
    } catch {
      showToast('Network error while saving override', 'alert');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const safeDeferralsCount = pmPlans.filter(
    (p) => (decisionsMap.get(p.id)?.decision || p.ai_suggestion) === 'defer' && p.status !== 'accepted'
  ).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-chip text-xs font-semibold bg-agent/10 text-agent">
              Maintenance Planner
            </span>
            <span className="text-xs text-ink-muted">·</span>
            <span className="text-xs font-medium text-ink-muted">
              {plant?.name || 'Pune Plant'} ({plant?.id || 'P-07'})
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight mt-1">
            Maintenance planning & PM optimiser
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Shift from calendar PM to condition-based and risk-based maintenance.
          </p>
        </div>

        <button
          onClick={handleRunOptimiser}
          disabled={isRunningOptimiser}
          className="px-4 py-2.5 rounded-btn bg-ink text-canvas text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-agent" />
          <span>{isRunningOptimiser ? 'Running PM Optimiser...' : 'Run PM Optimiser'}</span>
        </button>
      </div>

      {/* 2. Summary Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-card p-5 border border-line/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium">Visits avoided</span>
            <span className="px-2 py-0.5 rounded-chip text-[11px] font-semibold bg-ok/10 text-ok">
              Safe deferrals
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-light text-ink tabular-nums">
              {summaryMetrics.visits_avoided}
            </span>
            <span className="text-xs text-ink-muted">calendar visits</span>
          </div>
          <p className="text-[11px] text-ink-muted pt-1">
            Based on 14-day steady vibration and zero open faults.
          </p>
        </div>

        <div className="bg-surface rounded-card p-5 border border-line/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium">Technician hours saved</span>
            <span className="px-2 py-0.5 rounded-chip text-[11px] font-semibold bg-agent/10 text-agent">
              Labor efficiency
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-light text-ink tabular-nums">
              {summaryMetrics.technician_hours_saved}
            </span>
            <span className="text-xs text-ink-muted">hours freed</span>
          </div>
          <p className="text-[11px] text-ink-muted pt-1">
            Equivalent to ${((summaryMetrics.technician_hours_saved * 45)).toFixed(0)} saved in routine checks.
          </p>
        </div>

        <div className="bg-surface rounded-card p-5 border border-line/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium">Tasks pulled forward</span>
            <span className="px-2 py-0.5 rounded-chip text-[11px] font-semibold bg-warning/10 text-warning">
              Early intervention
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-light text-warning tabular-nums">
              {summaryMetrics.pull_forward}
            </span>
            <span className="text-xs text-ink-muted">at-risk assets</span>
          </div>
          <p className="text-[11px] text-ink-muted pt-1">
            Interventions advanced to prevent impending breakdowns.
          </p>
        </div>
      </div>

      {/* 3. Strategy Mix and 3x3 Risk Matrix (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Strategy Mix (5 Cols) */}
        <div className="lg:col-span-5 bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-ink-muted" /> Plant strategy mix
            </h2>
            <span className="text-xs text-ink-muted">
              {strategyMix.total} machines total
            </span>
          </div>

          <p className="text-xs text-ink-muted leading-relaxed">
            Target is to migrate breakdown (BM) and calendar maintenance (PM) into predictive condition-based (CBM) and risk-based (RBM) modes.
          </p>

          {/* Strategy Distribution Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-surface-2 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${strategyMix.percentages.CBM}%` }}
                className="bg-ok h-full"
                title={`CBM: ${strategyMix.percentages.CBM}%`}
              />
              <div
                style={{ width: `${strategyMix.percentages.RBM}%` }}
                className="bg-agent h-full"
                title={`RBM: ${strategyMix.percentages.RBM}%`}
              />
              <div
                style={{ width: `${strategyMix.percentages.PM}%` }}
                className="bg-warning h-full"
                title={`PM: ${strategyMix.percentages.PM}%`}
              />
              <div
                style={{ width: `${strategyMix.percentages.BM}%` }}
                className="bg-danger h-full"
                title={`BM: ${strategyMix.percentages.BM}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-muted pt-0.5">
              <span>Predictive (CBM + RBM): {strategyMix.percentages.CBM + strategyMix.percentages.RBM}%</span>
              <span>Reactive/Calendar: {strategyMix.percentages.PM + strategyMix.percentages.BM}%</span>
            </div>
          </div>

          {/* Strategy Counts Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-btn bg-surface-2/40 border border-line/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink">CBM</span>
                <span className="px-1.5 py-0.2 rounded-chip text-[10px] bg-ok/10 text-ok font-semibold">
                  {strategyMix.percentages.CBM}%
                </span>
              </div>
              <p className="text-xs text-ink-muted">Condition-based</p>
              <span className="text-xl font-light text-ink tabular-nums block">
                {strategyMix.counts.CBM}
              </span>
            </div>

            <div className="p-3 rounded-btn bg-surface-2/40 border border-line/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink">RBM</span>
                <span className="px-1.5 py-0.2 rounded-chip text-[10px] bg-agent/10 text-agent font-semibold">
                  {strategyMix.percentages.RBM}%
                </span>
              </div>
              <p className="text-xs text-ink-muted">Risk-based</p>
              <span className="text-xl font-light text-ink tabular-nums block">
                {strategyMix.counts.RBM}
              </span>
            </div>

            <div className="p-3 rounded-btn bg-surface-2/40 border border-line/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink">PM</span>
                <span className="px-1.5 py-0.2 rounded-chip text-[10px] bg-warning/10 text-warning font-semibold">
                  {strategyMix.percentages.PM}%
                </span>
              </div>
              <p className="text-xs text-ink-muted">Planned calendar</p>
              <span className="text-xl font-light text-ink tabular-nums block">
                {strategyMix.counts.PM}
              </span>
            </div>

            <div className="p-3 rounded-btn bg-surface-2/40 border border-line/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink">BM</span>
                <span className="px-1.5 py-0.2 rounded-chip text-[10px] bg-danger/10 text-danger font-semibold">
                  {strategyMix.percentages.BM}%
                </span>
              </div>
              <p className="text-xs text-ink-muted">Breakdown run</p>
              <span className="text-xl font-light text-ink tabular-nums block">
                {strategyMix.counts.BM}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 3x3 Risk Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Shield className="w-4 h-4 text-ink-muted" /> Risk matrix (criticality × probability)
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Plotted across assets in {plant?.id || 'P-07'}. Click any machine to open history card.
              </p>
            </div>
          </div>

          {/* 3x3 Grid Matrix */}
          <div className="overflow-x-auto pt-1">
            <div className="min-w-[480px]">
              {/* Matrix Column Headers */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs pb-2 text-ink-muted font-medium border-b border-line/20">
                <div className="text-left pl-2">Criticality \ Prob</div>
                <div className="text-ok font-semibold">Low</div>
                <div className="text-warning font-semibold">Medium</div>
                <div className="text-danger font-semibold">High</div>
              </div>

              {/* Rows: Criticality A, B, C */}
              {(['A', 'B', 'C'] as const).map((crit) => (
                <div key={crit} className="grid grid-cols-4 gap-2 py-2 border-b border-line/20 items-stretch">
                  <div className="flex items-center pl-2 text-xs font-semibold text-ink">
                    <span>Criticality {crit}</span>
                  </div>

                  {(['low', 'medium', 'high'] as const).map((prob) => {
                    const cellMachines = riskMatrix[crit][prob];
                    const isHighRiskCell = (crit === 'A' && prob === 'high') || (crit === 'A' && prob === 'medium') || (crit === 'B' && prob === 'high');

                    return (
                      <div
                        key={prob}
                        className={`p-2 rounded-btn min-h-[64px] flex flex-wrap gap-1 content-start transition-colors ${
                          isHighRiskCell
                            ? 'bg-danger/5 border border-danger/20'
                            : prob === 'high' || (crit === 'B' && prob === 'medium')
                            ? 'bg-warning/5 border border-warning/20'
                            : 'bg-surface-2/40 border border-line/20'
                        }`}
                      >
                        {cellMachines.length === 0 ? (
                          <span className="text-[10px] text-ink-muted/50 self-center mx-auto">—</span>
                        ) : (
                          cellMachines.map((m) => (
                            <Link
                              key={m.id}
                              href={`/machines/${m.id}`}
                              className={`px-1.5 py-0.5 rounded-chip text-[10px] font-mono font-medium transition-transform hover:scale-105 ${
                                isHighRiskCell
                                  ? 'bg-danger/10 text-danger border border-danger/30'
                                  : prob === 'high'
                                  ? 'bg-warning/10 text-warning border border-warning/30'
                                  : 'bg-surface text-ink border border-line/40'
                              }`}
                              title={`${m.name} (${m.id})`}
                            >
                              {m.id}
                            </Link>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. PM Plan Table with AI Suggestions */}
      <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-muted" /> Upcoming PM tasks & AI recommendations
            </h2>
            <p className="text-xs text-ink-muted">
              Review AI keep, defer, and pull forward proposals.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter buttons */}
            <div className="flex rounded-btn bg-surface-2 p-0.5 border border-line/30 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'defer', label: 'Deferrals' },
                  { id: 'pull_forward', label: 'Pull forward' },
                  { id: 'keep', label: 'Keep' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-1 rounded-btn font-medium transition-colors ${
                    filterType === tab.id ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bulk Accept Deferrals Button */}
            {safeDeferralsCount > 0 && (
              <button
                onClick={handleBulkAcceptDeferrals}
                className="px-3 py-1.5 rounded-btn bg-[#05603A] hover:bg-[#044E2E] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept all safe deferrals ({safeDeferralsCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-ink-muted border-b border-line/30">
              <tr>
                <th className="pb-2 font-medium">Task & machine</th>
                <th className="pb-2 font-medium">Current due</th>
                <th className="pb-2 font-medium">Interval</th>
                <th className="pb-2 font-medium">AI recommendation</th>
                <th className="pb-2 font-medium">New due date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/20">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-ink-muted">
                    No PM tasks matching this filter.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => {
                  const machine = machineMap.get(plan.machine_id);
                  const aiDec = decisionsMap.get(plan.id);
                  const decision = aiDec?.decision || plan.ai_suggestion;
                  const newDueDate = aiDec?.new_due_date || plan.due_date;
                  const rawReason = aiDec?.reason || plan.ai_reason || '';
                  const reason = rawReason.replace(
                    /Statutory calendar schedule maintained\.?/g,
                    'No sensor data; keep the scheduled visit.'
                  );
                  const isAccepted = plan.status === 'accepted';
                  const isOverridden = plan.status === 'overridden';

                  return (
                    <tr key={plan.id} className="hover:bg-surface-2/30 transition-colors">
                      {/* Task & machine */}
                      <td className="py-3 pr-3">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-ink block">{plan.task}</span>
                          <div className="flex items-center gap-1 text-[11px] text-ink-muted">
                            <span className="font-mono text-ink-muted">{plan.id}</span>
                            <span>·</span>
                            <Link
                              href={`/machines/${plan.machine_id}`}
                              className="text-ink hover:underline font-medium font-mono"
                            >
                              {plan.machine_id}
                            </Link>
                            {machine && <span>({machine.name})</span>}
                          </div>
                        </div>
                      </td>

                      {/* Current Due Date */}
                      <td className="py-3 font-mono text-ink tabular-nums pr-2">
                        {plan.due_date}
                      </td>

                      {/* Interval */}
                      <td className="py-3 text-ink-muted tabular-nums pr-2">
                        {plan.interval_days} d
                      </td>

                      {/* AI Suggestion + Reason */}
                      <td className="py-3 pr-4 max-w-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-chip text-[10px] font-semibold ${
                                decision === 'defer'
                                  ? 'bg-ok/10 text-ok'
                                  : decision === 'pull_forward'
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-surface-2 text-ink-muted'
                              }`}
                            >
                              {decision === 'pull_forward' ? 'Pull forward' : decision === 'defer' ? 'Defer' : 'Keep'}
                            </span>
                            {aiDec?.risk_if_wrong && (
                              <span className="text-[10px] text-ink-muted capitalize">
                                Risk if wrong: {aiDec.risk_if_wrong}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted leading-relaxed">
                            {reason}
                          </p>
                          {aiDec?.evidence_ids && aiDec.evidence_ids.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-ink-muted pt-0.5">
                              <span>Evidence:</span>
                              {aiDec.evidence_ids.map((id) => (
                                <span key={id} className="font-mono font-medium text-ink">
                                  {id}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* New Due Date */}
                      <td className="py-3 pr-3 font-mono tabular-nums">
                        {newDueDate !== plan.due_date ? (
                          <div className="flex items-center gap-1 text-ink font-semibold">
                            <span className="text-ink-muted line-through text-[11px]">
                              {plan.due_date}
                            </span>
                            <ArrowRight className="w-3 h-3 text-ink-muted shrink-0" />
                            <span
                              className={
                                decision === 'pull_forward'
                                  ? 'text-warning'
                                  : decision === 'defer'
                                  ? 'text-ok'
                                  : 'text-ink'
                              }
                            >
                              {newDueDate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-ink-muted">{plan.due_date}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 pr-2">
                        <span
                          className={`px-2 py-0.5 rounded-chip text-[11px] font-medium capitalize ${
                            isAccepted
                              ? 'bg-ok/10 text-ok'
                              : isOverridden
                              ? 'bg-agent/10 text-agent'
                              : 'bg-surface-2 text-ink-muted'
                          }`}
                        >
                          {plan.status || 'Open'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                        {!isAccepted ? (
                          <>
                            <button
                              onClick={() => handleAccept(plan)}
                              className="px-2.5 py-1 rounded-btn bg-surface-2 hover:bg-surface-2/80 text-ink text-xs font-semibold transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleOpenOverride(plan)}
                              className="px-2.5 py-1 rounded-btn border border-line/40 hover:bg-surface-2 text-ink-muted hover:text-ink text-xs font-medium transition-colors"
                            >
                              Override
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenOverride(plan)}
                            className="px-2.5 py-1 rounded-btn border border-line/30 text-ink-muted hover:text-ink text-xs font-medium transition-colors"
                          >
                            Modify
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Dialog Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-card p-6 border border-line/40 max-w-md w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-semibold text-ink">Override AI PM proposal</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                {overrideTarget.task} on {overrideTarget.machine_id} (Current: {overrideTarget.due_date})
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink-muted block">
                  Planner decision
                </label>
                <select
                  value={overrideDecision}
                  onChange={(e) =>
                    setOverrideDecision(e.target.value as 'keep' | 'defer' | 'pull_forward')
                  }
                  className="w-full bg-surface-2/60 border border-line/30 rounded-btn p-2 text-xs text-ink focus:outline-hidden"
                >
                  <option value="keep">Keep scheduled date</option>
                  <option value="defer">Defer visit</option>
                  <option value="pull_forward">Pull forward visit</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink-muted block">
                  New due date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full bg-surface-2/60 border border-line/30 rounded-btn p-2 text-xs text-ink focus:outline-hidden font-mono"
                />
                {(overrideDecision === 'keep' || overrideDecision === 'pull_forward') && (
                  <span className="text-[10px] text-ink-muted block">
                    Safety guardrail: {overrideDecision} may not be later than original due date ({overrideTarget.due_date}).
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink-muted block">
                  Operational reason for override
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Production line shutdown scheduled; warranty compliance requires scheduled inspection."
                  rows={3}
                  className="w-full bg-surface-2/60 border border-line/30 rounded-btn p-2.5 text-xs text-ink placeholder:text-ink-muted focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideTarget(null)}
                className="px-3.5 py-2 rounded-btn text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitOverride}
                disabled={isSubmittingOverride || !overrideReason.trim()}
                className="px-4 py-2 rounded-btn bg-ink text-canvas text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isSubmittingOverride ? 'Saving override...' : 'Confirm override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
