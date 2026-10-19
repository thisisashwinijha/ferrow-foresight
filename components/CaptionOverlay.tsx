'use client';

import React, { useState, useEffect } from 'react';

export function CaptionOverlay() {
  const [caption, setCaption] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasDemoParam = searchParams.get('demo') === '1';
    const hasScriptCookie =
      document.cookie.includes('demo=1') ||
      document.cookie.includes('demo_caption=1') ||
      document.cookie.includes('script=1');

    if (hasDemoParam || hasScriptCookie || (window as any).__DEMO_CAPTION_ENABLED) {
      setEnabled(true);
    }

    const handler = (event: any) => {
      setEnabled(true);
      setCaption(event.detail?.text || '');
    };

    window.addEventListener('setDemoCaption', handler);
    (window as any).__setCaption = (text: string) => {
      setEnabled(true);
      setCaption(text);
    };

    return () => {
      window.removeEventListener('setDemoCaption', handler);
    };
  }, []);

  if (!enabled || !caption) return null;

  return (
    <div
      id="demo-caption-overlay"
      className="fixed bottom-0 left-0 right-0 h-9 bg-slate-900/95 backdrop-blur-md text-white border-t border-white/15 z-[99999] flex items-center justify-center px-4 text-xs font-medium tracking-tight shadow-2xl pointer-events-none select-none transition-all duration-200"
    >
      <div className="flex items-center gap-2 max-w-4xl truncate">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
        <span className="truncate">{caption}</span>
      </div>
    </div>
  );
}
