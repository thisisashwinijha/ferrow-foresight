import React from 'react';

export default function AgentLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-8 w-64 bg-surface-2 rounded-lg border border-line" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-surface rounded-card p-5 border border-line h-48" />
        ))}
      </div>
      <div className="h-80 bg-surface rounded-card border border-line" />
    </div>
  );
}
