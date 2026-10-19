'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  KpiSnapshot,
  Plant,
  Alert,
} from '@/lib/types';
import { usePlantContext } from './PlantContext';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Target,
  Activity,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  Building2,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface KpisDashboardViewProps {
  initialSnapshots: KpiSnapshot[];
  allSnapshots: KpiSnapshot[];
  plants: Plant[];
  alerts: Alert[];
  allAlerts: Alert[];
}

interface MetricConfig {
  key: keyof KpiSnapshot;
  title: string;
  unit: string;
  formatter: (v: number) => string;
  higherIsBetter: boolean;
  description: string;
  color: string;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'mtbf_hours',
    title: 'MTBF',
    unit: 'hours',
    formatter: (v) => `${v.toFixed(1)} h`,
    higherIsBetter: true,
    description: 'Mean operating time between critical equipment failures',
    color: '#6366f1', // Indigo
  },
  {
    key: 'mttr_hours',
    title: 'MTTR',
    unit: 'hours',
    formatter: (v) => `${v.toFixed(2)} h`,
    higherIsBetter: false,
    description: 'Average time required to diagnose, repair and restore',
    color: '#3b82f6', // Blue
  },
  {
    key: 'availability_pct',
    title: 'Availability',
    unit: '%',
    formatter: (v) => `${v.toFixed(2)}%`,
    higherIsBetter: true,
    description: 'Operating time divided by scheduled production hours',
    color: '#10b981', // Emerald
  },
  {
    key: 'planned_maintenance_pct',
    title: 'Planned maintenance %',
    unit: '%',
    formatter: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    description: 'Ratio of planned PM/CBM work to total maintenance hours',
    color: '#8b5cf6', // Purple
  },
  {
    key: 'pm_compliance_pct',
    title: 'PM compliance',
    unit: '%',
    formatter: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
    description: 'Scheduled preventive routines executed within window',
    color: '#06b6d4', // Cyan
  },
  {
    key: 'wasted_pm_pct',
    title: 'Wasted PM %',
    unit: '%',
    formatter: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    description: 'PM routines where components had zero wear or defects',
    color: '#f59e0b', // Amber
  },
  {
    key: 'breakdown_hours',
    title: 'Breakdown hours',
    unit: 'hours',
    formatter: (v) => `${v.toFixed(1)} h`,
    higherIsBetter: false,
    description: 'Unplanned downtime hours caused by equipment stops',
    color: '#ef4444', // Red
  },
  {
    key: 'downtime_cost_usd',
    title: 'Downtime cost',
    unit: 'USD',
    formatter: (v) => `$${(v / 1000).toFixed(1)}k`,
    higherIsBetter: false,
    description: 'Direct lost production revenue and intervention expenditure',
    color: '#f97316', // Orange
  },
  {
    key: 'spares_stockouts',
    title: 'Stockouts',
    unit: 'events',
    formatter: (v) => `${v}`,
    higherIsBetter: false,
    description: 'Incidents where required spare was unavailable in stores',
    color: '#ec4899', // Pink
  },
  {
    key: 'backlog_weeks',
    title: 'Backlog',
    unit: 'weeks',
    formatter: (v) => `${v.toFixed(1)} w`,
    higherIsBetter: false,
    description: 'Estimated technician workload queue in person-weeks',
    color: '#14b8a6', // Teal
  },
];

