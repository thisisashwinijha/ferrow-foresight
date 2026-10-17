'use client';

import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { Plant, Machine } from '@/lib/types';

interface AppShellProps {
  children: React.ReactNode;
  plants: Plant[];
  machines: Machine[];
}

export function AppShell({ children, plants, machines }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink antialiased">
      <TopBar
        plants={plants}
        machines={machines}
        onToggleSidebar={() => setMobileMenuOpen(true)}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-canvas">
          {children}
        </main>
      </div>
    </div>
  );
}
