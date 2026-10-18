'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { usePlantContext } from '@/components/PlantContext';
import { Plant, PlantStatus } from '@/lib/types';
import { getPlantsSync } from '@/lib/data/plants';

type SortField =
  | 'id'
  | 'name'
  | 'status'
  | 'machine_count'
  | 'sensor_pct'
  | 'downtime_hours_last_month'
  | 'downtime_cost_usd_last_month'
  | 'open_alerts';

export default function NetworkPage() {
  const router = useRouter();
  const { setPlantId } = usePlantContext();

  const plants = useMemo(() => getPlantsSync(), []);

  const [sortField, setSortField] = useState<SortField>('status');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 4 Hero Metrics Calculations
  const totals = useMemo(() => {
    const totalPlants = plants.length;
    const totalMachines = plants.reduce((acc, p) => acc + (p.machine_count || 0), 0);
    const totalHours = plants.reduce((acc, p) => acc + (p.downtime_hours_last_month || 0), 0);
    const totalCost = plants.reduce((acc, p) => acc + (p.downtime_cost_usd_last_month || 0), 0);
    const pilotCount = plants.filter((p) => p.status === 'pilot').length;
    const shadowCount = plants.filter((p) => p.status === 'shadow').length;
    const onboardedCount = pilotCount + shadowCount;

    return {
      totalPlants,
      totalMachines,
      totalHours: Number(totalHours.toFixed(1)),
      totalCost,
      pilotCount,
      shadowCount,
      onboardedCount,
    };
  }, [plants]);

  // Regions for filter chips
  const regionNames = useMemo(() => {
    const set = new Set<string>();
    plants.forEach((p) => {
      if (p.region) set.add(p.region);
    });
    return Array.from(set).sort();
  }, [plants]);

  // Filtered and Sorted Plants
  const filteredPlants = useMemo(() => {
    return plants
      .filter((p) => {
        if (regionFilter !== 'all' && p.region !== regionFilter) return false;
        if (
          searchQuery &&
          !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.city.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'status') {
          const priority: Record<PlantStatus, number> = {
            pilot: 1,
            shadow: 2,
            not_onboarded: 3,
          };
          const diff = priority[a.status] - priority[b.status];
          return sortAsc ? diff : -diff;
        }

        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        const numA = Number(valA || 0);
        const numB = Number(valB || 0);
        return sortAsc ? numA - numB : numB - numA;
      });
  }, [plants, sortField, sortAsc, regionFilter, searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleRowClick = (plant: Plant) => {
    if (plant.status === 'not_onboarded') return;
    setPlantId(plant.id);
    router.push(`/?plant=${plant.id}`);
  };

  const pilotPct = (totals.pilotCount / totals.totalPlants) * 100;
  const shadowPct = (totals.shadowCount / totals.totalPlants) * 100;
  const nonOnboardedPct = 100 - pilotPct - shadowPct;

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto">
      {/* 1. Header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">
          Network operations
        </h1>
        <p className="text-[13px] text-ink-muted mt-1">
          40 packaging and processing plants worldwide · USD 18,000 per hour baseline
        </p>
      </div>

      {/* 2. 4 Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Plants Onboarded */}
        <div className="bg-surface rounded-card p-4 space-y-2">
          <div className="text-xs text-ink-muted">Plants onboarded</div>
          <div className="text-3xl font-light text-ink tracking-tight tabular-nums">
            {totals.onboardedCount} of {totals.totalPlants}
          </div>
          <div className="text-xs text-ink-muted">
            {totals.pilotCount} pilot · {totals.shadowCount} shadow mode
          </div>
        </div>

        {/* Metric 2: Monitored Machines */}
        <div className="bg-surface rounded-card p-4 space-y-2">
          <div className="text-xs text-ink-muted">Machines</div>
          <div className="text-3xl font-light text-ink tracking-tight tabular-nums">
            {totals.totalMachines.toLocaleString()}
          </div>
          <div className="text-xs text-ink-muted">
            94 assets in pilot & shadow scope
          </div>
        </div>

        {/* Metric 3: Downtime Last Month */}
        <div className="bg-surface rounded-card p-4 space-y-2">
          <div className="text-xs text-ink-muted">Downtime last month</div>
          <div className="text-3xl font-light text-ink tracking-tight tabular-nums">
            {totals.totalHours} h
          </div>
          <div className="text-xs text-ink-muted">
            Unplanned network downtime
          </div>
        </div>

        {/* Metric 4: Downtime Cost */}
        <div className="bg-surface rounded-card p-4 space-y-2">
          <div className="text-xs text-ink-muted">Downtime cost</div>
          <div className="text-3xl font-light text-ink tracking-tight tabular-nums">
            ${(totals.totalCost / 1000).toFixed(0)}k
          </div>
          <div className="text-xs text-ink-muted">
            $18,000 per hour per line
          </div>
        </div>
      </div>

      {/* 3. Single Rollout Progress Bar */}
      <div className="bg-surface rounded-card p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-ink">Rollout progress</span>
          <span className="text-ink-muted">
            {totals.onboardedCount} of {totals.totalPlants} facilities onboarded (
            {Math.round((totals.onboardedCount / totals.totalPlants) * 100)}%)
          </span>
        </div>

        {/* Proportional Progress Bar */}
        <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${pilotPct}%` }}
            className="bg-ok h-full transition-all"
            title={`Pilot: ${totals.pilotCount} plant`}
          />
          <div
            style={{ width: `${shadowPct}%` }}
            className="bg-agent h-full transition-all"
            title={`Shadow: ${totals.shadowCount} plants`}
          />
          <div
            style={{ width: `${nonOnboardedPct}%` }}
            className="bg-surface-2 h-full opacity-60"
            title={`Not onboarded: ${totals.totalPlants - totals.onboardedCount} plants`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-ink-muted pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ok" />
            <span>Pilot ({totals.pilotCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-agent" />
            <span>Shadow mode ({totals.shadowCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-surface-2 border border-line/40" />
            <span>Not onboarded ({totals.totalPlants - totals.onboardedCount})</span>
          </span>
        </div>
      </div>

      {/* 4. Table Controls & Region Filter Chips */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Region Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setRegionFilter('all')}
              className={`px-3 py-1 rounded-chip text-xs font-medium transition-all ${
                regionFilter === 'all'
                  ? 'bg-surface text-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              All regions
            </button>
            {regionNames.map((r) => (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`px-3 py-1 rounded-chip text-xs font-medium transition-all ${
                  regionFilter === r
                    ? 'bg-surface text-ink font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Quick search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search plant or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-surface-2/60 rounded-btn text-ink outline-none w-52 placeholder:text-ink-muted focus:bg-surface border border-transparent focus:border-line/30 transition-all"
            />
          </div>
        </div>

        {/* Clean Plant Table */}
        <div className="bg-surface rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line/20 text-ink-muted text-[12px] font-medium select-none">
                  <th
                    onClick={() => handleSort('id')}
                    className="px-4 py-3 cursor-pointer hover:text-ink font-medium"
                  >
                    <div className="flex items-center gap-1">
                      <span>Plant</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-4 py-3 cursor-pointer hover:text-ink"
                  >
                    <div className="flex items-center gap-1">
                      <span>Location</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-4 py-3 cursor-pointer hover:text-ink"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('machine_count')}
                    className="px-4 py-3 text-right cursor-pointer hover:text-ink"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Machines</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('sensor_pct')}
                    className="px-4 py-3 text-right cursor-pointer hover:text-ink"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Sensors</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('downtime_hours_last_month')}
                    className="px-4 py-3 text-right cursor-pointer hover:text-ink"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Downtime</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('downtime_cost_usd_last_month')}
                    className="px-4 py-3 text-right cursor-pointer hover:text-ink"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Cost</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/15">
                {filteredPlants.map((plant) => {
                  const isOnboarded =
                    plant.status === 'pilot' || plant.status === 'shadow';

                  return (
                    <tr
                      key={plant.id}
                      onClick={() => handleRowClick(plant)}
                      className={`group transition-colors ${
                        isOnboarded
                          ? 'hover:bg-surface-2/40 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed select-none'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-ink">
                        {plant.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{plant.name}</div>
                        <div className="text-[11px] text-ink-muted">
                          {plant.city}, {plant.country}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {plant.status === 'pilot' && (
                          <span className="inline-block px-2 py-0.5 rounded-chip text-[11px] font-medium bg-ok/10 text-ok">
                            Pilot
                          </span>
                        )}
                        {plant.status === 'shadow' && (
                          <span className="inline-block px-2 py-0.5 rounded-chip text-[11px] font-medium bg-ink/10 text-ink-muted">
                            Shadow mode
                          </span>
                        )}
                        {plant.status === 'not_onboarded' && (
                          <span className="inline-block px-2 py-0.5 rounded-chip text-[11px] text-ink-muted bg-surface-2/60">
                            Not onboarded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        {plant.machine_count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        {plant.sensor_pct.toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        {plant.downtime_hours_last_month.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        ${plant.downtime_cost_usd_last_month.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isOnboarded ? (
                          <ChevronRight className="w-4 h-4 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity inline" />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
