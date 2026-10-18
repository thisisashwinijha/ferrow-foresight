'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Spares,
  WorkOrder,
  Machine,
  Plant,
} from '@/lib/types';
import { usePlantContext } from './PlantContext';
import { useToast } from './ToastContext';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  Mail,
  ArrowRight,
  TrendingDown,
  Layers,
  Wrench,
  Check,
  ExternalLink,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface SparesReadinessViewProps {
  initialSpares: Spares[];
  workOrders: WorkOrder[];
  machines: Machine[];
  plant?: Plant;
}

export function SparesReadinessView({
  initialSpares,
  workOrders,
  machines,
  plant,
}: SparesReadinessViewProps) {
  const { plantId } = usePlantContext();
  const { showToast } = useToast();

  const [spares] = useState<Spares[]>(initialSpares);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'below_min' | 'stockout'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false);

  // Purchase Request Modal State
  const [selectedPartForRequest, setSelectedPartForRequest] = useState<Spares | null>(null);
  const [requestQty, setRequestQty] = useState<number>(1);
  const [requestReason, setRequestReason] = useState<string>('');

  // Machine lookup map
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach((m) => map.set(m.id, m));
    return map;
  }, [machines]);

  // Aggregate reserved quantities from active work orders
  const activeWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => wo.status !== 'closed');
  }, [workOrders]);

  const activeReservationsMap = useMemo(() => {
    const map = new Map<string, number>();
    activeWorkOrders.forEach((wo) => {
      if (Array.isArray(wo.spares_reserved)) {
        wo.spares_reserved.forEach((item: any) => {
          if (item?.part_id) {
            const current = map.get(item.part_id) || 0;
            map.set(item.part_id, current + (item.qty || 1));
          }
        });
      }
    });
    return map;
  }, [activeWorkOrders]);

  // Enriched spares data with calculated available and status
  const enrichedSpares = useMemo(() => {
    return spares.map((s) => {
      // Check reservations from active work orders as well as seed reserved count
      const activeReserved =
        activeReservationsMap.get(s.part_no) ||
        activeReservationsMap.get(s.id) ||
        0;
      const effectiveReserved = Math.max(s.reserved || 0, activeReserved);
      const available = Math.max(0, s.stock - effectiveReserved);

      let status: 'ok' | 'below_min' | 'stockout' = 'ok';
      if (s.stock <= 0 || available <= 0) {
        status = 'stockout';
      } else if (available < s.min_level || s.stock < s.min_level) {
        status = 'below_min';
      }

      return {
        ...s,
        effectiveReserved,
        available,
        status,
      };
    });
  }, [spares, activeReservationsMap]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    spares.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [spares]);

  // Filtered spares for table
  const filteredSpares = useMemo(() => {
    return enrichedSpares.filter((part) => {
      if (statusFilter !== 'all' && part.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && part.category !== categoryFilter) return false;
      if (criticalOnly && !part.critical) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = part.name.toLowerCase().includes(q);
        const matchesNo = part.part_no.toLowerCase().includes(q);
        const matchesCategory = part.category.toLowerCase().includes(q);
        if (!matchesName && !matchesNo && !matchesCategory) return false;
      }
      return true;
    });
  }, [enrichedSpares, statusFilter, categoryFilter, criticalOnly, searchQuery]);

  // Callouts: Stockouts and Below-min
  const stockoutParts = useMemo(() => {
    return enrichedSpares.filter((p) => p.status === 'stockout');
  }, [enrichedSpares]);

  const belowMinParts = useMemo(() => {
    return enrichedSpares.filter((p) => p.status === 'below_min');
  }, [enrichedSpares]);

  // Upcoming work orders readiness calculations
  const workOrderReadiness = useMemo(() => {
    return activeWorkOrders.map((wo) => {
      const reservedItems: Array<{ part_id: string; qty: number }> =
        Array.isArray(wo.spares_reserved) ? wo.spares_reserved : [];

      if (reservedItems.length === 0) {
        return {
          workOrder: wo,
          machine: machineMap.get(wo.machine_id),
          totalParts: 0,
          readyParts: 0,
          readinessPct: 100,
          status: 'ready' as const,
          itemsDetail: [],
        };
      }

      const itemsDetail = reservedItems.map((item) => {
        const part = enrichedSpares.find(
          (s) => s.part_no === item.part_id || s.id === item.part_id
        );
        const available = part ? part.available : 0;
        const isAvailable = available >= item.qty;
        return {
          part_id: item.part_id,
          name: part?.name || item.part_id,
          requiredQty: item.qty,
          availableQty: available,
          isAvailable,
          part,
        };
      });

      const readyParts = itemsDetail.filter((i) => i.isAvailable).length;
      const readinessPct = Math.round((readyParts / itemsDetail.length) * 100);

      const status =
        readinessPct === 100
          ? ('ready' as const)
          : readinessPct === 0
          ? ('blocked' as const)
          : ('shortage' as const);

      return {
        workOrder: wo,
        machine: machineMap.get(wo.machine_id),
        totalParts: itemsDetail.length,
        readyParts,
        readinessPct,
        status,
        itemsDetail,
      };
    });
  }, [activeWorkOrders, enrichedSpares, machineMap]);

  // Overall statistics
  const totalStockCount = spares.length;
  const criticalCount = spares.filter((s) => s.critical).length;
  const avgReadiness = useMemo(() => {
    if (workOrderReadiness.length === 0) return 100;
    const sum = workOrderReadiness.reduce((acc, curr) => acc + curr.readinessPct, 0);
    return Math.round(sum / workOrderReadiness.length);
  }, [workOrderReadiness]);

  // Open modal with smart pre-filled values
  const handleOpenPurchaseRequest = (part: Spares) => {
    setSelectedPartForRequest(part);
    const suggested = Math.max(part.min_level * 2 - Math.max(0, part.stock), part.min_level, 1);
    setRequestQty(suggested);
    if (part.stock === 0) {
      setRequestReason(
        `Critical stockout at Plant ${plantId}. Immediate replenishment required for safety stock and upcoming maintenance.`
      );
    } else {
      setRequestReason(
        `Inventory below safety minimum (${part.stock} in stock vs ${part.min_level} min) at Plant ${plantId}. Order needed before next planned maintenance cycle.`
      );
    }
  };

  const handleSendPurchaseRequest = () => {
    if (!selectedPartForRequest) return;
    const subject = encodeURIComponent(
      `Purchase request: ${selectedPartForRequest.name} (${selectedPartForRequest.part_no}) - Plant ${plantId}`
    );
    const body = encodeURIComponent(
      `Purchase Request Details\n\n` +
        `Part name: ${selectedPartForRequest.name}\n` +
        `Part number: ${selectedPartForRequest.part_no}\n` +
        `Category: ${selectedPartForRequest.category}\n` +
        `Plant: ${plantId} ${plant?.name ? `(${plant.name})` : ''}\n` +
        `Current stock: ${selectedPartForRequest.stock}\n` +
        `Minimum safety level: ${selectedPartForRequest.min_level}\n` +
        `Reorder quantity: ${requestQty}\n` +
        `Estimated lead time: ${selectedPartForRequest.lead_time_days} days\n` +
        `Estimated unit cost: $${selectedPartForRequest.unit_cost_usd}\n\n` +
        `Reason / justification:\n${requestReason}\n\n` +
        `Requested by: Stores In-charge (Ferrow Foresight)`
    );

    const mailtoUrl = `mailto:procurement@ferrow.com?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;

    showToast(`Purchase request draft opened for ${selectedPartForRequest.part_no}`, 'success');
    setSelectedPartForRequest(null);
  };

  const formatCategory = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Stores home
            </span>
            <span className="text-xs text-slate-400">Plant {plantId} {plant ? `• ${plant.name}` : ''}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Spares readiness
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time inventory levels, safety stock deficits, and spare parts readiness for scheduled work orders.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total SKUs</span>
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{totalStockCount}</div>
          <div className="text-xs text-slate-500 mt-1">Catalog items tracked</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Stockouts</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{stockoutParts.length}</div>
          <div className="text-xs text-rose-400/80 mt-1">Immediate reorder needed</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Below min level</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{belowMinParts.length}</div>
          <div className="text-xs text-amber-400/80 mt-1">Under safety buffer</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Critical parts</span>
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{criticalCount}</div>
          <div className="text-xs text-slate-500 mt-1">High machine impact</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Job readiness</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{avgReadiness}%</div>
          <div className="text-xs text-slate-500 mt-1">Upcoming work orders</div>
        </div>
      </div>

      {/* Stockout & Below-Min Callouts Section */}
      {(stockoutParts.length > 0 || belowMinParts.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Inventory callouts
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stockout Callouts */}
            {stockoutParts.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    <span className="text-sm font-semibold text-rose-300">
                      Stockout alerts ({stockoutParts.length})
                    </span>
                  </div>
                  <span className="text-xs text-rose-400/80">Available stock is zero</span>
                </div>

                <div className="space-y-2">
                  {stockoutParts.map((part) => (
                    <div
                      key={part.id}
                      className="bg-slate-900/80 border border-rose-900/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{part.name}</span>
                          <span className="text-slate-400 font-mono">({part.part_no})</span>
                          {part.critical && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Critical
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 mt-1">
                          Min safety level: {part.min_level} • Lead time: {part.lead_time_days} days • Unit cost: ${part.unit_cost_usd}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenPurchaseRequest(part)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-colors whitespace-nowrap font-medium"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Raise purchase request
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Below Min Callouts */}
            {belowMinParts.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">
                      Below minimum stock ({belowMinParts.length})
                    </span>
                  </div>
                  <span className="text-xs text-amber-400/80">Below safety threshold</span>
                </div>

                <div className="space-y-2">
                  {belowMinParts.map((part) => (
                    <div
                      key={part.id}
                      className="bg-slate-900/80 border border-amber-900/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{part.name}</span>
                          <span className="text-slate-400 font-mono">({part.part_no})</span>
                          {part.critical && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Critical
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 mt-1">
                          Available: {part.available} • Min safety level: {part.min_level} • Lead time: {part.lead_time_days} days
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenPurchaseRequest(part)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors whitespace-nowrap font-medium"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Raise purchase request
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Work Orders Readiness % Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-400" />
              Work order spares readiness
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Spares availability status for upcoming scheduled and in-progress jobs.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            {workOrderReadiness.length} active work {workOrderReadiness.length === 1 ? 'order' : 'orders'}
          </div>
        </div>

        {workOrderReadiness.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
            No upcoming work orders found for Plant {plantId}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workOrderReadiness.map((item) => {
              const wo = item.workOrder;
              const machine = item.machine;
              return (
                <div
                  key={wo.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/work-orders`}
                          className="font-mono font-semibold text-sm text-indigo-400 hover:underline"
                        >
                          {wo.id}
                        </Link>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                          {wo.type}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            wo.priority === 'P1'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {wo.priority}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>Machine:</span>
                        <Link
                          href={`/machines/${wo.machine_id}`}
                          className="text-slate-200 hover:text-white font-medium hover:underline"
                        >
                          {wo.machine_id} {machine ? `(${machine.name})` : ''}
                        </Link>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.readinessPct === 100
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.readinessPct === 0
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.readinessPct === 100 ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : item.readinessPct === 0 ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        <span>{item.readinessPct}% readiness</span>
                      </div>
                      {wo.scheduled_window && (
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {wo.scheduled_window.date} • Shift {wo.scheduled_window.shift}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.readinessPct === 100
                          ? 'bg-emerald-500'
                          : item.readinessPct === 0
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.readinessPct}%` }}
                    />
                  </div>

                  {/* Parts Required Details */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <div className="text-xs font-medium text-slate-400 mb-2">
                      Required spares ({item.totalParts}):
                    </div>
                    {item.totalParts === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        No replacement spare parts required for this task.
                      </span>
                    ) : (
                      <div className="space-y-1.5">
                        {item.itemsDetail.map((detail, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-950/40 border border-slate-800/40"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  detail.isAvailable ? 'bg-emerald-400' : 'bg-rose-400'
                                }`}
                              />
                              <span className="text-slate-300 font-medium">{detail.name}</span>
                              <span className="text-slate-400 font-mono">({detail.part_id})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">
                                Needed: <strong className="text-slate-200">{detail.requiredQty}</strong>
                              </span>
                              <span className="text-slate-500">•</span>
                              <span
                                className={
                                  detail.isAvailable ? 'text-emerald-400' : 'text-rose-400 font-medium'
                                }
                              >
                                Avail: {detail.availableQty}
                              </span>
                              {!detail.isAvailable && detail.part && (
                                <button
                                  onClick={() => handleOpenPurchaseRequest(detail.part!)}
                                  className="ml-1 text-[11px] text-rose-400 hover:text-rose-300 underline"
                                >
                                  Reorder
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spares Inventory Table Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Spares inventory catalog
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtered inventory items with stock, reservations, lead times, and reorder controls.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search part name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-700 text-slate-100'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('ok')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'ok'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            OK
          </button>
          <button
            onClick={() => setStatusFilter('below_min')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'below_min'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Below min
          </button>
          <button
            onClick={() => setStatusFilter('stockout')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'stockout'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Stockout
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-2">
            <span>Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {formatCategory(cat)}
              </option>
            ))}
          </select>

          {/* Critical Only Toggle */}
          <button
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              criticalOnly
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Critical only</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-3 font-semibold">Part</th>
                <th className="py-3 px-3 font-semibold">Part no</th>
                <th className="py-3 px-3 font-semibold">Category</th>
                <th className="py-3 px-3 font-semibold text-right">Stock</th>
                <th className="py-3 px-3 font-semibold text-right">Reserved</th>
                <th className="py-3 px-3 font-semibold text-right">Available</th>
                <th className="py-3 px-3 font-semibold text-right">Min level</th>
                <th className="py-3 px-3 font-semibold text-right">Lead time</th>
                <th className="py-3 px-3 font-semibold text-center">Critical</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredSpares.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 italic">
                    No spare parts match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSpares.map((part) => (
                  <tr key={part.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-200">
                      <div>{part.name}</div>
                      {part.compatible_types && part.compatible_types.length > 0 && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Fits: {part.compatible_types.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{part.part_no}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 font-medium">
                        {formatCategory(part.category)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-200">{part.stock}</td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {part.effectiveReserved > 0 ? (
                        <span className="text-amber-400 font-medium">{part.effectiveReserved}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      <span
                        className={
                          part.available <= 0
                            ? 'text-rose-400'
                            : part.available < part.min_level
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {part.available}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">{part.min_level}</td>
                    <td className="py-3 px-3 text-right text-slate-400">{part.lead_time_days} d</td>
                    <td className="py-3 px-3 text-center">
                      {part.critical ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                          Critical
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-slate-800/80 text-slate-400 font-normal">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {part.status === 'ok' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          OK
                        </span>
                      )}
                      {part.status === 'below_min' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Below min
                        </span>
                      )}
                      {part.status === 'stockout' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                          <XCircle className="w-3 h-3" />
                          Stockout
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenPurchaseRequest(part)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        title="Raise purchase request"
                      >
                        <Mail className="w-3 h-3 text-indigo-400" />
                        <span>Request</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Showing {filteredSpares.length} of {spares.length} parts
          </span>
          <span>Lead times measured in calendar days</span>
        </div>
      </div>

      {/* Purchase Request Email Dialog */}
      {selectedPartForRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Purchase request draft
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">
                  Raise request for {selectedPartForRequest.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Part no: {selectedPartForRequest.part_no} • Plant {plantId}
                </p>
              </div>
              <button
                onClick={() => setSelectedPartForRequest(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Current stock:</span>
                <span className="font-semibold text-slate-200">{selectedPartForRequest.stock} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Safety minimum level:</span>
                <span className="font-semibold text-slate-200">{selectedPartForRequest.min_level} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated unit cost:</span>
                <span className="font-semibold text-slate-200">${selectedPartForRequest.unit_cost_usd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated lead time:</span>
                <span className="font-semibold text-slate-200">{selectedPartForRequest.lead_time_days} days</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reorder quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={requestQty}
                  onChange={(e) => setRequestQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reason / justification
                </label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="Provide reason for purchase request..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPartForRequest(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPurchaseRequest}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open email draft</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
