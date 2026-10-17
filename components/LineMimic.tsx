'use client';

import React from 'react';
import { Line, Machine, Alert } from '@/lib/types';
import { MachineTile } from './MachineTile';
import { Layers } from 'lucide-react';

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
          <div
            key={line.id}
            className="bg-surface border border-line rounded-panel p-3 shadow-xs space-y-2"
          >
            {/* Line Header */}
            <div className="flex items-center justify-between border-b border-line/40 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-ink-muted" />
                <span className="font-mono text-xs font-bold text-ink">{line.id}</span>
                <span className="text-line">|</span>
                <span className="text-xs font-semibold text-ink">{line.name}</span>
                <span className="text-xs text-ink-muted hidden sm:inline">
                  ({line.product})
                </span>
              </div>
              <div className="text-[11px] font-mono text-ink-muted">
                {lineMachines.length} machines in sequence
              </div>
            </div>

            {/* Horizontal Flow of Machine Tiles */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-1 scrollbar-thin">
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
