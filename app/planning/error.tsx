'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function PlanningError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-[700px] mx-auto py-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-critical-bg text-critical flex items-center justify-center mx-auto border border-critical-border">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-semibold text-ink">Unable to load maintenance planning</h2>
      <p className="text-xs text-ink-muted">
        {error.message || 'An unexpected error occurred while fetching PM plans and risk matrix data.'}
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface text-ink text-xs font-medium hover:bg-surface-2 transition-colors border border-line shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
          <span>Retry</span>
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-agent text-white text-xs font-medium hover:bg-agent/90 transition-colors shadow-xs"
        >
          Back to Control room
        </Link>
      </div>
    </div>
  );
}
