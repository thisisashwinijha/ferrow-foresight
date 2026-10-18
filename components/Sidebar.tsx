'use client';

import React, { useState } from 'react';
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
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
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
      { name: 'Control room', href: '/', icon: SlidersHorizontal },
      { name: 'Network', href: '/network', icon: Globe },
      { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
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
  const [isExpanded, setIsExpanded] = useState(false);

  const queryParams = new URLSearchParams();
  if (plantId && plantId !== 'all') queryParams.set('plant', plantId);
  if (lineId && lineId !== 'all') queryParams.set('line', lineId);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return (
    <>
      {/* Desktop Slim Icon Rail (64px) expandable on toggle */}
      <aside
        className={`hidden md:flex flex-col bg-surface-2/40 shrink-0 transition-all duration-200 select-none h-[calc(100vh-3.5rem)] sticky top-14 py-4 px-2.5 z-20 ${
          isExpanded ? 'w-56 shadow-xl' : 'w-16 items-center'
        }`}
      >
        {/* Toggle Expand / Collapse */}
        <div className={`mb-4 flex items-center ${isExpanded ? 'justify-between px-2' : 'justify-center'}`}>
          {isExpanded && (
            <span className="text-xs font-semibold text-ink tracking-tight">Navigation</span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse rail' : 'Expand navigation'}
            className="p-1.5 rounded-btn hover:bg-surface text-ink-muted hover:text-ink transition-colors"
          >
            {isExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-4 w-full">
          {NAV_GROUPS.map((group) => (
            <div key={group.group} className="space-y-1">
              {isExpanded && (
                <div className="px-2 mb-1 text-[11px] font-medium text-ink-muted">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <div key={item.href} className="relative group/tooltip">
                    <Link
                      href={`${item.href}${queryString}`}
                      className={`flex items-center gap-3 px-2.5 py-2 text-xs rounded-btn transition-colors relative ${
                        isActive
                          ? 'bg-surface text-ink font-semibold shadow-xs'
                          : 'text-ink-muted hover:text-ink hover:bg-surface/50'
                      } ${isExpanded ? 'justify-start' : 'justify-center'}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {isExpanded && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>

                    {/* Tooltip in collapsed state */}
                    {!isExpanded && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-surface border border-line shadow-md text-xs font-medium text-ink whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-50">
                        {item.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile Drawer (Phone screen) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 bg-surface h-full z-10 flex flex-col p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-line/40">
              <span className="font-semibold text-sm text-ink">Menu</span>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-btn hover:bg-surface-2 text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.group} className="space-y-1">
                  <div className="px-2 text-[11px] font-medium text-ink-muted">
                    {group.group}
                  </div>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={`${item.href}${queryString}`}
                        onClick={onCloseMobile}
                        className={`flex items-center gap-3 px-3 py-2 text-xs rounded-btn transition-colors ${
                          isActive
                            ? 'bg-surface-2 text-ink font-semibold'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
