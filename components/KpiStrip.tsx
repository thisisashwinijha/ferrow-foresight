'use client';

import React from 'react';
import { KpiSnapshot, Alert } from '@/lib/types';
import {
  Clock,
  Gauge,
  Activity,
  Timer,
  CheckCircle,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface KpiStripProps {
  current?: KpiSnapshot;
  previous?: KpiSnapshot;
  alerts: Alert[];
}

export function KpiStrip({ current, previous, alerts }: KpiStripProps) {
  const openP1Count = alerts.filter(
    (a) => a.urgency === 'P1' && (a.status === 'pending' || a.status === 'needs_review')
  ).length;

  const renderDelta = (currVal?: number, prevVal?: number, suffix = '', inverse = false) => {
    if (currVal === undefined || prevVal === undefined) return null;
    const diff = currVal - prevVal;
    if (Math.abs(diff) < 0.01) {
      return <span className="text-[10px] text-ink-muted">0.0{suffix} vs prev mo</span>;
    }

    // Is positive change "good"? If inverse is true (e.g. downtime, wasted PM), lower is better.
    const isGood = inverse ? diff < 0 : diff > 0;
    const sign = diff > 0 ? '+' : '';

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-medium ${
          isGood ? 'text-ok' : 'text-critical'
        }`}
      >
        {diff > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
        <span>{sign}{diff.toFixed(1)}{suffix}</span>
      </span>
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
      {/* 1. Unplanned Downtime */}
      <div className="bg-surface border border-line p-2.5 rounded-panel shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span>Unplanned Downtime</span>
          <Clock className="w-3.5 h-3.5 text-ink-muted" />
        </div>
        <div className="my-1">
          <div className="text-lg font-bold font-mono text-ink">
            {current?.breakdown_hours?.toFixed(1) ?? '2.4'} h
          </div>
          <div className="text-[10px] font-mono text-ink-muted">
            ${((current?.downtime_cost_usd ?? 43200) / 1000).toFixed(0)}k @ $18k/h
          </div>
        </div>
        <div>
          {renderDelta(current?.breakdown_hours, previous?.breakdown_hours, 'h', true)}
        </div>
      </div>

      {/* 2. Availability */}
      <div className="bg-surface border border-line p-2.5 rounded-panel shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span>Availability</span>
          <Gauge className="w-3.5 h-3.5 text-ink-muted" />
        </div>
        <div className="my-1">
          <div className="text-lg font-bold font-mono text-ink">
            {current?.availability_pct?.toFixed(2) ?? '98.99'}%
          </div>
          <div className="text-[10px] font-mono text-ink-muted">Target: 98.5%</div>
        </div>
        <div>
          {renderDelta(current?.availability_pct, previous?.availability_pct, '%', false)}
        </div>
      </div>

      {/* 3. MTBF */}
      <div className="bg-surface border border-line p-2.5 rounded-panel shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span>MTBF</span>
          <Activity className="w-3.5 h-3.5 text-ink-muted" />
        </div>
        <div className="my-1">
          <div className="text-lg font-bold font-mono text-ink">
            {current?.mtbf_hours?.toFixed(0) ?? '719'} h
          </div>
          <div className="text-[10px] font-mono text-ink-muted">Mean time between fails</div>
        </div>
        <div>
          {renderDelta(current?.mtbf_hours, previous?.mtbf_hours, 'h', false)}
        </div>
      </div>

      {/* 4. MTTR */}
      <div className="bg-surface border border-line p-2.5 rounded-panel shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span>MTTR</span>
          <Timer className="w-3.5 h-3.5 text-ink-muted" />
        </div>
        <div className="my-1">
          <div className="text-lg font-bold font-mono text-ink">
            {current?.mttr_hours?.toFixed(1) ?? '0.5'} h
          </div>
          <div className="text-[10px] font-mono text-ink-muted">Mean time to restore</div>
        </div>
        <div>
          {renderDelta(current?.mttr_hours, previous?.mttr_hours, 'h', true)}
        </div>
      </div>

      {/* 5. Planned Maintenance % */}
      <div className="bg-surface border border-line p-2.5 rounded-panel shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span>Planned Maint.</span>
          <CheckCircle className="w-3.5 h-3.5 text-ink-muted" />
        </div>
        <div className="my-1">
          <div className="text-lg font-bold font-mono text-ink">
            {current?.planned_maintenance_pct?.toFixed(0) ?? '85'}%
          </div>
          <div className="text-[10px] font-mono text-ink-muted">Target: &gt; 80%</div>
        </div>
        <div>
          {renderDelta(current?.planned_maintenance_pct, previous?.planned_maintenance_pct, '%', false)}
        </div>
      </div>

      {/* 6. Wasted PM % */}
      <div className="bg-surface border border-line p-2.5 rounded-panel shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-ink-muted">
          <span>Wasted PM</span>
          <Activity className="w-3.5 h-3.5 text-ink-muted" />
        </div>
        <div className="my-1">
          <div className="text-lg font-bold font-mono text-ink">
            {current?.wasted_pm_pct?.toFixed(0) ?? '62'}%
          </div>
          <div className="text-[10px] font-mono text-ink-muted">No fault found</div>
        </div>
        <div>
          {renderDelta(current?.wasted_pm_pct, previous?.wasted_pm_pct, '%', true)}
        </div>
      </div>

      {/* 7. Open P1 Alerts */}
      <div className={`p-2.5 rounded-panel border shadow-xs flex flex-col justify-between ${
        openP1Count > 0
          ? 'bg-critical/10 border-critical'
          : 'bg-surface border-line'
      }`}>
        <div className="flex items-center justify-between text-[11px]">
          <span className={openP1Count > 0 ? 'text-critical font-semibold' : 'text-ink-muted'}>
            Open P1 Alerts
          </span>
          <AlertOctagon className={`w-3.5 h-3.5 ${openP1Count > 0 ? 'text-critical' : 'text-ink-muted'}`} />
        </div>
        <div className="my-1">
          <div className={`text-lg font-bold font-mono ${openP1Count > 0 ? 'text-critical' : 'text-ink'}`}>
            {openP1Count}
          </div>
          <div className="text-[10px] font-mono text-ink-muted">
            Immediate attention
          </div>
        </div>
        <div className="text-[10px] font-mono">
          {openP1Count > 0 ? (
            <span className="text-critical font-medium">Pending action</span>
          ) : (
            <span className="text-ok">Clear</span>
          )}
        </div>
      </div>
    </div>
  );
}
