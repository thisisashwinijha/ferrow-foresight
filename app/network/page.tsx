'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Cpu,
  Clock,
  DollarSign,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  Shield,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { usePlantContext } from '@/components/PlantContext';
import { Plant, PlantStatus } from '@/lib/types';
import { getPlants } from '@/lib/data/plants';

type SortField = 'id' | 'name' | 'status' | 'machine_count' | 'sensor_pct' | 'downtime_hours_last_month' | 'downtime_cost_usd_last_month' | 'open_alerts';

export default function NetworkPage() {
  const router = useRouter();
  const { setPlantId } = usePlantContext();

  const plants = useMemo(() => getPlants(), []);

  const [sortField, setSortField] = useState<SortField>('status');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Network Totals Calculations
  const totals = useMemo(() => {
    const totalPlants = plants.length;
    const totalMachines = plants.reduce((acc, p) => acc + (p.machine_count || 0), 0);
    const totalHours = plants.reduce((acc, p) => acc + (p.downtime_hours_last_month || 0), 0);
    const totalCost = plants.reduce((acc, p) => acc + (p.downtime_cost_usd_last_month || 0), 0);
    const totalAlerts = plants.reduce((acc, p) => acc + (p.open_alerts || 0), 0);
    const avgSensor =
      plants.length > 0
        ? Math.round(plants.reduce((acc, p) => acc + (p.sensor_pct || 0), 0) / plants.length)
        : 0;

    const pilotCount = plants.filter((p) => p.status === 'pilot').length;
    const shadowCount = plants.filter((p) => p.status === 'shadow').length;
    const onboardedCount = pilotCount + shadowCount;

    return {
      totalPlants,
      totalMachines,
      totalHours: Number(totalHours.toFixed(1)),
      totalCost,
      totalAlerts,
      avgSensor,
      pilotCount,
      shadowCount,
      onboardedCount,
    };
  }, [plants]);

  // Regions summary
  const regions = useMemo(() => {
    const map: Record<string, { count: number; machines: number; hours: number; onboarded: number }> = {};
    plants.forEach((p) => {
      const reg = p.region || 'Other';
      if (!map[reg]) {
        map[reg] = { count: 0, machines: 0, hours: 0, onboarded: 0 };
      }
      map[reg].count += 1;
      map[reg].machines += p.machine_count || 0;
      map[reg].hours += p.downtime_hours_last_month || 0;
      if (p.status === 'pilot' || p.status === 'shadow') {
        map[reg].onboarded += 1;
      }
    });
    return map;
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
        // Status sort priority: pilot first, then shadow, then not_onboarded
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

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-ink">Network Health &amp; Rollout</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-2 text-ink-muted border border-line">
              40 plants
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Global overview across 40 packaging and processing facilities. USD 18,000/hr downtime baseline.
          </p>
        </div>

        {/* Status Legend */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded-panel border border-line">
            <span className="w-2 h-2 rounded-full bg-ok" />
            <span className="font-medium text-ink">Pilot ({totals.pilotCount})</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded-panel border border-line">
            <span className="w-2 h-2 rounded-full bg-ink-muted" />
            <span className="font-medium text-ink">Shadow ({totals.shadowCount})</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded-panel border border-line text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-line" />
            <span>Not onboarded ({totals.totalPlants - totals.onboardedCount})</span>
          </div>
        </div>
      </div>

      {/* Network Totals Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface border border-line p-3 rounded-panel">
          <div className="text-[11px] text-ink-muted flex items-center justify-between">
            <span>Plants</span>
            <Building2 className="w-3.5 h-3.5 text-ink-muted" />
          </div>
          <div className="text-xl font-bold font-mono text-ink mt-1">
            {totals.totalPlants}
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">
            {totals.onboardedCount} active in scope
          </div>
        </div>

        <div className="bg-surface border border-line p-3 rounded-panel">
          <div className="text-[11px] text-ink-muted flex items-center justify-between">
            <span>Machines</span>
            <Layers className="w-3.5 h-3.5 text-ink-muted" />
          </div>
          <div className="text-xl font-bold font-mono text-ink mt-1">
            {totals.totalMachines.toLocaleString()}
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">
            94 onboarded assets
          </div>
        </div>

        <div className="bg-surface border border-line p-3 rounded-panel">
          <div className="text-[11px] text-ink-muted flex items-center justify-between">
            <span>Sensor Coverage</span>
            <Cpu className="w-3.5 h-3.5 text-ink-muted" />
          </div>
          <div className="text-xl font-bold font-mono text-ink mt-1">
            {totals.avgSensor}%
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">
            Network average
          </div>
        </div>

        <div className="bg-surface border border-line p-3 rounded-panel">
          <div className="text-[11px] text-ink-muted flex items-center justify-between">
            <span>Unplanned Downtime</span>
            <Clock className="w-3.5 h-3.5 text-ink-muted" />
          </div>
          <div className="text-xl font-bold font-mono text-ink mt-1">
            {totals.totalHours} h
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">
            Last month total
          </div>
        </div>

        <div className="bg-surface border border-line p-3 rounded-panel">
          <div className="text-[11px] text-ink-muted flex items-center justify-between">
            <span>Downtime Cost</span>
            <DollarSign className="w-3.5 h-3.5 text-ink-muted" />
          </div>
          <div className="text-xl font-bold font-mono text-ink mt-1">
            ${(totals.totalCost / 1000).toFixed(0)}k
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">
            $18,000 / hr / line
          </div>
        </div>

        <div className="bg-surface border border-line p-3 rounded-panel">
          <div className="text-[11px] text-ink-muted flex items-center justify-between">
            <span>Open Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-critical" />
          </div>
          <div className="text-xl font-bold font-mono text-critical mt-1">
            {totals.totalAlerts}
          </div>
          <div className="text-[10px] text-ink-muted mt-0.5">
            5 pilot · 6 shadow
          </div>
        </div>
      </div>

      {/* Regional Rollout Status */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-ink uppercase tracking-wider">
          Rollout Status by Region
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(regions).map(([regionName, stat]) => (
            <div
              key={regionName}
              onClick={() => setRegionFilter(regionFilter === regionName ? 'all' : regionName)}
              className={`p-3 rounded-panel border transition-all cursor-pointer ${
                regionFilter === regionName
                  ? 'bg-surface border-ink shadow-sm'
                  : 'bg-surface-2 border-line hover:border-ink-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">{regionName}</span>
                <span className="text-[10px] font-mono text-ink-muted">
                  {stat.count} plants
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-ink-muted">Onboarded:</span>
                <span className="font-bold text-ink">
                  {stat.onboarded} / {stat.count}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-mono">
                <span className="text-ink-muted">Machines:</span>
                <span className="text-ink">{stat.machines.toLocaleString()}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-mono">
                <span className="text-ink-muted">Downtime:</span>
                <span className="text-ink">{stat.hours.toFixed(1)} h</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plants Master Table */}
      <div className="bg-surface border border-line rounded-panel overflow-hidden">
        {/* Table Controls */}
        <div className="p-3 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-2/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink">Plant Directory</span>
            <span className="text-xs text-ink-muted">
              ({filteredPlants.length} displayed)
            </span>
            {regionFilter !== 'all' && (
              <button
                onClick={() => setRegionFilter('all')}
                className="text-[10px] text-ink-muted hover:text-ink underline ml-1"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by name, ID or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1 text-xs bg-surface border border-line rounded-btn text-ink outline-none w-48 sm:w-64 placeholder:text-ink-muted"
            />
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-line text-ink-muted font-medium select-none text-[11px]">
                <th
                  onClick={() => handleSort('id')}
                  className="px-3 py-2 cursor-pointer hover:text-ink font-semibold"
                >
                  <div className="flex items-center gap-1">
                    <span>Plant</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-3 py-2 cursor-pointer hover:text-ink"
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3 py-2 cursor-pointer hover:text-ink"
                >
                  <div className="flex items-center gap-1">
                    <span>Rollout Status</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('machine_count')}
                  className="px-3 py-2 text-right cursor-pointer hover:text-ink font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Machines</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sensor_pct')}
                  className="px-3 py-2 text-right cursor-pointer hover:text-ink font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Sensor %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('downtime_hours_last_month')}
                  className="px-3 py-2 text-right cursor-pointer hover:text-ink font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Downtime (h)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('downtime_cost_usd_last_month')}
                  className="px-3 py-2 text-right cursor-pointer hover:text-ink font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cost ($)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('open_alerts')}
                  className="px-3 py-2 text-right cursor-pointer hover:text-ink font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Alerts</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {filteredPlants.map((plant) => {
                const isOnboarded = plant.status === 'pilot' || plant.status === 'shadow';

                return (
                  <tr
                    key={plant.id}
                    onClick={() => handleRowClick(plant)}
                    className={`transition-colors ${
                      isOnboarded
                        ? 'hover:bg-surface-2 cursor-pointer font-medium'
                        : 'text-ink-muted/70 bg-surface/30 cursor-not-allowed select-none'
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-ink">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{plant.id}</span>
                        {plant.status === 'pilot' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-ink">{plant.name}</div>
                      <div className="text-[11px] text-ink-muted">
                        {plant.city}, {plant.country} · {plant.region}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {plant.status === 'pilot' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-ok/20 text-ok border border-ok/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Pilot (Live)
                        </span>
                      )}
                      {plant.status === 'shadow' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-ink/10 text-ink border border-line">
                          <Shield className="w-3 h-3 text-ink-muted" />
                          Shadow mode
                        </span>
                      )}
                      {plant.status === 'not_onboarded' && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-ink-muted/60 bg-surface-2">
                          Not onboarded
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      <span>{plant.machine_count}</span>
                      {isOnboarded && (
                        <span className="text-[10px] text-ink-muted ml-1">
                          ({plant.onboarded_machines})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {plant.sensor_pct.toFixed(0)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {plant.downtime_hours_last_month.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      ${plant.downtime_cost_usd_last_month.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {plant.open_alerts > 0 ? (
                        <span className="px-1.5 py-0.5 bg-critical/20 text-critical font-bold rounded">
                          {plant.open_alerts}
                        </span>
                      ) : (
                        <span className="text-ink-muted">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isOnboarded ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(plant);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-btn bg-surface hover:bg-surface-2 text-ink border border-line text-[11px] font-medium"
                        >
                          <span>Control Room</span>
                          <ExternalLink className="w-3 h-3 text-ink-muted" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink-muted/50 italic">
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
