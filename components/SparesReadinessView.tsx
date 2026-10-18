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
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Spares readiness
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Plant {plantId} {plant ? `• ${plant.name}` : ''} — Real-time inventory levels, safety stock deficits, and spare parts readiness for scheduled work orders.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-surface border border-line rounded-card p-4">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Total SKUs</span>
            <Package className="w-4 h-4 text-ink-muted" />
          </div>
          <div className="text-2xl font-bold text-ink">{totalStockCount}</div>
          <div className="text-xs text-ink-muted mt-1">Catalog items tracked</div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Stockouts</span>
            <XCircle className="w-4 h-4 text-critical" />
          </div>
          <div className="text-2xl font-bold text-critical">{stockoutParts.length}</div>
          <div className="text-xs text-critical font-medium mt-1">Immediate reorder needed</div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Below min level</span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-warning">{belowMinParts.length}</div>
          <div className="text-xs text-warning font-medium mt-1">Under safety buffer</div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Critical parts</span>
            <ShieldAlert className="w-4 h-4 text-agent" />
          </div>
          <div className="text-2xl font-bold text-agent">{criticalCount}</div>
          <div className="text-xs text-ink-muted mt-1">High machine impact</div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Job readiness</span>
            <CheckCircle2 className="w-4 h-4 text-ok" />
          </div>
          <div className="text-2xl font-bold text-ok">{avgReadiness}%</div>
          <div className="text-xs text-ink-muted mt-1">Upcoming work orders</div>
        </div>
      </div>

      {/* Stockout & Below-Min Callouts Section */}
      {(stockoutParts.length > 0 || belowMinParts.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Inventory callouts
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stockout Callouts */}
            {stockoutParts.length > 0 && (
              <div className="bg-critical-bg border border-critical-border rounded-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                    <span className="text-sm font-semibold text-critical">
                      Stockout alerts ({stockoutParts.length})
                    </span>
                  </div>
                  <span className="text-xs text-critical font-medium">Available stock is zero</span>
                </div>

                <div className="space-y-2">
                  {stockoutParts.map((part) => (
                    <div
                      key={part.id}
                      className="bg-surface border border-line rounded-btn p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{part.name}</span>
                          <span className="text-ink-muted font-mono">({part.part_no})</span>
                          {part.critical && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-critical-bg text-critical border border-critical-border font-medium">
                              Critical
                            </span>
                          )}
                        </div>
                        <div className="text-ink-muted mt-1">
                          Min safety level: {part.min_level} • Lead time: {part.lead_time_days} days • Unit cost: ${part.unit_cost_usd}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenPurchaseRequest(part)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#B42318] hover:bg-[#912018] text-white transition-colors whitespace-nowrap font-medium text-xs shrink-0 shadow-xs"
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
              <div className="bg-warning-bg border border-warning-border rounded-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    <span className="text-sm font-semibold text-warning">
                      Below minimum stock ({belowMinParts.length})
                    </span>
                  </div>
                  <span className="text-xs text-warning font-medium">Below safety threshold</span>
                </div>

                <div className="space-y-2">
                  {belowMinParts.map((part) => (
                    <div
                      key={part.id}
                      className="bg-surface border border-line rounded-btn p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{part.name}</span>
                          <span className="text-ink-muted font-mono">({part.part_no})</span>
                          {part.critical && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-warning-bg text-warning border border-warning-border font-medium">
                              Critical
                            </span>
                          )}
                        </div>
                        <div className="text-ink-muted mt-1">
                          Available: {part.available} • Min safety level: {part.min_level} • Lead time: {part.lead_time_days} days
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenPurchaseRequest(part)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-btn bg-warning text-white hover:opacity-90 transition-colors whitespace-nowrap font-medium text-xs shrink-0"
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
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Wrench className="w-4 h-4 text-agent" />
              Work order spares readiness
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Spares availability status for upcoming scheduled and in-progress jobs.
            </p>
          </div>
          <div className="text-xs text-ink-muted">
            {workOrderReadiness.length} active work {workOrderReadiness.length === 1 ? 'order' : 'orders'}
          </div>
        </div>

        {workOrderReadiness.length === 0 ? (
          <div className="bg-surface border border-line rounded-card p-8 text-center text-ink-muted text-sm">
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
                  className="bg-surface border border-line rounded-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/work-orders`}
                          className="font-mono font-semibold text-sm text-agent hover:underline"
                        >
                          {wo.id}
                        </Link>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-ink border border-line font-medium">
                          {wo.type}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            wo.priority === 'P1'
                              ? 'bg-critical-bg text-critical border border-critical-border'
                              : 'bg-warning-bg text-warning border border-warning-border'
                          }`}
                        >
                          {wo.priority}
                        </span>
                      </div>
                      <div className="text-xs text-ink-muted mt-1 flex items-center gap-2">
                        <span>Machine:</span>
                        <Link
                          href={`/machines/${wo.machine_id}`}
                          className="text-ink hover:underline font-medium"
                        >
                          {wo.machine_id} {machine ? `(${machine.name})` : ''}
                        </Link>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.readinessPct === 100
                            ? 'bg-ok-bg text-ok border border-ok-border'
                            : item.readinessPct === 0
                            ? 'bg-critical-bg text-critical border border-critical-border'
                            : 'bg-warning-bg text-warning border border-warning-border'
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
                        <div className="text-[11px] text-ink-muted mt-1 flex items-center justify-end gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {wo.scheduled_window.date} • Shift {wo.scheduled_window.shift}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden border border-line">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.readinessPct === 100
                          ? 'bg-ok'
                          : item.readinessPct === 0
                          ? 'bg-critical'
                          : 'bg-warning'
                      }`}
                      style={{ width: `${item.readinessPct}%` }}
                    />
                  </div>

                  {/* Parts Required Details */}
                  <div className="pt-2 border-t border-line">
                    <div className="text-xs font-medium text-ink-muted mb-2">
                      Required spares ({item.totalParts}):
                    </div>
                    {item.totalParts === 0 ? (
                      <span className="text-xs text-ink-muted italic">
                        No replacement spare parts required for this task.
                      </span>
                    ) : (
                      <div className="space-y-1.5">
                        {item.itemsDetail.map((detail, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-btn bg-surface-2 border border-line"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  detail.isAvailable ? 'bg-ok' : 'bg-critical'
                                }`}
                              />
                              <span className="text-ink font-medium">{detail.name}</span>
                              <span className="text-ink-muted font-mono">({detail.part_id})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-ink-muted">
                                Needed: <strong className="text-ink">{detail.requiredQty}</strong>
                              </span>
                              <span className="text-ink-muted">•</span>
                              <span
                                className={
                                  detail.isAvailable ? 'text-ok font-medium' : 'text-critical font-medium'
                                }
                              >
                                Avail: {detail.availableQty}
                              </span>
                              {!detail.isAvailable && detail.part && (
                                <button
                                  onClick={() => handleOpenPurchaseRequest(detail.part!)}
                                  className="ml-1 text-[11px] text-critical hover:underline"
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
      <div className="bg-surface border border-line rounded-card overflow-hidden space-y-4 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Spares inventory catalog
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Filtered inventory items with stock, reservations, lead times, and reorder controls.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search part name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-line rounded-btn pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-agent"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-btn text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-ink text-surface'
                : 'bg-surface-2 text-ink-muted hover:text-ink border border-line'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('ok')}
            className={`px-2.5 py-1 rounded-btn text-xs font-medium transition-colors ${
              statusFilter === 'ok'
                ? 'bg-ok-bg text-ok border border-ok-border'
                : 'bg-surface-2 text-ink-muted hover:text-ink border border-line'
            }`}
          >
            OK
          </button>
          <button
            onClick={() => setStatusFilter('below_min')}
            className={`px-2.5 py-1 rounded-btn text-xs font-medium transition-colors ${
              statusFilter === 'below_min'
                ? 'bg-warning-bg text-warning border border-warning-border'
                : 'bg-surface-2 text-ink-muted hover:text-ink border border-line'
            }`}
          >
            Below min
          </button>
          <button
            onClick={() => setStatusFilter('stockout')}
            className={`px-2.5 py-1 rounded-btn text-xs font-medium transition-colors ${
              statusFilter === 'stockout'
                ? 'bg-critical-bg text-critical border border-critical-border'
                : 'bg-surface-2 text-ink-muted hover:text-ink border border-line'
            }`}
          >
            Stockout
          </button>

          <div className="h-4 w-px bg-line mx-1" />

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-ink-muted mr-2">
            <span>Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-surface border border-line rounded-btn px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-agent"
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
            className={`ml-auto px-2.5 py-1 rounded-btn text-xs font-medium transition-colors flex items-center gap-1.5 ${
              criticalOnly
                ? 'bg-agent-bg text-agent border border-agent-border'
                : 'bg-surface-2 text-ink-muted hover:text-ink border border-line'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Critical only</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2 text-ink-muted border-b border-line">
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
            <tbody className="divide-y divide-line text-ink">
              {filteredSpares.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-ink-muted italic">
                    No spare parts match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSpares.map((part) => (
                  <tr key={part.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-ink">
                      <div>{part.name}</div>
                      {part.compatible_types && part.compatible_types.length > 0 && (
                        <div className="text-[11px] text-ink-muted mt-0.5">
                          Fits: {part.compatible_types.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-ink-muted">{part.part_no}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-surface-2 text-ink border border-line font-medium">
                        {formatCategory(part.category)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-ink">{part.stock}</td>
                    <td className="py-3 px-3 text-right text-ink-muted">
                      {part.effectiveReserved > 0 ? (
                        <span className="text-warning font-medium">{part.effectiveReserved}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">
                      <span
                        className={
                          part.available <= 0
                            ? 'text-critical'
                            : part.available < part.min_level
                            ? 'text-warning'
                            : 'text-ok'
                        }
                      >
                        {part.available}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-ink-muted">{part.min_level}</td>
                    <td className="py-3 px-3 text-right text-ink-muted">{part.lead_time_days} d</td>
                    <td className="py-3 px-3 text-center">
                      {part.critical ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-agent-bg text-agent border border-agent-border font-medium">
                          Critical
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-surface-2 text-ink-muted border border-line font-normal">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {part.status === 'ok' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-ok-bg text-ok border border-ok-border font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          OK
                        </span>
                      )}
                      {part.status === 'below_min' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-warning-bg text-warning border border-warning-border font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Below min
                        </span>
                      )}
                      {part.status === 'stockout' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-critical-bg text-critical border border-critical-border font-medium">
                          <XCircle className="w-3 h-3" />
                          Stockout
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenPurchaseRequest(part)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-btn bg-surface-2 hover:bg-surface border border-line text-ink text-xs font-medium transition-colors"
                        title="Raise purchase request"
                      >
                        <Mail className="w-3 h-3 text-agent" />
                        <span>Request</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-muted pt-2">
          <span>
            Showing {filteredSpares.length} of {spares.length} parts
          </span>
          <span>Lead times measured in calendar days</span>
        </div>
      </div>

      {/* Purchase Request Email Dialog */}
      {selectedPartForRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface border border-line rounded-card max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-ink">
                  Raise request for {selectedPartForRequest.name}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Part no: {selectedPartForRequest.part_no} • Plant {plantId}
                </p>
              </div>
              <button
                onClick={() => setSelectedPartForRequest(null)}
                className="text-ink-muted hover:text-ink text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-surface-2 border border-line rounded-btn p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-muted">Current stock:</span>
                <span className="font-semibold text-ink">{selectedPartForRequest.stock} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Safety minimum level:</span>
                <span className="font-semibold text-ink">{selectedPartForRequest.min_level} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Estimated unit cost:</span>
                <span className="font-semibold text-ink">${selectedPartForRequest.unit_cost_usd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Estimated lead time:</span>
                <span className="font-semibold text-ink">{selectedPartForRequest.lead_time_days} days</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-ink font-medium mb-1">
                  Reorder quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={requestQty}
                  onChange={(e) => setRequestQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-surface border border-line rounded-btn px-3 py-2 text-ink focus:outline-none focus:border-agent"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">
                  Reason / justification
                </label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full bg-surface border border-line rounded-btn px-3 py-2 text-ink focus:outline-none focus:border-agent"
                  placeholder="Provide reason for purchase request..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedPartForRequest(null)}
                className="px-4 py-2 rounded-btn bg-surface-2 hover:bg-surface border border-line text-ink text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPurchaseRequest}
                className="px-4 py-2 rounded-btn bg-agent text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm hover:opacity-90"
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
