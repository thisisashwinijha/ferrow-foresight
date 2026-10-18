import React from 'react';

export default function PlanningLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-8 w-64 bg-slate-800 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800" />
        <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800" />
      </div>
      <div className="h-80 bg-slate-900/60 rounded-xl border border-slate-800" />
    </div>
  );
}
