'use client';

import React from 'react';
import Link from 'next/link';
import { KpiSnapshot, Alert } from '@/lib/types';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { usePlantContext } from './PlantContext';

interface KpiStripProps {
  current?: KpiSnapshot;
  previous?: KpiSnapshot;
  alerts: Alert[];
}

export function KpiStrip({ current, previous, alerts }: KpiStripProps) {
  const { plantId, lineId } = usePlantContext();

  const openP1Count = alerts.filter(
    (a) => a.urgency === 'P1' && (a.status === 'pending' || a.status === 'needs_review')
  ).length;

  const renderDelta = (currVal?: number, prevVal?: number, suffix = '', inverse = false) => {
    if (currVal === undefined || prevVal === undefined) return null;
    const diff = currVal - prevVal;
    if (Math.abs(diff) < 0.01) {
      return <span className="text-[11px] text-ink-muted">0.0{suffix} vs Aug</span>;
    }

    const isGood = inverse ? diff < 0 : diff > 0;
    const sign = diff > 0 ? '+' : '';

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
          isGood ? 'text-ok' : 'text-critical'
        }`}
      >
        {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{sign}{diff.toFixed(1)}{suffix} vs Aug</span>
      </span>
    );
  };

  const periodLabel = current?.month === '2026-09' ? 'Sep 2026' : current?.month || 'Sep 2026';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">Monthly performance</span>
        <Link
          href={`/kpis?plant=${plantId}&line=${lineId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink transition-colors group"
        >
          <span>All KPIs</span>
          <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Downtime Cost & Hours */}
        <div className="bg-surface rounded-card p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Downtime cost</span>
            <span className="text-[11px] font-medium">{periodLabel}</span>
          </div>

          <div>
            <div className="text-3xl font-light text-ink tracking-tight tabular-nums">
              ${(current?.downtime_cost_usd || 43200).toLocaleString()}
            </div>
            <div className="text-xs text-ink-muted mt-1">
              {current?.breakdown_hours?.toFixed(1) ?? '2.4'}h unplanned downtime
            </div>
          </div>

          <div className="pt-1">
            {renderDelta(current?.breakdown_hours, previous?.breakdown_hours, 'h', true)}
          </div>
        </div>

        {/* 2. Availability */}
        <div className="bg-surface rounded-card p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Availability</span>
            <span className="text-[11px] font-medium">{periodLabel}</span>
          </div>

          <div>
            <div className="text-3xl font-light text-ink tracking-tight tabular-nums">
              {current?.availability_pct?.toFixed(2) ?? '98.99'}%
            </div>
            <div className="text-xs text-ink-muted mt-1">
              Target 98.5%
            </div>
          </div>

          <div className="pt-1">
            {renderDelta(current?.availability_pct, previous?.availability_pct, '%', false)}
          </div>
        </div>

        {/* 3. Open P1 Alerts */}
        <div className={`rounded-card p-4 flex flex-col justify-between space-y-2 ${
          openP1Count > 0 ? 'bg-surface' : 'bg-surface'
        }`}>
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Open P1 alerts</span>
            <span className="text-[11px] font-medium">Now</span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-light tracking-tight tabular-nums ${
                openP1Count > 0 ? 'text-critical font-medium' : 'text-ink'
              }`}>
                {openP1Count}
              </span>
              {openP1Count > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-critical text-white text-[11px] font-medium">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-ok/10 text-ok text-[11px] font-medium">
                  Zero
                </span>
              )}
            </div>
            <div className="text-xs text-ink-muted mt-1">
              {openP1Count > 0 ? 'Immediate action required' : 'No critical alerts'}
            </div>
          </div>

          <div className="pt-1 text-[11px]">
            {openP1Count > 0 ? (
              <span className="text-critical font-medium">Requires authorization</span>
            ) : (
              <span className="text-ok font-medium">Line nominal</span>
            )}
          </div>
        </div>

        {/* 4. Wasted PM % */}
        <div className="bg-surface rounded-card p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Wasted PM</span>
            <span className="text-[11px] font-medium">{periodLabel}</span>
          </div>

          <div>
            <div className="text-3xl font-light text-ink tracking-tight tabular-nums">
              {current?.wasted_pm_pct?.toFixed(0) ?? '68'}%
            </div>
            <div className="text-xs text-ink-muted mt-1">
              No fault found during PM
            </div>
          </div>

          <div className="pt-1">
            {renderDelta(current?.wasted_pm_pct, previous?.wasted_pm_pct, '%', true)}
          </div>
        </div>
      </div>
    </div>
  );
}
