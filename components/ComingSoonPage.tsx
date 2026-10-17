'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';
import { usePlantContext } from './PlantContext';

interface ComingSoonPageProps {
  module: string;
  route: string;
  description: string;
}

export function ComingSoonPage({ module, route, description }: ComingSoonPageProps) {
  const { plantId, lineId } = usePlantContext();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/?plant=${plantId}&line=${lineId}`}
          className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Control Room</span>
        </Link>
      </div>

      <div className="border-b border-line pb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-ink">{module}</h1>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-2 text-ink-muted border border-line">
            {route}
          </span>
        </div>
        <p className="text-xs text-ink-muted mt-1">{description}</p>
      </div>

      <div className="bg-surface border border-line rounded-panel p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-surface-2 border border-line flex items-center justify-center text-ink-muted">
          <Construction className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-ink">Coming in the next build step</h3>
          <p className="text-xs text-ink-muted max-w-md">
            This module interface is scheduled for subsequent implementation per the rollout specification.
          </p>
        </div>
      </div>
    </div>
  );
}
