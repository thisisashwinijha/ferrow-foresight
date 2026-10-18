import React from 'react';

export default function AlertsLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-8 w-60 bg-surface-2 rounded-chip" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-card p-4 border border-line/30 h-24" />
        ))}
      </div>
      <div className="h-12 bg-surface rounded-card border border-line/30" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface rounded-card p-5 border border-line/30 h-32" />
        ))}
      </div>
    </div>
  );
}
