import React from 'react';

export default function PeopleLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-8 w-64 bg-surface-2 rounded-lg border border-line" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-surface rounded-card p-4 border border-line h-24" />
        ))}
      </div>
      <div className="h-10 w-96 bg-surface-2 rounded-lg border border-line" />
      <div className="h-96 bg-surface rounded-card border border-line" />
    </div>
  );
}
