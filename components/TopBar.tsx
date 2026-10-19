'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  Search,
  ChevronDown,
  Menu,
  Building2,
  UserCheck,
} from 'lucide-react';
import { usePlantContext, UserRole } from './PlantContext';
import { useToast } from './ToastContext';
import { LiveClock } from './LiveClock';
import { PLANT_TIMEZONES } from '@/lib/data/plants';
import { MachineSearch } from './MachineSearch';
import { Machine, Plant } from '@/lib/types';

interface TopBarProps {
  plants: Plant[];
  machines: Machine[];
  initialHasKeys?: boolean;
  initialLive?: boolean;
  onToggleSidebar?: () => void;
}

const ROLES: UserRole[] = [
  'Head of Plant Operations',
  'Plant Head',
  'Maintenance Planner',
  'Technician',
  'Production Manager',
  'Stores In-charge',
  'Training Coordinator',
];

export function TopBar({
  plants,
  machines,
  initialHasKeys = false,
  initialLive = false,
  onToggleSidebar,
}: TopBarProps) {
  const router = useRouter();
  const { plantId, setPlantId, role, setRole, lineId } = usePlantContext();
  const { showToast } = useToast();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlantDropdownOpen, setIsPlantDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ hasKeys: boolean; live: boolean; loaded: boolean }>({
    hasKeys: initialHasKeys,
    live: initialLive,
    loaded: true,
  });

  useEffect(() => {
    let mounted = true;
    async function checkDb() {
      try {
        const res = await fetch('/api/db-status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setDbStatus({ hasKeys: Boolean(data.hasKeys), live: Boolean(data.live), loaded: true });
          }
        }
      } catch {
        if (mounted) {
          setDbStatus({ hasKeys: false, live: false, loaded: true });
        }
      }
    }
    checkDb();
    const interval = setInterval(checkDb, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const selectedPlant = plants.find((p) => p.id === plantId);
  const activeTz = PLANT_TIMEZONES[plantId] || 'UTC';

  const handleResetDemo = async () => {
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (res.ok) {
        showToast('Demo state restored to seed baseline', 'info');
        router.refresh();
      } else {
        showToast('Failed to reset demo state', 'warning');
      }
    } catch {
      showToast('Error resetting demo state', 'warning');
    }
  };

  const handleSelectPlant = (pId: string, status: string) => {
    if (status === 'not_onboarded') return;
    setIsPlantDropdownOpen(false);
    if (pId === 'all') {
      router.push(`/network?plant=all&line=${lineId}`);
    } else {
      setPlantId(pId);
    }
  };

  const onboarded = plants.filter((p) => p.status !== 'not_onboarded');
  const notOnboarded = plants.filter((p) => p.status === 'not_onboarded');

  return (
    <>
      <header className="h-14 border-b border-line/30 bg-surface/70 backdrop-blur-md px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 z-30 sticky top-0">
        {/* Left: Mobile hamburger + Plant Selector */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-btn hover:bg-surface-2 text-ink shrink-0"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Plant Switcher */}
          <div className="relative min-w-0">
            <button
              onClick={() => setIsPlantDropdownOpen(!isPlantDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-btn hover:bg-surface-2 text-xs font-medium text-ink transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <span className="font-semibold shrink-0">{selectedPlant?.id || plantId}</span>
              <span className="hidden sm:inline text-ink-muted">·</span>
              <span className="hidden sm:inline truncate max-w-[130px]">
                {selectedPlant?.city || 'Network'}
              </span>
              {selectedPlant?.status === 'pilot' && (
                <span className="px-1.5 py-0.5 bg-ok/10 text-ok text-[11px] font-medium rounded-chip shrink-0">
                  Pilot
                </span>
              )}
              {selectedPlant?.status === 'shadow' && (
                <span className="px-1.5 py-0.5 bg-ink/10 text-ink-muted text-[11px] font-medium rounded-chip shrink-0">
                  Shadow
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-ink-muted ml-0.5 opacity-60 shrink-0" />
            </button>

            {isPlantDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsPlantDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-64 bg-surface border border-line/40 rounded-card shadow-2xl z-50 max-h-96 overflow-y-auto p-1.5">
                  <div className="px-2.5 py-1 text-[11px] font-medium text-ink-muted">
                    Onboarded plants
                  </div>
                  <button
                    onClick={() => handleSelectPlant('all', 'all')}
                    className="w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between rounded-btn hover:bg-surface-2"
                  >
                    <span className="font-medium text-ink">All plants (Network)</span>
                    <span className="text-[11px] text-ink-muted">40 plants</span>
                  </button>
                  {onboarded.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPlant(p.id, p.status)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between rounded-btn hover:bg-surface-2 ${
                        p.id === plantId ? 'bg-surface-2 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono">{p.id}</span>
                        <span className="text-ink-muted">·</span>
                        <span>{p.city}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded-chip text-[11px] font-medium ${
                          p.status === 'pilot'
                            ? 'bg-ok/10 text-ok'
                            : 'bg-ink/10 text-ink-muted'
                        }`}
                      >
                        {p.status === 'pilot' ? 'Pilot' : 'Shadow'}
                      </span>
                    </button>
                  ))}

                  <div className="px-2.5 py-1 mt-2 text-[11px] font-medium text-ink-muted">
                    Not onboarded ({notOnboarded.length} plants)
                  </div>
                  {notOnboarded.map((p) => (
                    <div
                      key={p.id}
                      className="px-2.5 py-1 text-xs flex items-center justify-between text-ink-muted/40 cursor-not-allowed select-none"
                    >
                      <span>
                        {p.id} · {p.city}
                      </span>
                      <span className="text-[10px]">Not onboarded</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Command Search (Cmd+K) Linear-style */}
        <div className="hidden sm:flex flex-1 max-w-sm justify-center">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-between w-full px-3 py-1.5 rounded-btn bg-surface-2/50 hover:bg-surface-2 text-xs text-ink-muted transition-colors border border-transparent hover:border-line/30"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 opacity-60" />
              <span>Search machines or alerts...</span>
            </div>
            <kbd className="px-1.5 py-0.5 bg-surface text-ink-muted border border-line/40 rounded text-[10px] font-mono shadow-xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Live Clock, Role, Demo badge, Theme toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Clock with Local Plant Time */}
          <div className="hidden lg:flex items-center mr-2">
            <LiveClock timeZone={activeTz} />
          </div>

          {/* Role Switcher */}
          <div className="relative">
            <button
              data-testid="role-switcher-button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-btn hover:bg-surface-2 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 opacity-70" />
              <span className="hidden xl:inline truncate max-w-[120px]">{role}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isRoleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsRoleDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-52 bg-surface border border-line/40 rounded-card shadow-2xl z-50 p-1.5">
                  <div className="px-2.5 py-1 text-[11px] font-medium text-ink-muted">
                    Switch role
                  </div>
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      data-testid={`role-option-${r.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        setRole(r);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-btn hover:bg-surface-2 flex items-center justify-between ${
                        r === role ? 'font-semibold text-ink bg-surface-2' : 'text-ink-muted'
                      }`}
                    >
                      <span>{r}</span>
                      {r === role && <span className="w-1.5 h-1.5 rounded-full bg-ink" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Data Source Indicator: Data: Live vs Data: Demo */}
          {dbStatus.live ? (
            <div
              title="Connected to Supabase live database"
              className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-emerald-500/10 text-emerald-700 text-[11px] font-medium border border-emerald-500/20"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Data: Live
            </div>
          ) : (
            <div
              title={dbStatus.hasKeys ? 'Live database unavailable, showing snapshot' : 'Running on local seed demo dataset'}
              className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-surface-2 text-ink-muted text-[11px] font-medium border border-line/40"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted/50" />
              {dbStatus.hasKeys ? 'Data: Demo' : 'Demo data'}
            </div>
          )}

          {/* Reset Demo Button */}
          <button
            data-testid="reset-demo-button"
            onClick={handleResetDemo}
            title="Reset demo baseline"
            aria-label="Reset demo baseline"
            className="p-1.5 rounded-btn hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Machine Search Modal */}
      <MachineSearch
        machines={machines}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
