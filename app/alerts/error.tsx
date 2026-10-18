'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function AlertsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-[700px] mx-auto py-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-semibold text-ink">Unable to load triage alerts</h2>
      <p className="text-xs text-ink-muted">
        {error.message || 'An unexpected error occurred while fetching the alerts registry.'}
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-surface-2 text-ink text-xs font-medium hover:bg-surface-3 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-btn bg-ink text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Back to Control room
        </Link>
      </div>
    </div>
  );
}
