'use client';

import React from 'react';
import {
  WorkflowStage,
  WORKFLOW_STAGES,
  getWorkflowStage,
  getWaitingForRole,
} from '@/lib/workflow';
import { Alert, WorkOrder } from '@/lib/types';
import { Check, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';

interface WorkflowFlowTrackerProps {
  alert?: Alert | null;
  workOrder?: WorkOrder | null;
  knowledgeVerified?: boolean;
  className?: string;
}

export function WorkflowFlowTracker({
  alert,
  workOrder,
  knowledgeVerified,
  className = '',
}: WorkflowFlowTrackerProps) {
  const currentStage = getWorkflowStage(alert, workOrder, knowledgeVerified);
  const waitingFor = getWaitingForRole(currentStage);

  const stageKeys: WorkflowStage[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div
      className={`p-3.5 rounded-card bg-surface border border-line space-y-2.5 ${className}`}
      aria-label="Workflow progress"
    >
      {/* Header with active stage and Waiting for role */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">
            Stage {currentStage} of 9: {WORKFLOW_STAGES[currentStage]?.name}
          </span>
          <span className="text-ink-muted hidden sm:inline">·</span>
          <span className="text-[11px] text-ink-muted hidden sm:inline">
            {WORKFLOW_STAGES[currentStage]?.description}
          </span>
        </div>

        {currentStage === 9 ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-ok/10 border border-ok/20 text-ok font-medium text-[11px] shrink-0">
            <CheckCircle2 className="w-3 h-3 shrink-0 text-ok" />
            <span><strong>Completed</strong></span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-accent/10 border border-accent/20 text-accent font-medium text-[11px] shrink-0">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Waiting for: <strong>{waitingFor}</strong></span>
          </div>
        )}
      </div>

      {/* Horizontal Stepper */}
      <div className="overflow-x-auto pb-1 pt-0.5 -mx-1 px-1">
        <div className="flex items-center min-w-[620px] justify-between gap-1">
          {stageKeys.map((stageNum, idx) => {
            const info = WORKFLOW_STAGES[stageNum];
            const isDone = stageNum < currentStage;
            const isCurrent = stageNum === currentStage;

            return (
              <React.Fragment key={stageNum}>
                {/* Stage Step Item */}
                <div
                  className={`flex items-center gap-1.5 py-1 px-2 rounded-btn transition-colors text-[11px] shrink-0 ${
                    isCurrent
                      ? 'bg-accent/15 border border-accent/40 text-ink font-semibold'
                      : isDone
                      ? 'text-ok font-medium'
                      : 'text-ink-muted opacity-60'
                  }`}
                  title={`${info.name} (${info.role})`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      isDone
                        ? 'bg-ok text-white font-bold'
                        : isCurrent
                        ? 'bg-accent text-white font-bold'
                        : 'bg-surface-2 text-ink-muted font-mono'
                    }`}
                  >
                    {isDone ? <Check className="w-2.5 h-2.5" /> : stageNum}
                  </span>
                  <span className="truncate max-w-[85px]">{info.shortName}</span>
                </div>

                {/* Connector arrow between stages */}
                {idx < stageKeys.length - 1 && (
                  <ChevronRight
                    className={`w-3 h-3 shrink-0 ${
                      stageNum < currentStage ? 'text-ok/70' : 'text-line'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
