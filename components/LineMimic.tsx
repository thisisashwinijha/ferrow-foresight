'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  List,
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  ChevronRight,
  WifiOff,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Line, Machine, Alert, WorkOrder } from '@/lib/types';
import { MachineTile } from './MachineTile';
import { usePlantContext } from './PlantContext';
import { getDerivedMachineTileState, formatFailureMode } from '@/lib/lifecycle';

interface LineMimicProps {
  lines: Line[];
  machines: Machine[];
  alerts: Alert[];
  workOrders?: WorkOrder[];
}

type FilterType = 'all' | 'sensors' | 'legacy' | 'attention';
type ViewMode = 'grid' | 'table';

export function LineMimic({ lines, machines, alerts, workOrders = [] }: LineMimicProps) {
  const router = useRouter();
  const { plantId, lineId } = usePlantContext();
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const v = new URLSearchParams(window.location.search).get('view');
      if (v === 'table' || v === 'grid') {
        setViewMode(v);
      }
    }
  }, []);

  // Map active alerts by machine_id (most urgent first)
  const alertMap = React.useMemo(() => {
    const map: Record<string, Alert> = {};
    alerts.forEach((alert) => {
      if (alert.status === 'pending' || alert.status === 'needs_review') {
        const existing = map[alert.machine_id];
        if (!existing) {
          map[alert.machine_id] = alert;
        } else if (alert.urgency === 'P1' && existing.urgency !== 'P1') {
          map[alert.machine_id] = alert;
        }
      }
    });
    return map;
  }, [alerts]);

  // Overall counts for filter bar
  const counts = React.useMemo(() => {
    let sensors = 0;
    let legacy = 0;
    let attention = 0;

    machines.forEach((m) => {
      if (m.has_sensors) sensors++;
      else legacy++;

      const derived = getDerivedMachineTileState(m, alerts, workOrders);
      const isOffline = m.status === 'offline' || m.id === 'P07-M18';
      if (derived.isAbnormal || isOffline) {
        attention++;
      }
    });

    return { total: machines.length, sensors, legacy, attention };
  }, [machines, alerts, workOrders]);

  return (
    <div className="space-y-4">
      {/* Topology Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-line/10">
        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-ink-muted mr-1">
            Display:
          </span>
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-btn text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-surface-2 text-ink font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-surface-2/40'
            }`}
          >
            All assets ({counts.total})
          </button>
          <button
            onClick={() => setFilter('sensors')}
            className={`px-2.5 py-1 rounded-btn text-xs font-medium transition-all ${
              filter === 'sensors'
                ? 'bg-surface-2 text-ink font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-surface-2/40'
            }`}
          >
            IoT continuous ({counts.sensors})
          </button>
          <button
            onClick={() => setFilter('legacy')}
            className={`px-2.5 py-1 rounded-btn text-xs font-medium transition-all ${
              filter === 'legacy'
                ? 'bg-surface-2 text-ink font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-surface-2/40'
            }`}
          >
            Legacy manual ({counts.legacy})
          </button>
          {counts.attention > 0 && (
            <button
              onClick={() => setFilter('attention')}
              className={`px-2.5 py-1 rounded-btn text-xs font-medium transition-all flex items-center gap-1 ${
                filter === 'attention'
                  ? 'bg-critical/15 text-critical font-semibold'
                  : 'text-critical/90 hover:bg-critical/10'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-critical animate-pulse" />
              <span>Attention ({counts.attention})</span>
            </button>
          )}
        </div>

        {/* View mode toggle (Grid vs Table) */}
        <div className="flex items-center gap-1 bg-surface-2/50 p-0.5 rounded-btn self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            title="Line Mimic Grid"
            className={`p-1.5 rounded-btn text-xs transition-all ${
              viewMode === 'grid'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="High-Density Table"
            className={`p-1.5 rounded-btn text-xs transition-all ${
              viewMode === 'table'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lines Loop */}
      <div className="space-y-7">
        {lines.map((line) => {
          let lineMachines = machines
            .filter((m) => m.line_id === line.id)
            .sort((a, b) => a.id.localeCompare(b.id));

          const lineSensorCount = lineMachines.filter((m) => m.has_sensors).length;
          const lineLegacyCount = lineMachines.filter((m) => !m.has_sensors).length;

          // Find active line issues using derived lifecycle states
          const activeLineItems = lineMachines
            .map((m, idx) => ({
              machine: m,
              alert: alertMap[m.id],
              derived: getDerivedMachineTileState(m, alerts, workOrders),
              stepIndex: idx + 1,
            }))
            .filter((item) => item.derived.isAbnormal || item.machine.status === 'offline');

          const primaryIssue = activeLineItems[0];

          // Apply active filter
          if (filter === 'sensors') {
            lineMachines = lineMachines.filter((m) => m.has_sensors);
          } else if (filter === 'legacy') {
            lineMachines = lineMachines.filter((m) => !m.has_sensors);
          } else if (filter === 'attention') {
            lineMachines = lineMachines.filter((m) => {
              const derived = getDerivedMachineTileState(m, alerts, workOrders);
              const isOffline = m.status === 'offline' || m.id === 'P07-M18';
              return derived.isAbnormal || isOffline;
            });
          }

          if (lineMachines.length === 0) return null;

          return (
            <div key={line.id} className="space-y-2.5">
              {/* 1. Line Title & Overview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2 font-medium text-ink">
                  <span className="font-mono text-ink-muted">{line.id}</span>
                  <span className="text-ink-muted">·</span>
                  <span className="font-semibold">{line.name}</span>
                  <span className="text-ink-muted font-normal hidden md:inline">
                    ({line.product})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <span>{lineMachines.length} stations</span>
                  <span>·</span>
                  <span className="text-emerald-500 font-medium">
                    {lineSensorCount} IoT
                  </span>
                  <span>·</span>
                  <span>{lineLegacyCount} manual</span>
                </div>
              </div>

              {/* 2. Plain-English Line Flow Status Banner */}
              {filter === 'all' && (
                primaryIssue ? (
                  <div className={`flex items-center justify-between px-3 py-1.5 rounded-btn text-xs ${
                    primaryIssue.derived.urgency === 'P1'
                      ? 'bg-critical/10 text-critical border border-critical/20'
                      : primaryIssue.derived.urgency === 'P2'
                      ? 'bg-high/10 text-high border border-high/20'
                      : primaryIssue.derived.state === 'in_progress'
                      ? 'bg-surface-2 text-ink border border-line/40'
                      : 'bg-surface-2/50 text-ink-muted border border-line/20'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                      <span className="font-semibold shrink-0">
                        Station {String(primaryIssue.stepIndex).padStart(2, '0')} ({primaryIssue.machine.name}):
                      </span>
                      <span className="truncate capitalize">
                        {primaryIssue.derived.state === 'alert'
                          ? formatFailureMode(primaryIssue.alert?.failure_mode) || primaryIssue.derived.detailLabel
                          : primaryIssue.derived.state === 'in_progress'
                          ? `Maintenance in progress (${primaryIssue.derived.detailLabel})`
                          : primaryIssue.machine.status === 'offline'
                          ? 'Sensor communication dropout'
                          : primaryIssue.derived.detailLabel}
                      </span>
                    </div>
                    {primaryIssue.alert && (
                      <button
                        onClick={() => router.push(`/alerts/${primaryIssue.alert?.id}`)}
                        className="text-[11px] font-semibold hover:underline shrink-0 ml-2"
                      >
                        Inspect alert →
                      </button>
                    )}
                    {primaryIssue.derived.workOrderId && !primaryIssue.alert && (
                      <button
                        onClick={() => router.push(`/work-orders/${primaryIssue.derived.workOrderId}`)}
                        className="text-[11px] font-semibold hover:underline shrink-0 ml-2"
                      >
                        View work order →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-btn bg-surface-2/20 text-ink-muted text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-ok/80" />
                    <span>Continuous process flow optimal · {lineMachines.length}/{lineMachines.length} stations healthy</span>
                  </div>
                )
              )}

              {/* 3. VIEW MODE: UNIFORM PROCESS FLOW GRID */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {lineMachines.map((m, idx) => (
                    <MachineTile
                      key={m.id}
                      machine={m}
                      activeAlert={alertMap[m.id]}
                      alerts={alerts}
                      workOrders={workOrders}
                      sequenceIndex={idx + 1}
                    />
                  ))}
                </div>
              ) : (
                /* VIEW MODE: HIGH-DENSITY TABLE */
                <div className="rounded-card border border-line/20 overflow-hidden bg-surface/30">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line/15 bg-surface-2/30 text-[11px] text-ink-muted font-medium">
                        <th className="py-2 px-3 w-12">#</th>
                        <th className="py-2 px-3">Station Asset</th>
                        <th className="py-2 px-3">Telemetry</th>
                        <th className="py-2 px-3">Strategy</th>
                        <th className="py-2 px-3">Health</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/10 font-normal">
                      {lineMachines.map((m, idx) => {
                        const derived = getDerivedMachineTileState(m, alerts, workOrders);
                        const isOffline = m.id === 'P07-M18' || m.status === 'offline';

                        return (
                          <tr
                            key={m.id}
                            onClick={() =>
                              router.push(
                                `/machines/${m.id}?plant=${plantId}&line=${lineId}`
                              )
                            }
                            className="hover:bg-surface-2/50 transition-colors cursor-pointer group"
                          >
                            <td className="py-2.5 px-3 font-mono text-[11px] text-ink-muted/70">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-ink-muted text-xs">
                                  {m.id}
                                </span>
                                <span className="text-ink font-medium truncate max-w-[170px]">
                                  {m.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {m.has_sensors ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>{m.vibration_baseline || 1.8} mm/s</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted/70">
                                  <ClipboardCheck className="w-3 h-3" />
                                  <span>Manual PM</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-ink-muted text-[11px]">
                              {m.strategy} · {m.pm_interval_days}d cycle
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-ink">
                              {m.health_score}%
                            </td>
                            <td className="py-2.5 px-3">
                              {isOffline ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                                  <WifiOff className="w-3 h-3" />
                                  <span>Offline</span>
                                </span>
                              ) : derived.state === 'alert' ? (
                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                  derived.urgency === 'P1' ? 'text-critical' : 'text-high'
                                }`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{derived.urgency} alert</span>
                                </span>
                              ) : derived.state === 'in_progress' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink">
                                  <Wrench className="w-3 h-3" />
                                  <span>{derived.badgeLabel}</span>
                                </span>
                              ) : derived.state === 'scheduled' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                                  <Calendar className="w-3 h-3" />
                                  <span>Scheduled</span>
                                </span>
                              ) : (
                                <span className="text-ink-muted text-[11px]">
                                  Flowing normal
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <ChevronRight className="w-3.5 h-3.5 text-ink-muted/30 group-hover:text-ink transition-colors ml-auto" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
