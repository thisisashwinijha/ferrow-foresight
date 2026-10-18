import React from 'react';

export default function KpisLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div className="h-8 w-64 bg-slate-800 rounded-lg" />
      <div className="h-40 bg-slate-900/60 rounded-xl border border-slate-800" />
      <div className="h-20 bg-slate-900/60 rounded-xl border border-slate-800" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 h-36" />
        ))}
      </div>
      <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800" />
    </div>
  );
}
