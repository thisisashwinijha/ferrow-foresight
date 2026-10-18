import React from 'react';

export default function AlertDetailLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-4 w-56 bg-surface-2 rounded-chip" />
      <div className="bg-surface rounded-card p-6 border border-line/30 h-36" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-card p-6 border border-line/30 h-64" />
          <div className="bg-surface rounded-card p-6 border border-line/30 h-48" />
          <div className="bg-surface rounded-card p-6 border border-line/30 h-48" />
        </div>
        <div className="space-y-6">
          <div className="bg-surface rounded-card p-6 border border-line/30 h-40" />
          <div className="bg-surface rounded-card p-6 border border-line/30 h-64" />
          <div className="bg-surface rounded-card p-6 border border-line/30 h-48" />
        </div>
      </div>
    </div>
  );
}
