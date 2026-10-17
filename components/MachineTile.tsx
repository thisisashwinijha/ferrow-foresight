'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Hand } from 'lucide-react';
import { Machine, Alert } from '@/lib/types';
import { useMachineTelemetry } from '@/lib/simulator';
import { usePlantContext } from './PlantContext';

interface MachineTileProps {
  machine: Machine;
  activeAlert?: Alert;
}

export function MachineTile({ machine, activeAlert }: MachineTileProps) {
  const router = useRouter();
  const { plantId, lineId } = usePlantContext();

  const telemetry = useMachineTelemetry(
    machine.id,
    machine.vibration_baseline || 1.8,
    machine.temperature_baseline || 50,
    machine.has_sensors
  );

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

  const isAbnormal = hasUrgentAlert || isDegrading || isOffline || isMaintenance;

  // 1. HEALTHY MACHINES: Render as compact neutral chip (ID and short name only)
  if (!isAbnormal) {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-chip bg-surface hover:bg-surface-2 text-ink text-xs transition-colors cursor-pointer select-none group"
      >
        <span className="font-mono text-ink-muted text-[11px] font-medium">{machine.id}</span>
        <span className="truncate max-w-[130px]">{machine.name}</span>
        {!machine.has_sensors && (
          <span title="Manual sensory observation (legacy asset)">
            <Hand className="w-3 h-3 text-ink-muted/50" />
          </span>
        )}
      </button>
    );
  }

  // 2. ABNORMAL MACHINES: Render as larger tiles with status colour, live value, and sparkline
  const urgency = activeAlert?.urgency || (isDegrading ? 'P1' : 'P3');
  const isP1 = urgency === 'P1';
  const isP2 = urgency === 'P2';

  let tintStyle = 'bg-medium/10 text-medium border-medium/30';
  let badgeStyle = 'bg-medium/20 text-medium';

  if (isP1) {
    tintStyle = 'bg-critical/10 text-critical border-critical/30';
    badgeStyle = 'bg-critical/20 text-critical';
  } else if (isP2) {
    tintStyle = 'bg-high/10 text-high border-high/30';
    badgeStyle = 'bg-high/20 text-high';
  } else if (isOffline) {
    tintStyle = 'bg-surface-2 text-ink-muted border-line/40';
    badgeStyle = 'bg-surface text-ink-muted';
  }

  // Generate SVG mini sparkline path from simulator points
  const points = telemetry.sparkline || [];
  const minVal = Math.min(...points, 0);
  const maxVal = Math.max(...points, 8);
  const range = maxVal - minVal || 1;

  const width = 48;
  const height = 18;
  const pathD = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1 || 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 4) - 2;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div
      onClick={handleClick}
      className={`relative w-44 p-2.5 rounded-card border ${tintStyle} cursor-pointer transition-all hover:scale-[1.02] shadow-xs select-none`}
    >
      {/* Top: ID, Name, Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium text-xs">
          <span className="font-mono font-bold text-ink">{machine.id}</span>
          <span className="truncate max-w-[80px] text-ink">{machine.name}</span>
        </div>

        <span className={`px-1.5 py-0.2 rounded-chip text-[10px] font-semibold ${badgeStyle}`}>
          {isOffline ? 'Offline' : isMaintenance ? 'Maint' : urgency}
        </span>
      </div>

      {/* Bottom: Live Telemetry & Micro Sparkline */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-current/15">
        {isOffline ? (
          <span className="text-[11px] text-ink-muted italic">Sensor dropout</span>
        ) : isMaintenance ? (
          <div className="flex items-center gap-1 text-[11px]">
            <Wrench className="w-3 h-3 text-medium animate-pulse" />
            <span className="text-ink">Maintenance</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1 font-mono text-xs font-semibold">
              <span>{telemetry.vibration_mm_s.toFixed(2)}</span>
              <span className="text-[10px] font-normal opacity-70">mm/s</span>
            </div>

            {/* Sparkline */}
            <svg width={width} height={height} className="opacity-90">
              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </>
        )}
      </div>
    </div>
  );
}
