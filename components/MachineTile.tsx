'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  WifiOff,
  Calendar,
} from 'lucide-react';
import { Machine, Alert, WorkOrder } from '@/lib/types';
import { useMachineTelemetry } from '@/lib/simulator';
import { usePlantContext } from './PlantContext';
import { getDerivedMachineTileState, DerivedMachineTileState } from '@/lib/lifecycle';

interface MachineTileProps {
  machine: Machine;
  activeAlert?: Alert;
  alerts?: Alert[];
  workOrders?: WorkOrder[];
  sequenceIndex?: number;
}

export function MachineTile({
  machine,
  activeAlert,
  alerts = [],
  workOrders = [],
  sequenceIndex,
}: MachineTileProps) {
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

  // Derive authoritative lifecycle state
  const effectiveAlerts = alerts.length > 0 ? alerts : activeAlert ? [activeAlert] : [];
  const derivedState: DerivedMachineTileState = React.useMemo(() => {
    return getDerivedMachineTileState(machine, effectiveAlerts, workOrders);
  }, [machine, effectiveAlerts, workOrders]);

  const isOffline = machine.status === 'offline' || machine.id === 'P07-M18';

  // Sparkline calculation for sensor machines
  const points = telemetry?.sparkline || [];
  const minVal = Math.min(...points, 0);
  const maxVal = Math.max(...points, 8);
  const range = maxVal - minVal || 1;

  const width = 42;
  const height = 15;
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

  // Card surfaces following the design system & lifecycle rules:
  // - Open alert: urgency color (P1 solid count, P2/P3 soft tint)
  // - In progress / LOTO: neutral surface tint with wrench (NEVER alarm colours!)
  // - Scheduled: neutral tile with calendar icon
  // - Normal: quiet, borderless or ultra-subtle tint
  let cardStyle = 'bg-surface/50 hover:bg-surface border border-line/20 hover:border-line/40 text-ink';

  if (isOffline) {
    cardStyle = 'bg-surface-2/30 border border-dashed border-line/40 opacity-70';
  } else if (derivedState.state === 'alert') {
    if (derivedState.urgency === 'P1') {
      cardStyle = 'bg-critical/10 border border-critical/40 hover:bg-critical/15 hover:border-critical/60 shadow-xs';
    } else if (derivedState.urgency === 'P2') {
      cardStyle = 'bg-high/10 border border-high/40 hover:bg-high/15 hover:border-high/60 shadow-xs';
    } else {
      cardStyle = 'bg-medium/10 border border-medium/40 hover:bg-medium/15 hover:border-medium/60 shadow-xs';
    }
  } else if (derivedState.state === 'in_progress') {
    // Under maintenance NEVER uses alarm colours: neutral surface tint
    cardStyle = 'bg-surface-2 border border-line/60 hover:border-line text-ink';
  } else if (derivedState.state === 'scheduled') {
    cardStyle = 'bg-surface-2/50 border border-line/30 hover:border-line/50 text-ink-muted';
  }

  const currentVib = mounted
    ? telemetry.vibration_mm_s
    : machine.vibration_baseline || 1.8;

  return (
    <div
      onClick={handleClick}
      className={`group relative p-2.5 rounded-card ${cardStyle} cursor-pointer transition-all duration-150 hover:scale-[1.01] flex flex-col justify-between h-[86px] select-none`}
    >
      {/* 1. Header: Step & ID + Quiet Asset Type or State Badge */}
      <div className="flex items-center justify-between text-[11px] leading-none">
        <div className="flex items-center gap-1.5 min-w-0">
          {sequenceIndex !== undefined && (
            <span className="font-mono text-[10px] text-ink-muted/50 font-medium">
              {String(sequenceIndex).padStart(2, '0')}
            </span>
          )}
          <span className="font-mono font-medium text-ink-muted group-hover:text-ink transition-colors">
            {machine.id}
          </span>
        </div>

        {/* State Badges */}
        {isOffline ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted font-medium">
            <WifiOff className="w-2.5 h-2.5" />
            <span>Offline</span>
          </span>
        ) : derivedState.state === 'alert' ? (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              derivedState.urgency === 'P1'
                ? 'bg-critical/20 text-critical'
                : derivedState.urgency === 'P2'
                ? 'bg-high/20 text-high'
                : 'bg-medium/20 text-medium'
            }`}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>{derivedState.urgency}</span>
          </span>
        ) : derivedState.state === 'in_progress' ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-ink/10 text-ink">
            <Wrench className="w-2.5 h-2.5" />
            <span>{derivedState.badgeLabel}</span>
          </span>
        ) : derivedState.state === 'scheduled' ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted font-medium">
            <Calendar className="w-2.5 h-2.5" />
            <span>Scheduled</span>
          </span>
        ) : machine.has_sensors ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium"
            title="IoT Continuous Telemetry"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>IoT</span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-ink-muted/60 font-medium"
            title="Legacy Asset (Manual shift inspection)"
          >
            <ClipboardCheck className="w-2.5 h-2.5" />
            <span>Legacy</span>
          </span>
        )}
      </div>

      {/* 2. Machine Name & Plain-English issue if abnormal or under maintenance */}
      <div className="my-auto py-0.5">
        <p
          className={`text-xs font-medium truncate leading-tight ${
            derivedState.isAbnormal ? 'text-ink font-semibold' : 'text-ink'
          }`}
          title={machine.name}
        >
          {machine.name}
        </p>
        {derivedState.state === 'alert' && derivedState.detailLabel && (
          <p className="text-[10px] text-critical truncate mt-0.5 font-medium capitalize">
            {derivedState.detailLabel.replace(/_/g, ' ')}
          </p>
        )}
        {derivedState.state === 'in_progress' && (
          <p className="text-[10px] text-ink-muted truncate mt-0.5 font-mono">
            {derivedState.detailLabel}
          </p>
        )}
        {derivedState.state === 'scheduled' && (
          <p className="text-[10px] text-ink-muted truncate mt-0.5 font-mono">
            {derivedState.detailLabel}
          </p>
        )}
      </div>

      {/* 3. Bottom Row: Telemetry (Sensor) OR Inspection Cadence (Legacy) - NO INNER DIVIDER LINE */}
      <div className="flex items-center justify-between text-[11px] text-ink-muted leading-none">
        {machine.has_sensors ? (
          isOffline ? (
            <span className="text-[10px] italic opacity-60">Sensor dropout</span>
          ) : (
            <>
              <div className="flex items-baseline gap-1 font-mono">
                <span
                  className={`text-xs ${
                    derivedState.state === 'alert' && derivedState.urgency === 'P1'
                      ? 'text-critical font-bold'
                      : derivedState.state === 'alert' && derivedState.urgency === 'P2'
                      ? 'text-high font-bold'
                      : 'text-ink font-medium'
                  }`}
                >
                  {currentVib.toFixed(2)}
                </span>
                <span className="text-[10px] opacity-60">mm/s</span>
              </div>

              {mounted && pathD && (
                <svg
                  width={width}
                  height={height}
                  className={
                    derivedState.state === 'alert' && derivedState.urgency === 'P1'
                      ? 'text-critical stroke-critical'
                      : derivedState.state === 'alert' && derivedState.urgency === 'P2'
                      ? 'text-high stroke-high'
                      : 'text-ink-muted/30 stroke-current'
                  }
                >
                  <path
                    d={pathD}
                    fill="none"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </>
          )
        ) : (
          /* Legacy Machine */
          <div className="flex items-center justify-between w-full text-[10px] text-ink-muted/70">
            <span>{machine.strategy} · {machine.pm_interval_days}d</span>
            <span>Manual check</span>
          </div>
        )}
      </div>
    </div>
  );
}
