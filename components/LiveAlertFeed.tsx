'use client';

import React from 'react';
import { Alert, Plant } from '@/lib/types';
import { Bot, ChevronRight } from 'lucide-react';

interface LiveAlertFeedProps {
  alerts: Alert[];
  plant?: Plant;
  onSelectAlert: (alert: Alert) => void;
}

export function LiveAlertFeed({ alerts, plant, onSelectAlert }: LiveAlertFeedProps) {
  const isShadowPlant = plant?.status === 'shadow';

  const sortedAlerts = React.useMemo(() => {
    return [...alerts].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [alerts]);

  return (
    <div className="bg-surface rounded-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-ink">Recent activity</h3>
        <span className="text-[11px] text-ink-muted">{alerts.length} events</span>
      </div>

      {/* Compact One-Line List */}
      <div className="space-y-1">
        {sortedAlerts.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-muted">
            No recent activity recorded.
          </div>
        ) : (
          sortedAlerts.map((alert) => {
            const isSuppressed = alert.status === 'suppressed';
            const isP1 = alert.urgency === 'P1';
            const isP2 = alert.urgency === 'P2';
            const isP3 = alert.urgency === 'P3';
            const timeStr = alert.created_at ? alert.created_at.substring(11, 16) : '';

            return (
              <button
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className="w-full text-left py-2 px-2.5 rounded-btn hover:bg-surface-2 transition-colors flex items-center justify-between gap-2 group text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono text-ink-muted shrink-0">
                    {timeStr}
                  </span>
                  <span className="font-mono font-semibold text-ink shrink-0">
                    {alert.machine_id}
                  </span>
                  <span className="truncate text-ink-muted capitalize">
                    {alert.failure_mode.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Small AI marker */}
                  <span
                    title="AI triage suggestion"
                    className="w-1.5 h-1.5 rounded-full bg-agent opacity-80"
                  />

                  {/* Soft Urgency Badge */}
                  {isSuppressed ? (
                    <span className="px-1.5 py-0.2 rounded-chip text-[10px] bg-surface-2 text-ink-muted">
                      Filtered
                    </span>
                  ) : (
                    <span
                      className={`px-1.5 py-0.2 rounded-chip text-[10px] font-medium capitalize ${
                        isP1
                          ? 'bg-critical/10 text-critical'
                          : isP2
                          ? 'bg-high/10 text-high'
                          : isP3
                          ? 'bg-medium/10 text-medium'
                          : 'bg-surface-2 text-ink-muted'
                      }`}
                    >
                      {alert.urgency === 'none' ? 'Normal' : alert.urgency}
                    </span>
                  )}

                  <ChevronRight className="w-3.5 h-3.5 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
