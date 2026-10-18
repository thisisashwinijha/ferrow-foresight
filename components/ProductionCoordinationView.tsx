'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Machine,
  Plant,
  Line,
  ProductionSchedule,
  WorkOrder,
  WindowType,
} from '@/lib/types';
import { usePlantContext } from './PlantContext';
import { useToast } from './ToastContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Package,
  Wrench,
  Check,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  X,
  FileText,
  TrendingDown,
  Layers,
} from 'lucide-react';

interface ProductionCoordinationViewProps {
  initialSchedule: ProductionSchedule[];
  lines: Line[];
  workOrders: WorkOrder[];
  machines: Machine[];
  plant?: Plant;
}

export function ProductionCoordinationView({
  initialSchedule,
  lines,
  workOrders: initialWorkOrders,
  machines,
  plant,
}: ProductionCoordinationViewProps) {
  const router = useRouter();
  const { role } = usePlantContext();
  const { showToast } = useToast();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [selectedCell, setSelectedCell] = useState<{
    date: string;
    shift: string;
    lineId: string;
    scheduleItem?: ProductionSchedule;
    bookedOrders: WorkOrder[];
  } | null>(null);

  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showRescheduleInput, setShowRescheduleInput] = useState<string | null>(null);
  const [isUpdatingWindow, setIsUpdatingWindow] = useState(false);

  // Machine map
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach((m) => map.set(m.id, m));
    return map;
  }, [machines]);

  // Compute the 14 days list starting from 2026-10-18
  const daysList = useMemo(() => {
    const baseDate = new Date('2026-10-18');
    const list: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(baseDate.getTime() + i * 86400000);
      list.push(d.toISOString().slice(0, 10));
    }
    return list;
  }, []);

  // Map schedules by `lineId:date:shift`
  const scheduleLookup = useMemo(() => {
    const map = new Map<string, ProductionSchedule>();
    initialSchedule.forEach((s) => {
      map.set(`${s.line_id}:${s.date}:${s.shift.toUpperCase()}`, s);
    });
    return map;
  }, [initialSchedule]);

  // Map scheduled work orders by `lineId:date:shift`
  const workOrderLookup = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    workOrders.forEach((wo) => {
      if (wo.status === 'closed') return;
      const win = wo.scheduled_window;
      if (!win || !win.date || !win.shift) return;

      const m = machineMap.get(wo.machine_id);
      const lineId = win.line_id || m?.line_id;
      if (!lineId) return;

      const key = `${lineId}:${win.date}:${win.shift.toUpperCase()}`;
      const list = map.get(key) || [];
      list.push(wo);
      map.set(key, list);
    });
    return map;
  }, [workOrders, machineMap]);

  // Active line filter (optional local toggle)
  const [activeLineFilter, setActiveLineFilter] = useState<string>('all');
  const filteredLines = useMemo(() => {
    if (activeLineFilter === 'all') return lines;
    return lines.filter((l) => l.id === activeLineFilter);
  }, [lines, activeLineFilter]);

  // Handlers for confirming or requesting rescheduling
  const handleConfirmWindow = async (woId: string) => {
    setIsUpdatingWindow(true);
    try {
      const res = await fetch(`/api/work-orders/${woId}/window`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          confirmed_by: role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkOrders((prev) =>
          prev.map((w) => (w.id === woId ? data.workOrder : w))
        );
        if (selectedCell) {
          setSelectedCell({
            ...selectedCell,
            bookedOrders: selectedCell.bookedOrders.map((w) =>
              w.id === woId ? data.workOrder : w
            ),
          });
        }
        showToast(`Maintenance window confirmed for ${woId}.`, 'success');
      } else {
        showToast(data.error || 'Failed to confirm window', 'alert');
      }
    } catch {
      showToast('Network error while confirming window', 'alert');
    } finally {
      setIsUpdatingWindow(false);
    }
  };

  const handleRequestReschedule = async (woId: string) => {
    if (!rescheduleReason.trim()) {
      showToast('Please provide an operational reason for requesting another window', 'warning');
      return;
    }

    setIsUpdatingWindow(true);
    try {
      const res = await fetch(`/api/work-orders/${woId}/window`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_reschedule',
          reason: rescheduleReason.trim(),
          requested_by: role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkOrders((prev) =>
          prev.map((w) => (w.id === woId ? data.workOrder : w))
        );
        if (selectedCell) {
          setSelectedCell({
            ...selectedCell,
            bookedOrders: selectedCell.bookedOrders.map((w) =>
              w.id === woId ? data.workOrder : w
            ),
          });
        }
        setShowRescheduleInput(null);
        setRescheduleReason('');
        showToast(`Reschedule request sent for ${woId} to Maintenance Planner.`, 'warning');
      } else {
        showToast(data.error || 'Failed to request rescheduling', 'alert');
      }
    } catch {
      showToast('Network error while requesting rescheduling', 'alert');
    } finally {
      setIsUpdatingWindow(false);
    }
  };

  // Helper for window type style
  const getWindowTypeStyle = (type?: WindowType | string) => {
    switch (type) {
      case 'planned_shutdown':
        return {
          bg: 'bg-surface-3/70',
          border: 'border-line/60',
          badge: 'bg-surface-3 text-ink font-semibold',
          text: 'text-ink font-semibold',
          label: 'Planned shutdown',
        };
      case 'changeover':
        return {
          bg: 'bg-agent/10',
          border: 'border-agent/20',
          badge: 'bg-agent/15 text-agent font-medium',
          text: 'text-agent',
          label: 'Changeover',
        };
      case 'low_load':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/25',
          badge: 'bg-warning/15 text-warning font-medium',
          text: 'text-warning',
          label: 'Low load',
        };
      case 'run':
      default:
        return {
          bg: 'bg-surface',
          border: 'border-line/30',
          badge: 'bg-surface-2 text-ink-muted',
          text: 'text-ink',
          label: 'Production run',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-chip text-xs font-semibold bg-agent/10 text-agent">
              Production Manager
            </span>
            <span className="text-xs text-ink-muted">·</span>
            <span className="text-xs font-medium text-ink-muted">
              {plant?.name || 'Pune Plant'} ({plant?.id || 'P-07'})
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight mt-1">
            Production coordination & window grid
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            14-day line schedule across shifts (A, B, C). Agree maintenance windows vs production commitments.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] self-start sm:self-auto bg-surface rounded-card p-2 border border-line/30 shadow-xs">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-surface border border-line/30">
            <span className="w-2 h-2 rounded-full bg-ink/30" />
            <span className="text-ink">Run</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-agent/10 text-agent border border-agent/20">
            <span className="w-2 h-2 rounded-full bg-agent" />
            <span>Changeover</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-warning/10 text-warning border border-warning/20">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>Low load</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-surface-3 text-ink border border-line/60">
            <span className="w-2 h-2 rounded-full bg-ink font-semibold" />
            <span>Planned shutdown</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-danger/10 text-danger border border-danger/30 font-semibold">
            <span>★ High priority order</span>
          </div>
        </div>
      </div>

      {/* 2. Grid Table: 14 Days x Lines x Shifts */}
      <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ink-muted" />
            <h2 className="text-sm font-semibold text-ink">
              14-Day Production Matrix ({daysList[0]} to {daysList[daysList.length - 1]})
            </h2>
          </div>

          {/* Line filter chips */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-ink-muted text-[11px]">Filter line:</span>
            <button
              onClick={() => setActiveLineFilter('all')}
              className={`px-2.5 py-1 rounded-btn font-medium transition-colors ${
                activeLineFilter === 'all'
                  ? 'bg-ink text-canvas'
                  : 'bg-surface-2 text-ink hover:bg-surface-2/80'
              }`}
            >
              All lines
            </button>
            {lines.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveLineFilter(l.id)}
                className={`px-2.5 py-1 rounded-btn font-medium transition-colors ${
                  activeLineFilter === l.id
                    ? 'bg-ink text-canvas'
                    : 'bg-surface-2 text-ink hover:bg-surface-2/80'
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        {/* The Matrix */}
        <div className="overflow-x-auto pt-2">
          <div className="min-w-[1100px] space-y-6">
            {filteredLines.map((line) => (
              <div key={line.id} className="space-y-2">
                <div className="flex items-center justify-between border-b border-line/30 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-ink">{line.name}</span>
                    <span className="font-mono text-[11px] text-ink-muted">({line.id})</span>
                  </div>
                  <span className="text-[11px] text-ink-muted">Target rate: 10,000 units / shift</span>
                </div>

                {/* Day Header Row */}
                <div className="grid grid-cols-14 gap-1.5 text-center text-[10px] font-medium text-ink-muted">
                  {daysList.map((day) => {
                    const d = new Date(day);
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const isWeekend = dayName === 'Sat' || dayName === 'Sun';

                    return (
                      <div
                        key={day}
                        className={`p-1 rounded-t-btn border-b border-line/20 ${
                          isWeekend ? 'bg-surface-2/60 text-ink font-semibold' : ''
                        }`}
                      >
                        <span className="block text-[11px]">{day.slice(5)}</span>
                        <span className="block text-[9px] uppercase">{dayName}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Shift Rows: Shift A, B, C */}
                {(['A', 'B', 'C'] as const).map((shift) => (
                  <div key={shift} className="grid grid-cols-14 gap-1.5 items-stretch">
                    {daysList.map((day) => {
                      const key = `${line.id}:${day}:${shift}`;
                      const schedule = scheduleLookup.get(key);
                      const bookedOrders = workOrderLookup.get(key) || [];
                      const windowStyle = getWindowTypeStyle(schedule?.window_type);
                      const isHighPriority = schedule?.priority === 'high';
                      const isSelected =
                        selectedCell?.date === day &&
                        selectedCell?.shift === shift &&
                        selectedCell?.lineId === line.id;

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setSelectedCell({
                              date: day,
                              shift,
                              lineId: line.id,
                              scheduleItem: schedule,
                              bookedOrders,
                            })
                          }
                          className={`p-1.5 rounded-btn min-h-[76px] text-left transition-all border flex flex-col justify-between ${
                            windowStyle.bg
                          } ${windowStyle.border} ${
                            isSelected
                              ? 'ring-2 ring-ink shadow-md'
                              : 'hover:border-ink/60 hover:shadow-xs'
                          }`}
                        >
                          {/* Top: Shift & Window type */}
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-mono font-semibold text-ink-muted">
                              Shift {shift}
                            </span>
                            {isHighPriority && (
                              <span
                                className="px-1 py-0.2 rounded-chip bg-danger/10 text-danger text-[9px] font-bold"
                                title="High priority customer order"
                              >
                                High
                              </span>
                            )}
                          </div>

                          {/* Middle: Product / Units or Window Name */}
                          <div className="my-0.5 space-y-0.5 overflow-hidden">
                            <span className="text-[10px] font-medium text-ink truncate block">
                              {schedule?.product || windowStyle.label}
                            </span>
                            {schedule?.planned_units ? (
                              <span className="text-[9px] text-ink-muted font-mono tabular-nums block">
                                {schedule.planned_units.toLocaleString()} u
                              </span>
                            ) : null}
                          </div>

                          {/* Bottom: Overlaid Work Orders */}
                          {bookedOrders.length > 0 ? (
                            <div className="pt-0.5">
                              {bookedOrders.map((wo) => {
                                const isConfirmed =
                                  wo.scheduled_window?.production_status === 'confirmed';
                                const isReschedule =
                                  wo.scheduled_window?.production_status === 'reschedule_requested';

                                return (
                                  <div
                                    key={wo.id}
                                    className={`px-1 py-0.5 rounded-chip text-[9px] font-mono flex items-center justify-between ${
                                      isConfirmed
                                        ? 'bg-ok/15 text-ok font-semibold border border-ok/30'
                                        : isReschedule
                                        ? 'bg-warning/20 text-warning font-semibold border border-warning/40'
                                        : 'bg-agent/15 text-agent font-medium border border-agent/30'
                                    }`}
                                  >
                                    <span className="truncate flex items-center gap-0.5">
                                      <Wrench className="w-2.5 h-2.5 shrink-0" />
                                      {wo.id}
                                    </span>
                                    {isConfirmed && <Check className="w-2.5 h-2.5 text-ok shrink-0" />}
                                    {isReschedule && (
                                      <AlertTriangle className="w-2.5 h-2.5 text-warning shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[8px] text-ink-muted/40 uppercase">No WO</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Detail Drawer / Modal for Clicked Cell */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-card p-6 border border-line/40 max-w-lg w-full space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line/20 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-ink">
                    Line {selectedCell.lineId} · Shift {selectedCell.shift}
                  </span>
                  <span className="px-2 py-0.5 rounded-chip text-[11px] font-medium bg-surface-2 text-ink">
                    {selectedCell.date}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  Production window details and booked maintenance reservations
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedCell(null);
                  setShowRescheduleInput(null);
                }}
                className="p-1 rounded-btn hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Production Schedule Details */}
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                Production commitment
              </span>

              {selectedCell.scheduleItem ? (
                <div className="p-3.5 rounded-btn bg-surface-2/40 border border-line/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink-muted block">Sales Order</span>
                      <span className="font-mono font-semibold text-ink">
                        {selectedCell.scheduleItem.order_no}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block text-right">Window Type</span>
                      <span className="capitalize font-medium text-ink">
                        {selectedCell.scheduleItem.window_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-line/10">
                    <div>
                      <span className="text-[10px] text-ink-muted block">Product</span>
                      <span className="font-medium text-ink">
                        {selectedCell.scheduleItem.product}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-ink-muted block">Planned Units</span>
                      <span className="font-mono font-semibold text-ink tabular-nums">
                        {selectedCell.scheduleItem.planned_units.toLocaleString()} units
                      </span>
                    </div>
                  </div>

                  {selectedCell.scheduleItem.priority === 'high' && (
                    <div className="p-2 rounded-btn bg-danger/10 border border-danger/30 text-xs text-danger font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        <strong>High-Priority Order:</strong> Disruption causes penalty clauses. Reschedule routine maintenance to shutdown slots.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-ink-muted">No scheduled production order for this shift.</p>
              )}
            </div>

            {/* Booked Maintenance & Actions */}
            <div className="space-y-3 pt-1 border-t border-line/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Maintenance booked ({selectedCell.bookedOrders.length})
                </span>
                <span className="text-[11px] text-ink-muted">
                  Est. production loss: {selectedCell.scheduleItem?.window_type === 'planned_shutdown' || selectedCell.scheduleItem?.window_type === 'changeover' ? '0 units (covered)' : '150 - 300 units'}
                </span>
              </div>

              {selectedCell.bookedOrders.length === 0 ? (
                <div className="p-4 rounded-btn bg-surface-2/30 border border-line/20 text-center text-xs text-ink-muted">
                  No maintenance work orders booked in this shift slot.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCell.bookedOrders.map((wo) => {
                    const m = machineMap.get(wo.machine_id);
                    const isConfirmed = wo.scheduled_window?.production_status === 'confirmed';
                    const isRescheduled = wo.scheduled_window?.production_status === 'reschedule_requested';

                    return (
                      <div
                        key={wo.id}
                        className="p-3.5 rounded-btn bg-surface-2/50 border border-line/30 space-y-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-ink">{wo.id}</span>
                              <span
                                className={`px-2 py-0.2 rounded-chip text-[10px] font-semibold ${
                                  wo.priority === 'P1'
                                    ? 'bg-danger/10 text-danger'
                                    : wo.priority === 'P2'
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-surface-2 text-ink-muted'
                                }`}
                              >
                                {wo.priority || 'P2'}
                              </span>
                              <span className="font-medium text-ink">
                                {m?.name || wo.machine_id} ({wo.machine_id})
                              </span>
                            </div>
                            <span className="text-[11px] text-ink-muted block mt-0.5">
                              Assigned: {wo.assigned_technician || 'Technician'} · Type: {wo.type || 'CBM'}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-chip text-[10px] font-semibold block capitalize ${
                                isConfirmed
                                  ? 'bg-ok/10 text-ok'
                                  : isRescheduled
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-agent/10 text-agent'
                              }`}
                            >
                              {isConfirmed
                                ? 'Confirmed'
                                : isRescheduled
                                ? 'Reschedule requested'
                                : 'Awaiting confirmation'}
                            </span>
                          </div>
                        </div>

                        {/* If reschedule requested, show reason */}
                        {isRescheduled && wo.scheduled_window?.reschedule_reason && (
                          <div className="p-2 rounded-btn bg-warning/10 border border-warning/20 text-[11px] text-warning">
                            <strong>Reason:</strong> &quot;{wo.scheduled_window.reschedule_reason}&quot;
                          </div>
                        )}

                        {/* Production Manager Action Buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-line/20">
                          {!isConfirmed && (
                            <button
                              type="button"
                              onClick={() => handleConfirmWindow(wo.id)}
                              disabled={isUpdatingWindow}
                              className="px-3 py-1.5 rounded-btn bg-ok text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm window</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setShowRescheduleInput(showRescheduleInput === wo.id ? null : wo.id)
                            }
                            className="px-3 py-1.5 rounded-btn border border-line/40 hover:bg-surface-2 text-ink text-xs font-medium transition-colors flex items-center gap-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                            <span>Request another window</span>
                          </button>

                          <Link
                            href={`/work-orders/${wo.id}`}
                            className="text-xs text-ink-muted hover:text-ink underline ml-auto"
                          >
                            Work order page →
                          </Link>
                        </div>

                        {/* Inline Reschedule Input */}
                        {showRescheduleInput === wo.id && (
                          <div className="p-3 rounded-btn bg-surface border border-line/30 space-y-2 mt-2 animate-in fade-in">
                            <label className="text-[11px] font-semibold text-ink block">
                              Operational reason for rescheduling:
                            </label>
                            <textarea
                              value={rescheduleReason}
                              onChange={(e) => setRescheduleReason(e.target.value)}
                              placeholder="e.g. High priority export order SO-26002 runs this shift; please shift maintenance to planned Sunday shutdown."
                              rows={2}
                              className="w-full bg-surface-2/60 border border-line/30 rounded-btn p-2 text-xs text-ink placeholder:text-ink-muted focus:outline-hidden"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setShowRescheduleInput(null)}
                                className="px-2.5 py-1 text-xs text-ink-muted hover:text-ink"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestReschedule(wo.id)}
                                disabled={isUpdatingWindow || !rescheduleReason.trim()}
                                className="px-3 py-1 rounded-btn bg-warning text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                              >
                                {isUpdatingWindow ? 'Submitting...' : 'Send request'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 rounded-btn bg-surface-2 text-xs font-medium text-ink hover:bg-surface-2/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
