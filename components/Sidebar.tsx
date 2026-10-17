'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe,
  SlidersHorizontal,
  ClipboardList,
  Smartphone,
  CalendarDays,
  Factory,
  Boxes,
  BarChart3,
  Users,
  Bot,
  Info,
  X,
} from 'lucide-react';
import { usePlantContext } from './PlantContext';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Operate',
    items: [
      { name: 'Network', href: '/network', icon: Globe },
      { name: 'Control Room', href: '/', icon: SlidersHorizontal },
      { name: 'Work orders', href: '/work-orders', icon: ClipboardList },
      { name: 'Capture', href: '/capture', icon: Smartphone },
    ],
  },
  {
    group: 'Plan',
    items: [
      { name: 'Planning', href: '/planning', icon: CalendarDays },
      { name: 'Production', href: '/production', icon: Factory },
      { name: 'Spares', href: '/spares', icon: Boxes },
    ],
  },
  {
    group: 'Improve',
    items: [
      { name: 'KPIs', href: '/kpis', icon: BarChart3 },
      { name: 'People', href: '/people', icon: Users },
      { name: 'Agent console', href: '/agent', icon: Bot },
    ],
  },
  {
    group: 'System',
    items: [{ name: 'About', href: '/about', icon: Info }],
  },
];

export function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { plantId, lineId } = usePlantContext();

  const queryParams = new URLSearchParams();
  if (plantId && plantId !== 'all') queryParams.set('plant', plantId);
  if (lineId && lineId !== 'all') queryParams.set('line', lineId);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const renderNavGroup = (group: NavGroup, isMobile = false) => (
    <div key={group.group} className="mb-4">
      <div className={`px-3 mb-1 text-[10px] uppercase font-bold text-ink-muted tracking-wider ${isMobile ? '' : 'hidden lg:block'}`}>
        {group.group}
      </div>
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={`${item.href}${queryString}`}
              onClick={() => {
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              title={item.name}
              className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-btn transition-colors ${
                isActive
                  ? 'bg-surface font-semibold text-ink border-l-2 border-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-surface/50'
              } ${isMobile ? '' : 'justify-center lg:justify-start'}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={`truncate ${isMobile ? 'inline' : 'hidden lg:inline'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col border-r border-line bg-surface-2 shrink-0 transition-all duration-200 md:w-14 lg:w-52 select-none h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto p-2">
        {/* Brand / Logo */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 mb-3 border-b border-line/60">
          <div className="w-2.5 h-2.5 rounded-sm bg-ink" />
          <span className="font-semibold text-sm tracking-tight text-ink">
            FERROW <span className="font-normal text-ink-muted">FORESIGHT</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_GROUPS.map((g) => renderNavGroup(g, false))}
        </nav>
      </aside>

      {/* Mobile Drawer (Phone screen) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-ink/50 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 bg-surface-2 h-full z-10 flex flex-col p-3 shadow-2xl border-r border-line">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-ink" />
                <span className="font-semibold text-xs tracking-tight text-ink">
                  FERROW <span className="font-normal text-ink-muted">FORESIGHT</span>
                </span>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-btn hover:bg-surface text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              {NAV_GROUPS.map((g) => renderNavGroup(g, true))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
