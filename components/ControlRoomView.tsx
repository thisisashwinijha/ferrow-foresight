'use client';

import React, { useMemo } from 'react';
import { usePlantContext } from './PlantContext';
import { getPlantById } from '@/lib/data/plants';
import { getLines } from '@/lib/data/lines';
import { getMachines } from '@/lib/data/machines';
import { getAlerts } from '@/lib/data/alerts';
import { getLatestKpiSnapshot, getPreviousKpiSnapshot } from '@/lib/data/kpis';
import { KpiStrip } from './KpiStrip';
import { LineMimic } from './LineMimic';
import { LiveAlertFeed } from './LiveAlertFeed';
import { ApprovalsQueue } from './ApprovalsQueue';
import { CheckCircle2, Shield, Layers, Filter } from 'lucide-react';

export function ControlRoomView() {
  const { plantId, lineId, setLineId } = usePlantContext();

  const plant = useMemo(() => getPlantById(plantId), [plantId]);
  const lines = useMemo(() => getLines(plantId), [plantId]);
  const machines = useMemo(() => getMachines(plantId, lineId), [plantId, lineId]);
  const alerts = useMemo(() => getAlerts(plantId, lineId), [plantId, lineId]);
  const currentKpi = useMemo(() => getLatestKpiSnapshot(plantId), [plantId]);
  const previousKpi = useMemo(() => getPreviousKpiSnapshot(plantId), [plantId]);

  // Filter lines to display in mimic based on active filter
  const displayedLines = useMemo(() => {
    if (!lineId || lineId === 'all') return lines;
    return lines.filter((l) => l.id === lineId);
  }, [lines, lineId]);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Control Room Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-ink">
              {plant?.name || `Plant ${plantId}`}
            </h1>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-ink border border-line">
              {plantId}
            </span>
            {plant?.status === 'pilot' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-ok/20 text-ok border border-ok/30">
                <CheckCircle2 className="w-3 h-3" />
                Pilot (Live)
              </span>
            )}
            {plant?.status === 'shadow' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-ink/10 text-ink border border-line">
                <Shield className="w-3 h-3 text-ink-muted" />
                Shadow mode
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            {plant?.location || 'Plant location'} · {plant?.lines_count || lines.length} Production Lines · {machines.length} Monitored Assets · Sensor Scope: {plant?.sensor_pct || 0}%
          </p>
        </div>

        {/* Line Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-ink-muted mr-1">
            <Filter className="w-3 h-3" />
            <span>Line:</span>
          </div>

          <button
            onClick={() => setLineId('all')}
            className={`px-2.5 py-1 text-xs rounded-btn transition-colors border ${
              lineId === 'all' || !lineId
                ? 'bg-ink text-surface font-semibold border-ink'
                : 'bg-surface hover:bg-surface-2 text-ink border-line'
            }`}
          >
            All lines ({lines.length})
          </button>

          {lines.map((l) => (
            <button
              key={l.id}
              onClick={() => setLineId(l.id)}
              className={`px-2.5 py-1 text-xs rounded-btn transition-colors border font-mono ${
                lineId === l.id
                  ? 'bg-ink text-surface font-semibold border-ink'
                  : 'bg-surface hover:bg-surface-2 text-ink border-line'
              }`}
            >
              <span>{l.id}</span>
              <span className="hidden sm:inline text-[11px] font-sans ml-1 text-inherit opacity-80">
                ({l.name.replace(/Line \d+ /, '')})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <KpiStrip
        current={currentKpi}
        previous={previousKpi}
        alerts={alerts}
      />

      {/* Main Grid: Line Mimic + Approvals (Left) & Live Alert Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Line Mimic & Approvals Queue */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-ink-muted" />
                <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Line Mimic Overview
                </h2>
              </div>
              <div className="text-[11px] text-ink-muted flex items-center gap-2 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-surface border border-line" />
                  <span>Normal</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-critical" />
                  <span>P1 Alert</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-high" />
                  <span>P2 Alert</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-medium" />
                  <span>P3 Alert</span>
                </span>
              </div>
            </div>

            <LineMimic
              lines={displayedLines}
              machines={machines}
              alerts={alerts}
            />
          </div>

          {/* Approvals Queue Section */}
          <ApprovalsQueue
            alerts={alerts}
            plant={plant}
          />
        </div>

        {/* Right Column: Live Alert Feed */}
        <div className="lg:col-span-4 xl:col-span-4 sticky top-18">
          <LiveAlertFeed
            alerts={alerts}
            plant={plant}
          />
        </div>
      </div>
    </div>
  );
}
