'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DatabaseBannerProps {
  initialHasKeys?: boolean;
  initialLive?: boolean;
}

export function DatabaseBanner({
  initialHasKeys = false,
  initialLive = false,
}: DatabaseBannerProps) {
  const [showErrorBanner, setShowErrorBanner] = useState<boolean>(initialHasKeys && !initialLive);

  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      try {
        const res = await fetch('/api/db-status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            // Show the "Live database unavailable" banner ONLY when keys exist and Supabase fails
            setShowErrorBanner(Boolean(data.hasKeys && !data.live));
          }
        }
      } catch {
        if (mounted) {
          setShowErrorBanner(false);
        }
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!showErrorBanner) return null;

  return (
    <div
      role="status"
      className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs px-4 py-1.5 flex items-center justify-center gap-2 transition-colors animate-fadeIn"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span className="font-medium">
        Live database unavailable, showing snapshot
      </span>
    </div>
  );
}
