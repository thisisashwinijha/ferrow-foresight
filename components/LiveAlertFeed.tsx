'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Plant, WorkOrder } from '@/lib/types';
import { ChevronRight, Sparkles } from 'lucide-react';
import { getRecentActivityEvents, ActivityEvent } from '@/lib/lifecycle';

interface LiveAlertFeedProps {
  alerts: Alert[];
  workOrders?: WorkOrder[];
  plant?: Plant;
  onSelectAlert: (alert: Alert) => void;
}

export function LiveAlertFeed({ alerts, workOrders = [], plant, onSelectAlert }: LiveAlertFeedProps) {
  const router = useRouter();

  const events: ActivityEvent[] = React.useMemo(() => {
    return getRecentActivityEvents(alerts, workOrders);
  }, [alerts, workOrders]);

  const handleEventClick = (event: ActivityEvent) => {
    if (event.alertId) {
      const match = alerts.find((a) => a.id === event.alertId);
      if (match) {
        onSelectAlert(match);
        return;
      }
      router.push(`/alerts/${event.alertId}`);
    } else if (event.workOrderId) {
      router.push(`/work-orders/${event.workOrderId}`);
    }
  };

  return (
    <div className="bg-surface rounded-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-ink">Recent activity</h3>
        <span className="text-[11px] text-ink-muted">{events.length} events</span>
      </div>

      {/* Compact One-Line List */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-0.5">
        {events.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-muted">
            No recent activity recorded.
          </div>
        ) : (
          events.slice(0, 15).map((event) => {
            const timeStr = event.timestamp ? event.timestamp.substring(11, 16) : '';
            const isResolved = event.badge.label === 'Resolved';
            const isApproved = event.badge.label === 'Approved';
            const isP1 = event.badge.label === 'P1';
            const isP2 = event.badge.label === 'P2';

            return (
              <button
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="w-full text-left py-2 px-2.5 rounded-btn hover:bg-surface-2 transition-colors flex items-center justify-between gap-2 group text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono text-ink-muted shrink-0">
                    {timeStr || '14:30'}
                  </span>
                  <span className="font-mono font-semibold text-ink shrink-0">
                    {event.machineId}
                  </span>
                  <span className="truncate text-ink-muted">
                    {event.title.replace(/^Alert (raised|approved|rejected|resolved): /, '')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Small AI marker on alerts */}
                  {event.alertId && (
                    <span
                      title="AI Triage"
                      className="w-1.5 h-1.5 rounded-full bg-agent opacity-80"
                    />
                  )}

                  {/* Soft Badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded-chip text-[10px] font-medium ${
                      isResolved || isApproved
                        ? 'bg-ok/10 text-ok'
                        : isP1
                        ? 'bg-critical/15 text-critical font-semibold'
                        : isP2
                        ? 'bg-high/15 text-high'
                        : 'bg-surface-2 text-ink-muted'
                    }`}
                  >
                    {event.badge.label}
                  </span>

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
