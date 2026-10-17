'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Wrench, AlertCircle, AlertTriangle } from 'lucide-react';
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

  // Status styling per ISA-101: Grey is normal. Colour means attention.
  const isP1 = activeAlert?.urgency === 'P1' && (activeAlert.status === 'pending' || activeAlert.status === 'needs_review');
  const isP2 = activeAlert?.urgency === 'P2' && (activeAlert.status === 'pending' || activeAlert.status === 'needs_review');
  const isP3 = activeAlert?.urgency === 'P3' && (activeAlert.status === 'pending' || activeAlert.status === 'needs_review');
  const isMaintenance = machine.status === 'maintenance';
  const isAbnormal = isP1 || isP2 || isP3;

  let borderClass = 'border-line hover:border-ink-muted';
  let bgClass = 'bg-surface hover:bg-surface-2';
  let pulseClass = '';

  if (isP1) {
    borderClass = 'border-critical shadow-sm';
    bgClass = 'bg-critical/10 hover:bg-critical/15';
    pulseClass = 'animate-pulse-abnormal';
  } else if (isP2) {
    borderClass = 'border-high shadow-sm';
    bgClass = 'bg-high/10 hover:bg-high/15';
  } else if (isP3) {
    borderClass = 'border-medium shadow-sm';
    bgClass = 'bg-medium/10 hover:bg-medium/15';
  }

  // Generate SVG mini sparkline path from simulator points
  const points = telemetry.sparkline || [];
  const minVal = Math.min(...points, 0);
  const maxVal = Math.max(...points, 8);
  const range = maxVal - minVal || 1;

  const width = 48;
  const height = 16;
  const pathD = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1 || 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 3) - 1.5;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div
      onClick={handleClick}
      className={`relative shrink-0 w-36 sm:w-40 p-2 rounded-panel border ${borderClass} ${bgClass} ${pulseClass} cursor-pointer transition-all select-none group`}
    >
      {/* Top row: ID, icon, risk badge */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1 font-bold text-ink">
          <span>{machine.id}</span>
          {machine.has_sensors ? (
            <span title="Sensor equipped">
              <Cpu className="w-3 h-3 text-ink-muted" />
            </span>
          ) : (
            <span title="Legacy (no sensors)">
              <Wrench className="w-3 h-3 text-ink-muted/80" />
            </span>
          )}
        </div>
        <span
          className={`px-1 py-0.2 rounded text-[10px] font-bold ${
            machine.risk_score > 70
              ? 'bg-critical/20 text-critical'
              : machine.risk_score > 40
              ? 'bg-high/20 text-high'
              : 'bg-surface-2 text-ink-muted'
          }`}
        >
          {machine.risk_score}
        </span>
      </div>

      {/* Middle row: Short name */}
      <div className="text-[11px] font-medium text-ink truncate mt-1">
        {machine.name}
      </div>

      {/* Bottom row: Sparkline or Telemetry / Status */}
      <div className="flex items-center justify-between mt-2 pt-1 border-t border-line/40">
        {machine.has_sensors ? (
          <>
            <div className="flex flex-col text-[10px] font-mono leading-tight">
              <span className={`font-semibold ${isAbnormal ? 'text-critical' : 'text-ink'}`}>
                {telemetry.data_quality === 'dropout' ? (
                  <span className="text-ink-muted italic">offline</span>
                ) : (
                  `${telemetry.vibration_mm_s.toFixed(2)}`
                )}
              </span>
              <span className="text-[9px] text-ink-muted">mm/s</span>
            </div>

            {/* Micro Sparkline */}
            {telemetry.data_quality !== 'dropout' && (
              <svg width={width} height={height} className="shrink-0 opacity-80 group-hover:opacity-100">
                <path
                  d={pathD}
                  fill="none"
                  stroke={isAbnormal ? 'var(--critical)' : 'var(--ink)'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </>
        ) : (
          <div className="w-full flex items-center justify-between text-[10px] text-ink-muted">
            <span>Legacy</span>
            <span className="font-mono text-[9px] uppercase tracking-wider">PM {machine.pm_interval_days}d</span>
          </div>
        )}
      </div>

      {/* Abnormal Alert Indicator Pill */}
      {isAbnormal && (
        <div className="absolute -top-1.5 -right-1 flex items-center">
          <span
            className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold text-white shadow-xs ${
              isP1 ? 'bg-critical' : isP2 ? 'bg-high' : 'bg-medium'
            }`}
          >
            {activeAlert?.urgency}
          </span>
        </div>
      )}

      {/* Maintenance icon */}
      {isMaintenance && (
        <div className="absolute top-1.5 right-12">
          <span title="Under maintenance">
            <Wrench className="w-3 h-3 text-medium animate-pulse" />
          </span>
        </div>
      )}
    </div>
  );
}
