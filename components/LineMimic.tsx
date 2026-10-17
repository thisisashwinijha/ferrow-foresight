'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  List,
  Activity,
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  ChevronRight,
  WifiOff,
} from 'lucide-react';
import { Line, Machine, Alert } from '@/lib/types';
import { MachineTile } from './MachineTile';
import { usePlantContext } from './PlantContext';

interface LineMimicProps {
  lines: Line[];
  machines: Machine[];
  alerts: Alert[];
}

type FilterType = 'all' | 'sensors' | 'legacy' | 'attention';
type ViewMode = 'grid' | 'table';

export function LineMimic({ lines, machines, alerts }: LineMimicProps) {
  const router = useRouter();
  const { plantId, lineId } = usePlantContext();
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  React.useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'table' || v === 'grid') {
      setViewMode(v);
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

      const isDegrading =
        m.id === 'P07-M03' ||
        m.id === 'P03-M10' ||
        m.id === 'P12-M05' ||
        m.id === 'P21-M09';
      const isAbnormal =
        alertMap[m.id] ||
        isDegrading ||
        m.status === 'maintenance' ||
        m.status === 'offline' ||
        m.id === 'P07-M18';

      if (isAbnormal) attention++;
    });

    return { total: machines.length, sensors, legacy, attention };
  }, [machines, alertMap]);

  return (
    <div className="space-y-6">
      {/* Top Controls: Filter Pills & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line/30">
        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-chip text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-surface text-ink font-semibold shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            All assets ({counts.total})
          </button>

          <button
            onClick={() => setFilter('sensors')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-xs font-medium transition-all ${
              filter === 'sensors'
                ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>IoT Sensors ({counts.sensors})</span>
          </button>

          <button
            onClick={() => setFilter('legacy')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-xs font-medium transition-all ${
              filter === 'legacy'
                ? 'bg-surface-2 text-ink font-semibold'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <ClipboardCheck className="w-3 h-3 text-ink-muted" />
            <span>Legacy manual ({counts.legacy})</span>
          </button>

          {counts.attention > 0 && (
            <button
              onClick={() => setFilter('attention')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-xs font-medium transition-all ${
                filter === 'attention'
                  ? 'bg-critical/15 text-critical font-semibold'
                  : 'text-critical/80 hover:text-critical'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-critical animate-pulse" />
              <span>Needs attention ({counts.attention})</span>
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-surface-2/60 p-0.5 rounded-btn self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            title="Uniform Grid view"
            className={`p-1.5 rounded-chip transition-all ${
              viewMode === 'grid'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="High-density Table view"
            className={`p-1.5 rounded-chip transition-all ${
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
      <div className="space-y-6">
        {lines.map((line) => {
          let lineMachines = machines
            .filter((m) => m.line_id === line.id)
            .sort((a, b) => a.id.localeCompare(b.id));

          const lineSensorCount = lineMachines.filter((m) => m.has_sensors).length;
          const lineLegacyCount = lineMachines.filter((m) => !m.has_sensors).length;

          // Apply active filter
          if (filter === 'sensors') {
            lineMachines = lineMachines.filter((m) => m.has_sensors);
          } else if (filter === 'legacy') {
            lineMachines = lineMachines.filter((m) => !m.has_sensors);
          } else if (filter === 'attention') {
            lineMachines = lineMachines.filter((m) => {
              const isDegrading =
                m.id === 'P07-M03' ||
                m.id === 'P03-M10' ||
                m.id === 'P12-M05' ||
                m.id === 'P21-M09';
              return (
                alertMap[m.id] ||
                isDegrading ||
                m.status === 'maintenance' ||
                m.status === 'offline' ||
                m.id === 'P07-M18'
              );
            });
          }

          if (lineMachines.length === 0) return null;

          return (
            <div key={line.id} className="space-y-3">
              {/* Line Header */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-ink">
                  <span className="font-mono text-ink-muted">{line.id}</span>
                  <span className="text-ink-muted">·</span>
                  <span>{line.name}</span>
                  <span className="text-ink-muted font-normal hidden md:inline">
                    ({line.product})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <span className="font-mono">{lineMachines.length} assets</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-medium">
                    {lineSensorCount} IoT sensors
                  </span>
                  <span>·</span>
                  <span>{lineLegacyCount} legacy</span>
                </div>
              </div>

              {/* VIEW MODE: 1. UNIFORM GRID */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {lineMachines.map((m, idx) => (
                    <MachineTile
                      key={m.id}
                      machine={m}
                      activeAlert={alertMap[m.id]}
                      sequenceIndex={idx + 1}
                    />
                  ))}
                </div>
              ) : (
                /* VIEW MODE: 2. HIGH-DENSITY TABLE */
                <div className="rounded-card border border-line/30 overflow-hidden bg-surface/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line/20 bg-surface-2/40 text-[11px] text-ink-muted font-medium">
                        <th className="py-2 px-3 w-12">#</th>
                        <th className="py-2 px-3">Asset</th>
                        <th className="py-2 px-3">Monitoring</th>
                        <th className="py-2 px-3">Strategy</th>
                        <th className="py-2 px-3">Health</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/10 font-normal">
                      {lineMachines.map((m, idx) => {
                        const alert = alertMap[m.id];
                        const isDegrading =
                          m.id === 'P07-M03' ||
                          m.id === 'P03-M10' ||
                          m.id === 'P12-M05' ||
                          m.id === 'P21-M09';
                        const isOffline =
                          m.id === 'P07-M18' || m.status === 'offline';
                        const isMaintenance = m.status === 'maintenance';
                        const urgency = alert?.urgency || (isDegrading ? 'P1' : null);

                        return (
                          <tr
                            key={m.id}
                            onClick={() =>
                              router.push(
                                `/machines/${m.id}?plant=${plantId}&line=${lineId}`
                              )
                            }
                            className="hover:bg-surface-2/60 transition-colors cursor-pointer group"
                          >
                            <td className="py-2.5 px-3 font-mono text-[11px] text-ink-muted">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-ink">
                                  {m.id}
                                </span>
                                <span className="text-ink truncate max-w-[160px]">
                                  {m.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {m.has_sensors ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>IoT Sensor</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-ink-muted">
                                  <ClipboardCheck className="w-2.5 h-2.5" />
                                  <span>Legacy (Manual)</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-ink-muted text-[11px]">
                              {m.strategy} · {m.pm_interval_days}d cycle
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[11px] text-ink">
                                {m.health_score}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {urgency ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-critical/15 text-critical">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>{urgency} alert</span>
                                </span>
                              ) : isMaintenance ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-medium/15 text-medium">
                                  <Wrench className="w-2.5 h-2.5" />
                                  <span>Maintenance</span>
                                </span>
                              ) : isOffline ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-ink-muted">
                                  <WifiOff className="w-2.5 h-2.5" />
                                  <span>Offline</span>
                                </span>
                              ) : (
                                <span className="text-ink-muted text-[11px]">
                                  Running normal
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <ChevronRight className="w-3.5 h-3.5 text-ink-muted/40 group-hover:text-ink transition-colors ml-auto" />
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

      {/* Bottom Legend */}
      <div className="flex items-center gap-4 text-xs text-ink-muted pt-2 border-t border-line/20 flex-wrap">
        <span className="font-medium text-ink">Legend:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>IoT Sensor (Continuous live telemetry)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClipboardCheck className="w-3 h-3 text-ink-muted" />
          <span>Legacy asset (Shift inspection / manual PM)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-critical" />
          <span>Abnormal / action required</span>
        </span>
      </div>
    </div>
  );
}
