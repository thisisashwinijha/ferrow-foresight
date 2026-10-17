'use client';

import React from 'react';
import Link from 'next/link';
import { Alert, Plant } from '@/lib/types';
import { AlertTriangle, Clock, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { usePlantContext } from './PlantContext';

interface ApprovalsQueueProps {
  alerts: Alert[];
  plant?: Plant;
}

export function ApprovalsQueue({ alerts, plant }: ApprovalsQueueProps) {
  const { plantId, lineId } = usePlantContext();
  const isShadow = plant?.status === 'shadow';

  const pendingAlerts = alerts.filter(
    (a) => a.status === 'pending' || a.status === 'needs_review'
  );

  return (
    <div className="bg-surface border border-line rounded-panel overflow-hidden shadow-xs">
      <div className="p-3 border-b border-line flex items-center justify-between bg-surface-2/40">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-medium" />
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
            Approvals Queue ({pendingAlerts.length})
          </h2>
        </div>
        <span className="text-[10px] text-ink-muted">
          Human approval mandatory before work order dispatch
        </span>
      </div>

      <div className="p-3">
        {pendingAlerts.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-muted flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-ok" />
            <span>All alerts reviewed and approved. Approvals queue is clear.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingAlerts.map((alert) => {
              const isP1 = alert.urgency === 'P1';
              const isP2 = alert.urgency === 'P2';

              return (
                <div
                  key={alert.id}
                  className="p-3 rounded-panel border border-line bg-surface-2/30 flex flex-col justify-between gap-2 hover:border-ink-muted transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-ink">
                        <span>{alert.machine_id}</span>
                        <span className="text-line">|</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold text-white ${
                            isP1 ? 'bg-critical' : isP2 ? 'bg-high' : 'bg-medium'
                          }`}
                        >
                          {alert.urgency}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-muted uppercase">
                        {alert.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-ink mt-1.5 capitalize">
                      {alert.failure_mode.replace('_', ' ')}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1 line-clamp-2">
                      {alert.recommended_action}
                    </p>

                    {alert.assigned_technician && (
                      <div className="flex items-center gap-1 text-[10px] text-ink-muted mt-2">
                        <UserCheck className="w-3 h-3 text-ink-muted" />
                        <span>Proposed: {alert.assigned_technician}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-line/40 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-ink-muted">
                      Cost: ${(alert.est_failure_cost_usd / 1000).toFixed(0)}k vs ${(alert.est_intervention_cost_usd).toFixed(0)}
                    </span>

                    <Link
                      href={`/alerts/${alert.id}?plant=${plantId}&line=${lineId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-btn bg-surface hover:bg-surface-2 text-ink border border-line text-xs font-semibold transition-colors"
                    >
                      <span>{isShadow ? 'Compare with outcome' : 'Review'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
