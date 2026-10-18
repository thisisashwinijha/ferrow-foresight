'use client';

import React from 'react';
import Link from 'next/link';
import { Alert, Plant } from '@/lib/types';
import { formatFailureMode } from '@/lib/lifecycle';
import { ShieldCheck, ArrowRight, Bot } from 'lucide-react';
import { usePlantContext } from './PlantContext';

interface AttentionSectionProps {
  alerts: Alert[];
  plant?: Plant;
  onSelectAlert: (alert: Alert) => void;
}

export function AttentionSection({ alerts, plant, onSelectAlert }: AttentionSectionProps) {
  const { plantId, lineId } = usePlantContext();
  const isShadow = plant?.status === 'shadow';

  const attentionAlerts = alerts
    .filter(
      (a) =>
        (a.status === 'pending' || a.status === 'needs_review') &&
        (a.urgency === 'P1' || a.urgency === 'P2')
    )
    .slice(0, 3);

  const totalPending = alerts.filter(
    (a) => a.status === 'pending' || a.status === 'needs_review'
  ).length;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink tracking-tight">
            Needs your attention
          </h2>
          {attentionAlerts.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
          )}
        </div>

        {totalPending > 0 && (
          <Link
            href={`/alerts?plant=${plantId || 'P-07'}`}
            className="text-xs font-medium text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
          >
            <span>View all ({totalPending})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Cards Grid */}
      {attentionAlerts.length === 0 ? (
        <div className="bg-surface rounded-card p-5 text-xs text-ink-muted flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-ok" />
          <span>No urgent P1 or P2 alerts pending review. Operations running nominal.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {attentionAlerts.map((alert) => {
            const isP1 = alert.urgency === 'P1';

            return (
              <div
                key={alert.id}
                className="bg-surface rounded-card p-4 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Top Bar: Asset + Urgency Soft Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-xs text-ink">
                      <span className="font-mono text-ink font-semibold">{alert.machine_id}</span>
                      <span className="text-ink-muted">·</span>
                      <span className="truncate max-w-[140px] text-ink-muted">
                        {formatFailureMode(alert.failure_mode)}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-chip text-[11px] font-medium capitalize ${
                        isP1
                          ? 'bg-critical/10 text-critical'
                          : 'bg-high/10 text-high'
                      }`}
                    >
                      {alert.urgency}
                    </span>
                  </div>

                  {/* One-line plain reason */}
                  <p className="text-xs text-ink mt-2.5 line-clamp-2 leading-relaxed">
                    {alert.reasoning}
                  </p>
                </div>

                {/* Card Action */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-agent font-medium">
                    <Bot className="w-3 h-3" />
                    <span>AI recommendation</span>
                  </div>

                  <button
                    onClick={() => onSelectAlert(alert)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-ink text-canvas hover:opacity-90 text-xs font-medium transition-opacity"
                  >
                    <span>{isShadow ? 'Compare outcome' : 'Review'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
