'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function SparesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-[700px] mx-auto py-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-semibold text-slate-100">Unable to load spares readiness</h2>
      <p className="text-xs text-slate-400">
        {error.message || 'An unexpected error occurred while fetching inventory levels and reservations.'}
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
        >
          Back to Control room
        </Link>
      </div>
    </div>
  );
}
