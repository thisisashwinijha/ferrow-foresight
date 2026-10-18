import React from 'react';

export default function SparesLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-8 w-64 bg-slate-800 rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-44 bg-slate-900/60 rounded-xl border border-slate-800" />
        <div className="h-44 bg-slate-900/60 rounded-xl border border-slate-800" />
      </div>
      <div className="h-96 bg-slate-900/60 rounded-xl border border-slate-800" />
    </div>
  );
}
