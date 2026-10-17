'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun,
  Moon,
  RotateCcw,
  Search,
  ChevronDown,
  Menu,
  ShieldCheck,
  Building2,
  UserCheck,
} from 'lucide-react';
import { usePlantContext, UserRole } from './PlantContext';
import { useTheme } from './ThemeProvider';
import { useToast } from './ToastContext';
import { LiveClock } from './LiveClock';
import { PLANT_TIMEZONES } from '@/lib/data/plants';
import { MachineSearch } from './MachineSearch';
import { Machine, Plant } from '@/lib/types';

interface TopBarProps {
  plants: Plant[];
  machines: Machine[];
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

export function TopBar({ plants, machines, onToggleSidebar }: TopBarProps) {
  const router = useRouter();
  const { plantId, setPlantId, role, setRole, lineId } = usePlantContext();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlantDropdownOpen, setIsPlantDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const selectedPlant = plants.find((p) => p.id === plantId);
  const activeTz = PLANT_TIMEZONES[plantId] || 'UTC';

  const handleResetDemo = () => {
    showToast('Demo state restored to seed baseline', 'info');
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

  // Onboarded plants first
  const onboarded = plants.filter((p) => p.status !== 'not_onboarded');
  const notOnboarded = plants.filter((p) => p.status === 'not_onboarded');

  return (
    <>
      <header className="h-14 border-b border-line bg-surface px-3 md:px-4 flex items-center justify-between gap-2 z-30 sticky top-0">
        {/* Left Section: Mobile toggle, Plant selector, Live clock */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 rounded-btn hover:bg-surface-2 text-ink border border-line"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Plant Selector */}
          <div className="relative">
            <button
              onClick={() => setIsPlantDropdownOpen(!isPlantDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-btn bg-surface-2 hover:bg-line/30 border border-line text-xs font-medium text-ink transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-ink-muted" />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{selectedPlant?.id || plantId}</span>
                <span className="hidden sm:inline text-ink-muted">·</span>
                <span className="hidden sm:inline truncate max-w-[140px]">
                  {selectedPlant?.name.replace('Ferrow ', '') || 'Network'}
                </span>
                {selectedPlant?.status === 'pilot' && (
                  <span className="px-1.5 py-0.2 bg-ok/20 text-ok text-[10px] font-mono font-bold rounded">
                    Pilot
                  </span>
                )}
                {selectedPlant?.status === 'shadow' && (
                  <span className="px-1.5 py-0.2 bg-ink/10 text-ink-muted text-[10px] font-mono font-bold rounded">
                    Shadow
                  </span>
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-ink-muted ml-0.5" />
            </button>

            {isPlantDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsPlantDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1 w-64 bg-surface border border-line rounded-panel shadow-xl z-50 max-h-96 overflow-y-auto divide-y divide-line/40 py-1">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                    Onboarded Plants
                  </div>
                  <button
                    onClick={() => handleSelectPlant('all', 'all')}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-2"
                  >
                    <span className="font-medium text-ink">All plants (Network)</span>
                    <span className="text-[10px] font-mono text-ink-muted">40 plants</span>
                  </button>
                  {onboarded.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPlant(p.id, p.status)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-2 ${
                        p.id === plantId ? 'bg-surface-2 font-semibold' : ''
                      }`}
                    >
                      <div>
                        <span className="font-mono">{p.id}</span>
                        <span className="mx-1 text-ink-muted">·</span>
                        <span>{p.city}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          p.status === 'pilot'
                            ? 'bg-ok/20 text-ok'
                            : 'bg-ink/10 text-ink-muted'
                        }`}
                      >
                        {p.status}
                      </span>
                    </button>
                  ))}

                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-ink-muted tracking-wider bg-surface-2/40">
                    Not Onboarded ({notOnboarded.length} plants)
                  </div>
                  {notOnboarded.map((p) => (
                    <div
                      key={p.id}
                      className="px-3 py-1.5 text-xs flex items-center justify-between text-ink-muted/50 cursor-not-allowed select-none"
                    >
                      <span>
                        {p.id} · {p.city}
                      </span>
                      <span className="text-[10px] font-mono">Not onboarded</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Live Clock with selected plant's timezone */}
          <div className="hidden lg:flex items-center pl-2 border-l border-line">
            <LiveClock timeZone={activeTz} />
          </div>
        </div>

        {/* Center / Right Section */}
        <div className="flex items-center gap-2">
          {/* Machine Search (Cmd+K) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-btn bg-surface-2 hover:bg-line/40 border border-line text-xs text-ink-muted transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search machines</span>
            <kbd className="hidden sm:inline px-1 bg-surface border border-line rounded text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-surface-2 hover:bg-line/30 border border-line text-xs font-medium text-ink transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-ink-muted" />
              <span className="hidden xl:inline truncate max-w-[130px]">{role}</span>
              <span className="xl:hidden truncate max-w-[90px]">Role</span>
              <ChevronDown className="w-3 h-3 text-ink-muted" />
            </button>

            {isRoleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsRoleDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-56 bg-surface border border-line rounded-panel shadow-xl z-50 divide-y divide-line/40 py-1">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                    Switch Role (MVP View)
                  </div>
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        setRole(r);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-2 flex items-center justify-between ${
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

          {/* Demo Mode Badge */}
          <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-surface-2 rounded-btn border border-line text-[11px] font-mono font-semibold text-ink-muted">
            <ShieldCheck className="w-3 h-3 text-agent" />
            <span>DEMO MODE</span>
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={handleResetDemo}
            title="Reset demo data"
            className="p-1.5 rounded-btn bg-surface-2 hover:bg-line/40 border border-line text-ink-muted hover:text-ink transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Theme Toggle (Day shift / Night shift) */}
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Night shift' : 'Switch to Day shift'}
            className="p-1.5 rounded-btn bg-surface-2 hover:bg-line/40 border border-line text-ink-muted hover:text-ink transition-colors"
          >
            {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
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
