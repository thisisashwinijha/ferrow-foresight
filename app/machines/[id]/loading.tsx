import React from 'react';

export default function MachineLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 w-48 bg-surface-2 rounded-chip" />

      {/* Header Skeleton */}
      <div className="bg-surface rounded-card p-6 border border-line/30 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-72 bg-surface-2 rounded-chip" />
            <div className="h-4 w-40 bg-surface-2 rounded-chip" />
          </div>
          <div className="flex gap-3">
            <div className="h-16 w-24 bg-surface-2 rounded-card" />
            <div className="h-16 w-24 bg-surface-2 rounded-card" />
          </div>
        </div>
        <div className="h-16 w-full bg-surface-2/60 rounded-btn" />
      </div>

      {/* Primary Chart Skeleton */}
      <div className="bg-surface rounded-card p-6 border border-line/30 h-80 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-line/40 border-t-ink animate-spin" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-card p-4 border border-line/30 h-24" />
        ))}
      </div>
    </div>
  );
}
