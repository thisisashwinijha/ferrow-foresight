'use client';

import React from 'react';
import Link from 'next/link';
import { Alert, Plant } from '@/lib/types';
import { Bot, Shield, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { usePlantContext } from './PlantContext';

interface LiveAlertFeedProps {
  alerts: Alert[];
  plant?: Plant;
}

export function LiveAlertFeed({ alerts, plant }: LiveAlertFeedProps) {
  const { plantId, lineId } = usePlantContext();
  const isShadowPlant = plant?.status === 'shadow';

  const sortedAlerts = React.useMemo(() => {
    return [...alerts].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [alerts]);

  return (
    <div className="bg-surface border border-line rounded-panel flex flex-col h-full overflow-hidden">
      {/* Feed Header */}
      <div className="p-3 border-b border-line flex items-center justify-between bg-surface-2/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-critical animate-pulse" />
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Live Alert Feed
          </h2>
        </div>
        <span className="text-[11px] font-mono text-ink-muted">
          {alerts.length} events
        </span>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto divide-y divide-line/40 p-2 space-y-2">
        {sortedAlerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-muted">
            No live alerts recorded for this plant scope.
          </div>
        ) : (
          sortedAlerts.map((alert) => {
            const isSuppressed = alert.status === 'suppressed';
            const isApproved = alert.status === 'approved';
            const isP1 = alert.urgency === 'P1';
            const isP2 = alert.urgency === 'P2';
            const isP3 = alert.urgency === 'P3';

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded-panel border transition-all ${
                  isSuppressed
                    ? 'bg-surface-2/30 border-line/40 opacity-60 text-ink-muted'
                    : 'bg-surface border-line hover:border-ink-muted shadow-xs'
                }`}
              >
                {/* AI Suggestion Accent Header */}
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-line/30">
                  <div className="flex items-center gap-1.5">
                    {/* --agent left accent pill */}
                    <div className="flex items-center gap-1 text-[10px] font-medium text-agent bg-agent/10 px-1.5 py-0.2 rounded border-l-2 border-agent">
                      <Bot className="w-2.5 h-2.5" />
                      <span>AI suggestion</span>
                    </div>

                    {(isShadowPlant || alert.id.startsWith('AL-200')) && (
                      <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-ink-muted bg-surface-2 px-1 rounded border border-line">
                        <Shield className="w-2.5 h-2.5" />
                        Shadow mode
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-ink-muted">
                    {alert.created_at ? alert.created_at.substring(11, 16) : ''}
                  </span>
                </div>

                {/* Main Alert Info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-ink">
                        {alert.machine_id}
                      </span>
                      <span className="text-line">|</span>
                      <span className="text-xs font-semibold text-ink capitalize">
                        {alert.failure_mode.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] text-ink-muted line-clamp-2 mt-1 leading-snug">
                      {alert.reasoning}
                    </p>
                  </div>

                  {/* Urgency Badge */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {isSuppressed ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-2 text-ink-muted">
                        Suppressed
                      </span>
                    ) : (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white ${
                          isP1 ? 'bg-critical' : isP2 ? 'bg-high' : isP3 ? 'bg-medium' : 'bg-ink-muted'
                        }`}
                      >
                        {alert.urgency}
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-ink-muted">
                      {Math.round(alert.confidence * 100)}% conf
                    </span>
                  </div>
                </div>

                {/* Bottom Row / Status Tag */}
                <div className="mt-2 pt-1.5 border-t border-line/30 flex items-center justify-between text-[11px]">
                  {isSuppressed ? (
                    <span className="text-ink-muted italic text-[10px]">
                      Filtered as false alarm
                    </span>
                  ) : isApproved ? (
                    <span className="inline-flex items-center gap-1 text-ok font-medium text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="text-ink-muted text-[10px]">
                      Status: <span className="font-semibold text-ink">{alert.status}</span>
                    </span>
                  )}

                  <Link
                    href={`/alerts/${alert.id}?plant=${plantId}&line=${lineId}`}
                    className="inline-flex items-center gap-1 text-[11px] text-ink hover:underline font-medium"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
