'use client';

import React from 'react';
import Link from 'next/link';
import { X, ArrowRight, Bot, Shield, AlertTriangle, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import { Alert, Plant } from '@/lib/types';
import { formatFailureMode } from '@/lib/lifecycle';
import { usePlantContext } from './PlantContext';

interface AlertDetailSheetProps {
  alert: Alert | null;
  plant?: Plant;
  onClose: () => void;
}

export function AlertDetailSheet({ alert, plant, onClose }: AlertDetailSheetProps) {
  const { plantId, lineId } = usePlantContext();
  if (!alert) return null;

  const isShadow = plant?.status === 'shadow' || alert.id.startsWith('AL-200');
  const isP1 = alert.urgency === 'P1';
  const isP2 = alert.urgency === 'P2';
  const isP3 = alert.urgency === 'P3';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-line/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-ink">
              {alert.id}
            </span>
            <span className="text-ink-muted">·</span>
            <span
              className={`px-2 py-0.5 rounded-chip text-xs font-medium ${
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

            {isShadow && (
              <span className="px-2 py-0.5 rounded-chip text-[11px] font-medium bg-ink/10 text-ink-muted flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Shadow
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-btn hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Machine & Failure Mode */}
          <div>
            <div className="text-xs text-ink-muted">Asset affected</div>
            <div className="text-lg font-semibold text-ink mt-0.5">
              {alert.machine_id}
            </div>
            <div className="text-sm font-medium text-ink mt-0.5">
              {formatFailureMode(alert.failure_mode)}
            </div>
          </div>

          {/* AI Suggestion Badge & Reasoning */}
          <div className="bg-surface-2/40 p-4 rounded-card space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-agent font-medium">
              <Bot className="w-3.5 h-3.5" />
              <span>AI triage suggestion</span>
              <span className="text-ink-muted ml-auto font-mono text-[11px]">
                {Math.round(alert.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-xs text-ink leading-relaxed">
              {alert.reasoning}
            </p>
          </div>

          {/* Recommended Action */}
          <div>
            <div className="text-xs font-medium text-ink-muted">Recommended action</div>
            <p className="text-xs text-ink mt-1 bg-surface-2/20 p-3 rounded-card border border-line/20">
              {alert.recommended_action}
            </p>
          </div>

          {/* Assigned Technician & Proposed Window */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-surface-2/30 rounded-card">
              <div className="text-ink-muted flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assigned</span>
              </div>
              <div className="font-semibold text-ink mt-1">
                {alert.assigned_technician || 'Unassigned'}
              </div>
            </div>

            <div className="p-3 bg-surface-2/30 rounded-card">
              <div className="text-ink-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Window</span>
              </div>
              <div className="font-semibold text-ink mt-1 capitalize">
                {alert.proposed_window?.window_type.replace('_', ' ') || 'Next PM'}
              </div>
            </div>
          </div>

          {/* Financial Consequence */}
          <div className="p-3 bg-surface-2/30 rounded-card flex items-center justify-between text-xs">
            <div>
              <span className="text-ink-muted">Est. failure cost:</span>
              <div className="text-sm font-semibold font-mono text-ink mt-0.5">
                ${(alert.est_failure_cost_usd || 0).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <span className="text-ink-muted">Intervention:</span>
              <div className="text-sm font-semibold font-mono text-ok mt-0.5">
                ${(alert.est_intervention_cost_usd || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-line/30 flex items-center justify-between bg-surface-2/20">
          <Link
            href={`/alerts/${alert.id}?plant=${plantId}&line=${lineId}`}
            onClick={onClose}
            className="text-xs font-medium text-ink-muted hover:text-ink underline"
          >
            Open full alert dossier
          </Link>

          <Link
            href={`/alerts/${alert.id}?plant=${plantId}&line=${lineId}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-ink text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <span>{isShadow ? 'Compare with outcome' : 'Review & approve'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
