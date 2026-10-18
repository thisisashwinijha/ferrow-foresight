'use client';

import React, { useState, useEffect } from 'react';

interface LiveClockProps {
  timeZone: string;
}

export function LiveClock({ timeZone }: LiveClockProps) {
  const [mounted, setMounted] = useState(false);
  const [timeStr, setTimeStr] = useState<string>('--:--:--');

  useEffect(() => {
    setMounted(true);
    const update = () => {
      try {
        const now = new Date();
        const formatted = new Intl.DateTimeFormat('en-GB', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now);
        setTimeStr(formatted);
      } catch (e) {
        setTimeStr(new Date().toLocaleTimeString());
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timeZone]);

  return (
    <div className="flex items-center gap-2 font-mono text-xs text-ink" suppressHydrationWarning>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-ok"></span>
      </span>
      <span className="text-[11px] font-semibold text-ok">Live</span>
      <span className="text-ink-muted">|</span>
      <span className="tracking-tight" suppressHydrationWarning>
        {mounted ? timeStr : '--:--:--'}
      </span>
    </div>
  );
}
