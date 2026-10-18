import React from 'react';

export default function KpisLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-8 w-64 bg-surface-2 rounded-lg border border-line" />
      <div className="h-40 bg-surface rounded-card border border-line" />
      <div className="h-20 bg-surface rounded-card border border-line" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="bg-surface rounded-card p-4 border border-line h-36" />
        ))}
      </div>
      <div className="h-64 bg-surface rounded-card border border-line" />
    </div>
  );
}
