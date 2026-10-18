'use client';

import React, { useState, useMemo } from 'react';
import { usePlantContext } from './PlantContext';
import { getPlantByIdSync } from '@/lib/data/plants';
import { getLinesSync } from '@/lib/data/lines';
import { getMachinesSync } from '@/lib/data/machines';
import { getAlertsSync } from '@/lib/data/alerts';
import { getWorkOrdersSync } from '@/lib/data/workOrders';
import { getLatestKpiSnapshotSync, getPreviousKpiSnapshotSync } from '@/lib/data/kpis';
import { KpiStrip } from './KpiStrip';
import { LineMimic } from './LineMimic';
import { LiveAlertFeed } from './LiveAlertFeed';
import { AttentionSection } from './AttentionSection';
import { AlertDetailSheet } from './AlertDetailSheet';
import { Alert, Machine, Plant, Line, WorkOrder, KpiSnapshot } from '@/lib/types';

interface ControlRoomViewProps {
  initialPlant?: Plant | null;
  initialLines?: Line[];
  initialMachines?: Machine[];
  initialAlerts?: Alert[];
  initialWorkOrders?: WorkOrder[];
  initialCurrentKpi?: KpiSnapshot | null;
  initialPreviousKpi?: KpiSnapshot | null;
}

export function ControlRoomView({
  initialPlant,
  initialLines,
  initialMachines,
  initialAlerts,
  initialWorkOrders,
  initialCurrentKpi,
  initialPreviousKpi,
}: ControlRoomViewProps = {}) {
  const { plantId, lineId, setLineId } = usePlantContext();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const plant = useMemo(() => {
    if (initialPlant && initialPlant.id === plantId) return initialPlant;
    return getPlantByIdSync(plantId);
  }, [plantId, initialPlant]);

  const lines = useMemo(() => {
    if (initialLines && initialLines.length > 0 && (!plantId || plantId === initialPlant?.id)) return initialLines;
    return getLinesSync(plantId);
  }, [plantId, initialLines, initialPlant]);

  const machines = useMemo(() => {
    let list = initialMachines || getMachinesSync(plantId, lineId);
    if (plantId && plantId !== 'all') {
      list = list.filter((m) => m.plant_id === plantId);
    }
    if (lineId && lineId !== 'all') {
      list = list.filter((m) => m.line_id === lineId);
    }
    return list;
  }, [plantId, lineId, initialMachines]);

  const alerts = useMemo(() => {
    let list = initialAlerts || getAlertsSync(plantId, lineId);
    if (plantId && plantId !== 'all') {
      list = list.filter((a) => (a.plant_id || 'P-07') === plantId);
    }
    if (lineId && lineId !== 'all') {
      list = list.filter((a) => {
        const m = machines.find((mach) => mach.id === a.machine_id);
        return m?.line_id === lineId || a.proposed_window?.line_id === lineId;
      });
    }
    return list;
  }, [plantId, lineId, initialAlerts, machines]);

  const workOrders = useMemo(() => {
    let list = initialWorkOrders || getWorkOrdersSync(plantId, lineId);
    if (plantId && plantId !== 'all') {
      list = list.filter((w) => w.plant_id === plantId);
    }
    if (lineId && lineId !== 'all') {
      list = list.filter((w) => {
        const m = machines.find((mach) => mach.id === w.machine_id);
        return m?.line_id === lineId || w.scheduled_window?.line_id === lineId;
      });
    }
    return list;
  }, [plantId, lineId, initialWorkOrders, machines]);

  const currentKpi = useMemo(() => {
    if (initialCurrentKpi && (!plantId || plantId === initialPlant?.id)) return initialCurrentKpi;
    return getLatestKpiSnapshotSync(plantId);
  }, [plantId, initialCurrentKpi, initialPlant]);

  const previousKpi = useMemo(() => {
    if (initialPreviousKpi && (!plantId || plantId === initialPlant?.id)) return initialPreviousKpi;
    return getPreviousKpiSnapshotSync(plantId);
  }, [plantId, initialPreviousKpi, initialPlant]);

  // Filter lines to display in mimic based on active filter
  const displayedLines = useMemo(() => {
    if (!lineId || lineId === 'all') return lines;
    return lines.filter((l) => l.id === lineId);
  }, [lines, lineId]);

  const scopeLabel = plant?.status === 'pilot' ? 'pilot scope' : 'shadow scope';
  const subtitle = `${lines.length} of ${plant?.lines_count || 7} lines in ${scopeLabel} · ${plant?.onboarded_machines || machines.length} monitored assets`;

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] font-semibold tracking-tight text-ink">
              {plant?.name || `Plant ${plantId}`}
            </h1>
            {plant?.status === 'pilot' && (
              <span className="px-2.5 py-0.5 rounded-chip text-xs font-medium bg-ok/10 text-ok">
                Pilot
              </span>
            )}
            {plant?.status === 'shadow' && (
              <span className="px-2.5 py-0.5 rounded-chip text-xs font-medium bg-ink/10 text-ink-muted">
                Shadow mode
              </span>
            )}
          </div>
          <p className="text-[13px] text-ink-muted mt-1">
            {subtitle}
          </p>
        </div>

        {/* Line Filter as Segmented Control */}
        <div className="bg-surface-2/60 p-1 rounded-btn flex items-center gap-1 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setLineId('all')}
            className={`px-3 py-1 rounded-chip text-xs font-medium transition-all ${
              lineId === 'all' || !lineId
                ? 'bg-surface text-ink font-semibold shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            All lines
          </button>
          {lines.map((l) => (
            <button
              key={l.id}
              onClick={() => setLineId(l.id)}
              className={`px-3 py-1 rounded-chip text-xs font-medium transition-all font-mono whitespace-nowrap ${
                lineId === l.id
                  ? 'bg-surface text-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span>{l.id}</span>
              <span className="font-sans ml-1 opacity-70 hidden sm:inline">
                {l.name.replace(/Line \d+ /, '')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Needs Your Attention (Page Focal Point) */}
      <AttentionSection
        alerts={alerts}
        plant={plant}
        onSelectAlert={(a) => setSelectedAlert(a)}
      />

      {/* 3. Hero Metrics Strip (4 Hero Numbers) */}
      <KpiStrip
        current={currentKpi}
        previous={previousKpi}
        alerts={alerts}
      />

      {/* 4. Main Body: Line Mimic (Left) & Compact Recent Activity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Clean Line Mimic */}
        <div className="lg:col-span-8 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink tracking-tight">
              Line mimic & machine topology
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Manufacturing sequence across continuous IoT sensor telemetry and legacy manual inspection assets
            </p>
          </div>

          <LineMimic
            lines={displayedLines}
            machines={machines}
            alerts={alerts}
            workOrders={workOrders}
          />
        </div>

        {/* Right: Compact Recent Activity */}
        <div className="lg:col-span-4 sticky top-20">
          <LiveAlertFeed
            alerts={alerts}
            workOrders={workOrders}
            plant={plant}
            onSelectAlert={(a) => setSelectedAlert(a)}
          />
        </div>
      </div>

      {/* Side Sheet Drawer for Alert Details */}
      <AlertDetailSheet
        alert={selectedAlert}
        plant={plant}
        onClose={() => setSelectedAlert(null)}
      />
    </div>
  );
}