export function KpisDashboardView({
  initialSnapshots,
  allSnapshots,
  plants,
  alerts,
  allAlerts,
}: KpisDashboardViewProps) {
  const { plantId, setPlantId } = usePlantContext();

  // Filter snapshots for active plant
  const activePlantSnapshots = useMemo(() => {
    return allSnapshots
      .filter((s) => s.plant_id === plantId)
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [allSnapshots, plantId]);

  const activePlant = useMemo(() => {
    return plants.find((p) => p.id === plantId) || plants[0];
  }, [plants, plantId]);

  // Compute false alarm rate for active plant
  const activePlantAlerts = useMemo(() => {
    return alerts.filter((a) => a.plant_id === plantId);
  }, [alerts, plantId]);

  const falseAlarmStats = useMemo(() => {
    const total = activePlantAlerts.length;
    const suppressed = activePlantAlerts.filter((a) => a.status === 'suppressed').length;
    const rejected = activePlantAlerts.filter((a) => a.status === 'rejected').length;
    const approved = activePlantAlerts.filter((a) => a.status === 'approved').length;
    const pending = activePlantAlerts.filter((a) => a.status === 'pending' || a.status === 'needs_review').length;

    const falseAlarms = suppressed + rejected;
    const ratePct = total > 0 ? (falseAlarms / total) * 100 : 0;
    const precisionPct = total > 0 ? ((total - falseAlarms) / total) * 100 : 100;

    return {
      total,
      suppressed,
      rejected,
      approved,
      pending,
      falseAlarms,
      ratePct: Number(ratePct.toFixed(1)),
      precisionPct: Number(precisionPct.toFixed(1)),
    };
  }, [activePlantAlerts]);

  // Format month label: "2026-04" -> "Apr"
  const formatMonthLabel = (m: string) => {
    const parts = m.split('-');
    if (parts.length < 2) return m;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = parseInt(parts[1], 10) - 1;
    return months[idx] || m;
  };

  // Cross-plant comparison calculation
  const plantComparisons = useMemo(() => {
    return plants.map((p) => {
      const pSnapshots = allSnapshots
        .filter((s) => s.plant_id === p.id)
        .sort((a, b) => a.month.localeCompare(b.month));
      const latest = pSnapshots[pSnapshots.length - 1];

      const pAlerts = allAlerts.filter((a) => a.plant_id === p.id);
      const suppressed = pAlerts.filter((a) => a.status === 'suppressed').length;
      const rejected = pAlerts.filter((a) => a.status === 'rejected').length;
      const falseRate = pAlerts.length > 0 ? ((suppressed + rejected) / pAlerts.length) * 100 : 0;

      return {
        plant: p,
        latest,
        alertsCount: pAlerts.length,
        falseAlarmRate: Number(falseRate.toFixed(1)),
        precision: Number((100 - falseRate).toFixed(1)),
      };
    });
  }, [plants, allSnapshots, allAlerts]);

  // Baseline vs Target figures (baseline = Apr to Sep 2026 average, target computed from that baseline with matching basis)
  const pilotBaselineVsTargets = useMemo(() => {
    const aprSepSnapshots = activePlantSnapshots.filter(
      (s) => s.month >= '2026-04' && s.month <= '2026-09'
    );
    const snapList = aprSepSnapshots.length > 0 ? aprSepSnapshots : activePlantSnapshots;
    const count = snapList.length || 1;

    const avgBreakdown = snapList.reduce((acc, s) => acc + s.breakdown_hours, 0) / count;
    const avgWastedPm = snapList.reduce((acc, s) => acc + s.wasted_pm_pct, 0) / count;

    // Targets: -20% to -30% reduction for downtime (-25% midpoint), -30% reduction for wasted PM
    const targetBreakdown = avgBreakdown * 0.75;
    const targetWastedPm = avgWastedPm * 0.70;

    return [
      {
        metric: 'Unplanned downtime',
        baseline: `${avgBreakdown.toFixed(1)} h/mo (Apr–Sep 2026 avg)`,
        target: `< ${targetBreakdown.toFixed(1)} h/mo (-25% reduction)`,
        rationale: 'Early vibration detection pulls repairs into changeovers before sudden stoppage.',
        targetStatus: 'Pilot target benchmark',
      },
      {
        metric: 'Wasted PM visits',
        baseline: `${avgWastedPm.toFixed(1)}% (Apr–Sep 2026 avg)`,
        target: `< ${targetWastedPm.toFixed(1)}% (-30% reduction)`,
        rationale: 'PM Optimiser defers safe tasks and aligns overdue tasks to scheduled line windows.',
        targetStatus: 'Pilot target benchmark',
      },
      {
        metric: 'Alert precision',
        baseline: '≥ 85.0% target basis',
        target: '≥ 85.0% precision (≤ 15.0% false alarms)',
        currentTracking: `${falseAlarmStats.precisionPct}% (Live: ${falseAlarmStats.ratePct}% false alarm rate)`,
        rationale: 'Multi-evidence fusion (sensor telemetry + technician observations + history).',
        targetStatus: 'Pilot target benchmark',
      },
      {
        metric: 'Safety rule compliance',
        baseline: '100% target basis',
        target: '100% compliance (zero violations)',
        currentTracking: '0 violations (All LOTO & certification rules strictly enforced)',
        rationale: 'Deterministic guardrails hard-block uncertified assignments and LOTO bypass.',
        targetStatus: 'Pilot target benchmark',
      },
    ];
  }, [activePlantSnapshots, falseAlarmStats]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            KPI dashboard
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Plant {plantId} • {activePlant.name} ({activePlant.location}) — 6-month historical trends, small multiples analysis, and cross-plant benchmarks.
          </p>
        </div>

        {/* Quick Plant Toggle */}
        <div className="flex items-center gap-1.5 bg-surface border border-line rounded-btn p-1">
          {plants.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlantId(p.id)}
              className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-all ${
                p.id === plantId
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-2'
              }`}
            >
              <span>{p.id}</span>
              <span className={`ml-1 text-[10px] ${p.id === plantId ? 'text-indigo-100' : 'text-ink-muted'}`}>
                {p.status === 'pilot' ? 'Pilot' : 'Shadow'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pilot Targets Panel (Clearly labelled as targets, never as achieved results) */}
      <div className="bg-surface border border-line rounded-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-btn bg-agent-bg text-agent border border-agent-border">
              <Target className="w-5 h-5 text-agent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">
                  Pilot targets & baseline benchmarks
                </h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning border border-warning-border">
                  Target milestones in progress • Not achieved results
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Evaluation criteria established for the 12-week Ferrow Foresight pilot deployment.
              </p>
            </div>
          </div>
          <div className="text-xs text-ink-muted">
            Baseline window: Apr 2026 – Sep 2026
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pilotBaselineVsTargets.map((item, idx) => (
            <div
              key={idx}
              className="bg-surface-2 border border-line rounded-btn p-3.5 space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-ink">{item.metric}</div>
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex justify-between text-ink-muted">
                    <span>Baseline:</span>
                    <span className="font-medium text-ink">{item.baseline}</span>
                  </div>
                  <div className="flex justify-between text-agent font-medium">
                    <span>Target:</span>
                    <span className="text-right">{item.target}</span>
                  </div>
                  {item.currentTracking && (
                    <div className="flex justify-between text-ok font-medium pt-1 border-t border-line text-[11px]">
                      <span>Current tracking:</span>
                      <span className="text-right">{item.currentTracking}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-line text-[11px] text-ink-muted leading-snug">
                {item.rationale}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic False Alarm Rate Callout */}
      <div className="bg-surface border border-line rounded-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-btn bg-ok-bg text-ok border border-ok-border">
            <ShieldCheck className="w-5 h-5 text-ok" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">
                Live alert precision & false alarm tracking
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-surface-2 text-ink border border-line">
                Plant {plantId}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Dynamically calculated from {falseAlarmStats.total} alerts ({falseAlarmStats.suppressed} suppressed, {falseAlarmStats.rejected} rejected by planners).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-ink-muted">False alarm rate</div>
            <div className="text-xl font-bold text-warning">
              {falseAlarmStats.ratePct}%
            </div>
            <div className="text-[10px] text-ink-muted">Target: &lt; 15.0%</div>
          </div>

          <div className="h-8 w-px bg-line" />

          <div className="text-right">
            <div className="text-xs text-ink-muted">Alert precision</div>
            <div className="text-xl font-bold text-ok">
              {falseAlarmStats.precisionPct}%
            </div>
            <div className="text-[10px] text-ok font-medium">Target: &gt;= 85.0%</div>
          </div>
        </div>
      </div>

      {/* 10 Small Multiples: 6-Month Trends */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            6-month trend small multiples (Apr 2026 – Sep 2026)
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Key operational metrics for Plant {plantId} displayed in calm sparkline charts with month-over-month trajectory.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {METRIC_CONFIGS.map((config) => {
            const chartData = activePlantSnapshots.map((snap) => ({
              month: formatMonthLabel(snap.month),
              rawMonth: snap.month,
              value: Number(snap[config.key] as number),
            }));

            const latestVal = chartData[chartData.length - 1]?.value ?? 0;
            const prevVal = chartData[chartData.length - 2]?.value ?? latestVal;
            const delta = latestVal - prevVal;
            const deltaPct = prevVal !== 0 ? (delta / prevVal) * 100 : 0;

            const isFavorable = config.higherIsBetter ? delta >= 0 : delta <= 0;

            return (
              <div
                key={config.key}
                className="bg-surface border border-line rounded-card p-3.5 flex flex-col justify-between space-y-2 hover:border-agent/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span className="font-medium text-ink">{config.title}</span>
                    <span className="text-[10px] text-ink-muted">{config.unit}</span>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <div className="text-xl font-bold text-ink">
                      {config.formatter(latestVal)}
                    </div>
                    <div
                      className={`flex items-center text-[11px] font-medium ${
                        delta === 0
                          ? 'text-ink-muted'
                          : isFavorable
                          ? 'text-ok'
                          : 'text-critical'
                      }`}
                    >
                      {delta === 0 ? (
                        <Minus className="w-3 h-3 mr-0.5" />
                      ) : delta > 0 ? (
                        <TrendingUp className="w-3 h-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-0.5" />
                      )}
                      <span>{Math.abs(deltaPct).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Sparkline Chart */}
                <div className="h-16 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 2, right: 2, left: 2, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id={`grad-${config.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={config.color} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={config.color} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-surface border border-line rounded-btn px-2 py-1 text-[11px] text-ink shadow-md">
                                <span className="font-semibold">{data.month}: </span>
                                <span>{config.formatter(data.value)}</span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={config.color}
                        strokeWidth={1.8}
                        fill={`url(#grad-${config.key})`}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-between text-[10px] text-ink-muted border-t border-line pt-1">
                  <span>{chartData[0]?.month}</span>
                  <span className="text-ink-muted">Sep latest</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-Plant Comparison Section (4 Onboarded Plants) */}
      <div className="bg-surface border border-line rounded-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Cross-plant performance comparison
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Comparison across the 4 onboarded facilities using latest month snapshots (September 2026).
            </p>
          </div>
          <div className="text-xs text-ink-muted">
            Click any plant row to view its individual trend
          </div>
        </div>

        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2 text-ink-muted border-b border-line">
                <th className="py-3 px-3 font-semibold">Plant</th>
                <th className="py-3 px-3 font-semibold">Role</th>
                <th className="py-3 px-3 font-semibold text-right">MTBF</th>
                <th className="py-3 px-3 font-semibold text-right">MTTR</th>
                <th className="py-3 px-3 font-semibold text-right">Availability</th>
                <th className="py-3 px-3 font-semibold text-right">PM %</th>
                <th className="py-3 px-3 font-semibold text-right">Compliance</th>
                <th className="py-3 px-3 font-semibold text-right">Wasted PM</th>
                <th className="py-3 px-3 font-semibold text-right">Downtime cost</th>
                <th className="py-3 px-3 font-semibold text-right">Stockouts</th>
                <th className="py-3 px-3 font-semibold text-right">False alarm rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {plantComparisons.map((row) => {
                const isSelected = row.plant.id === plantId;
                const snap = row.latest;
                return (
                  <tr
                    key={row.plant.id}
                    onClick={() => setPlantId(row.plant.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-agent-bg/30 hover:bg-agent-bg/40'
                        : 'hover:bg-surface-2/40'
                    }`}
                  >
                    <td className="py-3 px-3 font-medium text-ink flex items-center gap-2">
                      <span className="font-mono text-agent font-semibold">
                        {row.plant.id}
                      </span>
                      <span>{row.plant.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-agent" />
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          row.plant.status === 'pilot'
                            ? 'bg-ok-bg text-ok border border-ok-border'
                            : 'bg-agent-bg text-agent border border-agent-border'
                        }`}
                      >
                        {row.plant.status === 'pilot' ? 'Pilot plant' : 'Shadow'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      {snap ? `${snap.mtbf_hours.toFixed(1)} h` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {snap ? `${snap.mttr_hours.toFixed(2)} h` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-ok">
                      {snap ? `${snap.availability_pct.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {snap ? `${snap.planned_maintenance_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {snap ? `${snap.pm_compliance_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-warning font-medium">
                      {snap ? `${snap.wasted_pm_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-ink">
                      {snap ? `$${(snap.downtime_cost_usd / 1000).toFixed(1)}k` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {snap ? snap.spares_stockouts : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium">
                      <span
                        className={
                          row.falseAlarmRate <= 15
                            ? 'text-ok'
                            : 'text-warning'
                        }
                      >
                        {row.falseAlarmRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
