'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  Eye,
  WifiOff,
} from 'lucide-react';
import { Machine, Alert } from '@/lib/types';
import { useMachineTelemetry } from '@/lib/simulator';
import { usePlantContext } from './PlantContext';

interface MachineTileProps {
  machine: Machine;
  activeAlert?: Alert;
  sequenceIndex?: number;
}

export function MachineTile({ machine, activeAlert, sequenceIndex }: MachineTileProps) {
  const router = useRouter();
  const { plantId, lineId } = usePlantContext();

  const telemetry = useMachineTelemetry(
    machine.id,
    machine.vibration_baseline || 1.8,
    machine.temperature_baseline || 50,
    machine.has_sensors
  );

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    router.push(`/machines/${machine.id}?plant=${plantId}&line=${lineId}`);
  };

  const hasUrgentAlert =
    activeAlert &&
    (activeAlert.status === 'pending' || activeAlert.status === 'needs_review') &&
    activeAlert.urgency !== 'none';

  const isDegrading =
    machine.id === 'P07-M03' ||
    machine.id === 'P03-M10' ||
    machine.id === 'P12-M05' ||
    machine.id === 'P21-M09';

  const isOffline = machine.id === 'P07-M18' || machine.status === 'offline';
  const isMaintenance = machine.status === 'maintenance';

  const urgency = activeAlert?.urgency || (isDegrading ? 'P1' : null);
  const isP1 = urgency === 'P1';
  const isP2 = urgency === 'P2';
  const isP3 = urgency === 'P3';

  // Determine container styling based on abnormal status vs calm normal
  let cardStyle =
    'bg-surface hover:bg-surface-2 border-line/40 hover:border-line/70';
  let badgeStyle = '';

  if (isP1) {
    cardStyle =
      'bg-critical/5 border-critical/40 hover:bg-critical/10 hover:border-critical/60';
    badgeStyle = 'bg-critical/15 text-critical border border-critical/30';
  } else if (isP2) {
    cardStyle =
      'bg-high/5 border-high/40 hover:bg-high/10 hover:border-high/60';
    badgeStyle = 'bg-high/15 text-high border border-high/30';
  } else if (isP3) {
    cardStyle =
      'bg-medium/5 border-medium/40 hover:bg-medium/10 hover:border-medium/60';
    badgeStyle = 'bg-medium/15 text-medium border border-medium/30';
  } else if (isMaintenance) {
    cardStyle = 'bg-medium/5 border-medium/30 hover:bg-medium/10';
    badgeStyle = 'bg-medium/15 text-medium border border-medium/30';
  } else if (isOffline) {
    cardStyle = 'bg-surface-2/40 border-dashed border-line/60 opacity-80';
    badgeStyle = 'bg-surface-2 text-ink-muted border border-line/40';
  }

  // Sparkline calculation for sensor machines
  const points = telemetry?.sparkline || [];
  const minVal = Math.min(...points, 0);
  const maxVal = Math.max(...points, 8);
  const range = maxVal - minVal || 1;

  const width = 42;
  const height = 16;
  const pathD =
    points.length > 1
      ? points
          .map((val, idx) => {
            const x = (idx / (points.length - 1)) * width;
            const y = height - ((val - minVal) / range) * (height - 4) - 2;
            return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(' ')
      : '';

  const sparklineColor = isP1
    ? 'text-critical stroke-critical'
    : isP2
    ? 'text-high stroke-high'
    : 'text-emerald-500/80 stroke-emerald-500/80';

  return (
    <div
      onClick={handleClick}
      className={`group relative p-2.5 rounded-card border ${cardStyle} cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:shadow-xs flex flex-col justify-between h-[96px] select-none`}
    >
      {/* 1. Top row: Sequence + Machine ID on left, Badge on right */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {sequenceIndex !== undefined && (
            <span className="font-mono text-[10px] text-ink-muted/60 font-medium">
              {String(sequenceIndex).padStart(2, '0')}
            </span>
          )}
          <span className="font-mono text-xs font-semibold text-ink group-hover:text-ink">
            {machine.id}
          </span>
        </div>

        {/* Status / Sensor Pill */}
        {isOffline ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-ink-muted border border-line/30">
            <WifiOff className="w-2.5 h-2.5" />
            <span>Offline</span>
          </span>
        ) : isMaintenance ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-medium/15 text-medium border border-medium/30">
            <Wrench className="w-2.5 h-2.5 animate-pulse" />
            <span>Maint</span>
          </span>
        ) : urgency ? (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeStyle}`}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>{urgency}</span>
          </span>
        ) : machine.has_sensors ? (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            title="IoT Continuous Telemetry (Vibration & Temperature)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>IoT Sensor</span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-ink-muted border border-line/30"
            title="Legacy Asset without sensors (technician shift manual inspections)"
          >
            <ClipboardCheck className="w-2.5 h-2.5 text-ink-muted/70" />
            <span>Legacy</span>
          </span>
        )}
      </div>

      {/* 2. Middle: Full Machine Name */}
      <div className="my-auto py-0.5">
        <p
          className="text-xs font-medium text-ink truncate leading-tight"
          title={machine.name}
        >
          {machine.name}
        </p>
      </div>

      {/* 3. Bottom Row: Telemetry & Sparkline (Sensor) OR Inspection Cadence (Legacy) */}
      <div className="flex items-center justify-between pt-1.5 border-t border-line/20 text-[11px] leading-none">
        {machine.has_sensors ? (
          isOffline ? (
            <span className="text-[10px] text-ink-muted italic">Sensor dropout</span>
          ) : (
            <>
              <div className="flex items-baseline gap-1 font-mono">
                <span
                  className={`text-xs font-semibold ${
                    isP1 ? 'text-critical' : isP2 ? 'text-high' : 'text-ink'
                  }`}
                >
                  {(mounted ? telemetry.vibration_mm_s : (machine.vibration_baseline || 1.8)).toFixed(2)}
                </span>
                <span className="text-[10px] font-normal text-ink-muted">mm/s</span>
              </div>

              {/* Sparkline */}
              {mounted && pathD && (
                <svg width={width} height={height} className={sparklineColor}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </>
          )
        ) : (
          /* Legacy Machine (no sensors) */
          <>
            <span className="font-mono text-[10px] text-ink-muted">
              {machine.strategy} · {machine.pm_interval_days}d PM
            </span>
            <span className="text-[10px] text-ink-muted/70 flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />
              <span>Shift check</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
