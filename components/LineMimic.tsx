'use client';

import React from 'react';
import { Line, Machine, Alert } from '@/lib/types';
import { MachineTile } from './MachineTile';

interface LineMimicProps {
  lines: Line[];
  machines: Machine[];
  alerts: Alert[];
}

export function LineMimic({ lines, machines, alerts }: LineMimicProps) {
  // Map active alerts by machine_id (most urgent first)
  const alertMap = React.useMemo(() => {
    const map: Record<string, Alert> = {};
    alerts.forEach((alert) => {
      if (alert.status === 'pending' || alert.status === 'needs_review') {
        const existing = map[alert.machine_id];
        if (!existing) {
          map[alert.machine_id] = alert;
        } else if (alert.urgency === 'P1' && existing.urgency !== 'P1') {
          map[alert.machine_id] = alert;
        }
      }
    });
    return map;
  }, [alerts]);

  return (
    <div className="space-y-4">
      {lines.map((line) => {
        const lineMachines = machines
          .filter((m) => m.line_id === line.id)
          .sort((a, b) => a.id.localeCompare(b.id));

        return (
          <div key={line.id} className="space-y-2">
            {/* Line Title */}
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <div className="flex items-center gap-1.5 font-medium text-ink">
                <span className="font-mono text-ink-muted">{line.id}</span>
                <span>·</span>
                <span>{line.name}</span>
                <span className="text-ink-muted hidden sm:inline font-normal">
                  ({line.product})
                </span>
              </div>
              <span className="text-[11px] text-ink-muted">
                {lineMachines.length} assets
              </span>
            </div>

            {/* Wrapping flow of machines */}
            <div className="flex flex-wrap items-center gap-2">
              {lineMachines.map((m) => (
                <MachineTile
                  key={m.id}
                  machine={m}
                  activeAlert={alertMap[m.id]}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
