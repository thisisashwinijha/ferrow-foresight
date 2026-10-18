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
  X,
  ArrowRight,
  TrendingDown,
  Info,
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
  const { role, plantId } = usePlantContext();
  const { showToast } = useToast();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [selectedCell, setSelectedCell] = useState<{
    date: string;
    shift: 'A' | 'B' | 'C';
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

  // Selected date for mobile view (defaults to first day)
  const [selectedMobileDate, setSelectedMobileDate] = useState<string>(daysList[0] || '2026-10-18');

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

  // Handlers for confirming or requesting rescheduling
  const handleConfirmWindow = async (woId: string) => {
    if (role !== 'Production Manager') {
      showToast('Only Production Manager can confirm maintenance windows.', 'warning');
      return;
    }
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
        router.refresh();
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
    if (role !== 'Production Manager') {
      showToast('Only Production Manager can request window rescheduling.', 'warning');
      return;
    }
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
        router.refresh();
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
          bg: 'bg-purple-500/10 dark:bg-purple-500/20',
          border: 'border-purple-500/30',
          text: 'text-purple-700 dark:text-purple-300 font-medium',
          label: 'Planned shutdown',
        };
      case 'changeover':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/20',
          border: 'border-blue-500/30',
          text: 'text-blue-700 dark:text-blue-300 font-medium',
          label: 'Changeover',
        };
      case 'low_load':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          border: 'border-amber-500/30',
          text: 'text-amber-800 dark:text-amber-300 font-medium',
          label: 'Low load',
        };
      case 'run':
      default:
        return {
          bg: 'bg-surface-2/40',
          border: 'border-line/40',
          text: 'text-ink-muted',
          label: 'Run',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16">
      {/* 1. Header & Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-chip bg-surface border border-line/40 text-ink">
              Production coordination
            </span>
            <span className="text-xs text-ink-muted">·</span>
            <span className="text-xs text-ink-muted">
              {plant?.name || 'Pune Plant'} ({plant?.id || plantId})
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight mt-1">
            Production schedule & maintenance window grid
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Next 14 days across lines and shifts (A, B, C). Coordinate maintenance slots against production commitments.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 flex-wrap text-xs bg-surface rounded-card p-2.5 border border-line/30 shadow-xs">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-surface-2/40 border border-line/40 text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-ink-muted" />
            <span>Run</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>Changeover</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>Low load</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span>Planned shutdown</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-surface border border-line/50 text-ink font-semibold">
            <span className="w-2 h-2 rounded-full bg-ok" />
            <span>Booked order marker</span>
          </div>
        </div>
      </div>

      {/* 2. DESKTOP TIMELINE GRID (hidden on phone, visible on md and above) */}
      <div className="hidden md:block bg-surface rounded-card p-5 border border-line/30 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ink-muted" />
            <h2 className="text-sm font-semibold text-ink">
              14-Day Timeline Matrix ({daysList[0]} to {daysList[daysList.length - 1]})
            </h2>
          </div>
          <span className="text-xs text-ink-muted">
            Click any shift chip to view production commitments and confirm window
          </span>
        </div>

        {/* Timeline Grid: Rows = Lines, Columns = 14 Days */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-line/30">
                <th className="py-2.5 px-3 text-xs font-semibold text-ink w-40 sticky left-0 bg-surface z-10 shadow-xs">
                  Line
                </th>
                {daysList.map((day) => {
                  const d = new Date(day);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const isWeekend = dayName === 'Sat' || dayName === 'Sun';

                  return (
                    <th
                      key={day}
                      className={`py-2 px-1 text-center font-medium border-l border-line/20 ${
                        isWeekend ? 'bg-surface-2/40' : ''
                      }`}
                    >
                      <span className="block text-xs font-semibold text-ink">{day.slice(5)}</span>
                      <span className="block text-[10px] text-ink-muted">{dayName}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/20">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-surface-2/20 transition-colors">
                  {/* Row Header: Line Name */}
                  <td className="py-3 px-3 text-xs font-semibold text-ink sticky left-0 bg-surface z-10 shadow-xs">
                    <div className="truncate font-semibold">{line.name}</div>
                    <div className="text-[11px] text-ink-muted font-mono">{line.id}</div>
                  </td>

                  {/* 14 Day Cells */}
                  {daysList.map((day) => {
                    const shifts: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

                    return (
                      <td key={day} className="py-2 px-1 text-center border-l border-line/20 align-middle">
                        {/* Cell shows three small shift chips (A, B, C) */}
                        <div className="flex items-center justify-center gap-1">
                          {shifts.map((shift) => {
                            const key = `${line.id}:${day}:${shift}`;
                            const schedule = scheduleLookup.get(key);
                            const bookedOrders = workOrderLookup.get(key) || [];
                            const style = getWindowTypeStyle(schedule?.window_type);
                            const hasOrders = bookedOrders.length > 0;
                            const isSelected =
                              selectedCell?.date === day &&
                              selectedCell?.shift === shift &&
                              selectedCell?.lineId === line.id;

                            return (
                              <button
                                key={shift}
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
                                title={`Line ${line.name} · Shift ${shift} (${style.label})${
                                  hasOrders ? ` · ${bookedOrders.length} booked order` : ''
                                }`}
                                className={`w-6 h-7 rounded-btn border text-[11px] font-mono font-semibold flex flex-col items-center justify-center transition-all relative ${
                                  style.bg
                                } ${style.border} ${style.text} ${
                                  isSelected
                                    ? 'ring-2 ring-ink shadow-xs scale-105'
                                    : 'hover:opacity-80 hover:scale-105'
                                }`}
                              >
                                <span>{shift}</span>
                                {/* Clear marker on booked work orders */}
                                {hasOrders && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-ok -mt-0.5" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. PHONE VIEW (visible on phone only, hidden on md and above) */}
      <div className="block md:hidden space-y-4">
        {/* Day Picker: Horizontal date chips */}
        <div className="bg-surface rounded-card p-4 border border-line/30 space-y-2.5 shadow-xs">
          <span className="text-xs font-semibold text-ink block">
            Select date
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {daysList.map((day) => {
              const d = new Date(day);
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const isSelected = day === selectedMobileDate;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedMobileDate(day)}
                  className={`px-3 py-1.5 rounded-chip text-xs shrink-0 text-center transition-all ${
                    isSelected
                      ? 'bg-ink text-surface font-semibold shadow-xs'
                      : 'bg-surface-2 text-ink-muted hover:text-ink'
                  }`}
                >
                  <span className="block text-[11px] font-medium">{day.slice(5)}</span>
                  <span className="block text-[10px]">{dayName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Simple list per line for chosen day */}
        <div className="space-y-3">
          {lines.map((line) => {
            const shifts: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

            return (
              <div
                key={line.id}
                className="bg-surface rounded-card p-4 border border-line/30 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-line/20 pb-2">
                  <div>
                    <h3 className="text-xs font-semibold text-ink">{line.name}</h3>
                    <span className="text-[11px] font-mono text-ink-muted">{line.id}</span>
                  </div>
                  <span className="text-xs text-ink-muted">{selectedMobileDate}</span>
                </div>

                {/* The 3 Shifts for this line */}
                <div className="grid grid-cols-3 gap-2">
                  {shifts.map((shift) => {
                    const key = `${line.id}:${selectedMobileDate}:${shift}`;
                    const schedule = scheduleLookup.get(key);
                    const bookedOrders = workOrderLookup.get(key) || [];
                    const style = getWindowTypeStyle(schedule?.window_type);
                    const hasOrders = bookedOrders.length > 0;

                    return (
                      <button
                        key={shift}
                        type="button"
                        onClick={() =>
                          setSelectedCell({
                            date: selectedMobileDate,
                            shift,
                            lineId: line.id,
                            scheduleItem: schedule,
                            bookedOrders,
                          })
                        }
                        className={`p-2.5 rounded-btn border text-left space-y-1 transition-all ${style.bg} ${style.border}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-ink">
                            Shift {shift}
                          </span>
                          {hasOrders && (
                            <span className="w-2 h-2 rounded-full bg-ok" />
                          )}
                        </div>
                        <div className="text-[11px] font-medium text-ink truncate">
                          {style.label}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          {hasOrders ? `${bookedOrders.length} booked` : 'Available'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SIDE SHEET (Drawer sliding in from right) */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink/30 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setSelectedCell(null);
              setShowRescheduleInput(null);
            }}
          />

          {/* Slide-over Panel */}
          <div className="relative w-full max-w-md bg-surface h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-line/30 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">
                    Line {selectedCell.lineId} · Shift {selectedCell.shift}
                  </span>
                  <span className="px-2 py-0.5 rounded-chip text-[11px] font-medium bg-surface-2 text-ink">
                    {selectedCell.date}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  Production commitment and booked maintenance window
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCell(null);
                  setShowRescheduleInput(null);
                }}
                className="p-1.5 rounded-btn hover:bg-surface-2 text-ink-muted hover:text-ink transition-colors"
                aria-label="Close sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 space-y-5 flex-1">
              {/* Section 1: Production Commitment */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-ink block">
                  Production commitment
                </span>

                {selectedCell.scheduleItem ? (
                  <div className="p-3.5 rounded-card bg-surface-2/40 border border-line/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-ink-muted block">Sales order</span>
                        <span className="font-mono font-semibold text-ink">
                          {selectedCell.scheduleItem.order_no}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-ink-muted block">Window type</span>
                        <span className="capitalize font-medium text-ink">
                          {selectedCell.scheduleItem.window_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-line/20">
                      <div>
                        <span className="text-[11px] text-ink-muted block">Product</span>
                        <span className="font-medium text-ink">
                          {selectedCell.scheduleItem.product}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-ink-muted block">Planned units</span>
                        <span className="font-mono font-semibold text-ink tabular-nums">
                          {selectedCell.scheduleItem.planned_units.toLocaleString()} units
                        </span>
                      </div>
                    </div>

                    {selectedCell.scheduleItem.priority === 'high' && (
                      <div className="p-2 rounded-btn bg-danger/10 border border-danger/25 text-xs text-danger font-medium flex items-center gap-1.5 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>High-priority customer order: strict delivery commitment</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-card bg-surface-2/30 border border-line/30 text-xs text-ink-muted">
                    No production run scheduled for this slot.
                  </div>
                )}
              </div>

              {/* Section 2: Estimated Production Loss */}
              <div className="p-3 rounded-card bg-surface-2/30 border border-line/30 space-y-1 text-xs">
                <span className="text-xs font-semibold text-ink block">
                  Estimated production loss
                </span>
                <p className="text-xs text-ink-muted">
                  {selectedCell.scheduleItem?.window_type === 'planned_shutdown' ||
                  selectedCell.scheduleItem?.window_type === 'changeover'
                    ? '0 units (covered during non-production window)'
                    : '150 - 300 units (~$2,700 - $5,400 est. downtime impact)'}
                </p>
              </div>

              {/* Section 3: Maintenance Booked */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    Maintenance booked ({selectedCell.bookedOrders.length})
                  </span>
                  <span className="text-xs text-ink-muted">
                    {selectedCell.bookedOrders.length === 0 ? 'Slot free' : 'Slot reserved'}
                  </span>
                </div>

                {selectedCell.bookedOrders.length === 0 ? (
                  <div className="p-4 rounded-card bg-surface-2/30 border border-line/30 text-center text-xs text-ink-muted">
                    No maintenance work orders booked in this shift slot.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCell.bookedOrders.map((wo) => {
                      const m = machineMap.get(wo.machine_id);
                      const isConfirmed =
                        wo.scheduled_window?.production_status === 'confirmed' ||
                        wo.scheduled_window?.confirmed;
                      const isRescheduled =
                        wo.scheduled_window?.production_status === 'reschedule_requested';

                      return (
                        <div
                          key={wo.id}
                          className="p-4 rounded-card bg-surface border border-line/50 space-y-3 text-xs shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-ink">{wo.id}</span>
                                <span
                                  className={`px-2 py-0.2 rounded-chip text-[11px] font-semibold ${
                                    wo.priority === 'P1'
                                      ? 'bg-danger/10 text-danger'
                                      : 'bg-warning/10 text-warning'
                                  }`}
                                >
                                  {wo.priority || 'P2'}
                                </span>
                                <span className="font-medium text-ink">
                                  {m?.name || wo.machine_id}
                                </span>
                              </div>
                              <span className="text-[11px] text-ink-muted block mt-0.5">
                                Assigned: {wo.assigned_technician || 'Technician'} · Machine: {wo.machine_id}
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-chip text-[11px] font-semibold shrink-0 ${
                                isConfirmed
                                  ? 'bg-ok/10 text-ok'
                                  : isRescheduled
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-surface-2 text-ink-muted'
                              }`}
                            >
                              {isConfirmed
                                ? 'Confirmed'
                                : isRescheduled
                                ? 'Reschedule requested'
                                : 'Pending confirmation'}
                            </span>
                          </div>

                          {/* Reason notice if reschedule requested */}
                          {isRescheduled && wo.scheduled_window?.reschedule_reason && (
                            <div className="p-2.5 rounded-btn bg-warning/10 border border-warning/20 text-xs text-warning">
                              <strong>Reason:</strong> &quot;{wo.scheduled_window.reschedule_reason}&quot;
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1 border-t border-line/20 flex-wrap">
                            {!isConfirmed && (
                              <button
                                type="button"
                                onClick={() => handleConfirmWindow(wo.id)}
                                disabled={isUpdatingWindow || role !== 'Production Manager'}
                                className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-opacity flex items-center gap-1.5 ${
                                  role === 'Production Manager'
                                    ? 'bg-ok text-white hover:opacity-90'
                                    : 'bg-surface-2 text-ink-muted cursor-not-allowed border border-line/40'
                                }`}
                                title={role !== 'Production Manager' ? 'Only Production Manager can confirm window' : undefined}
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
                              disabled={isUpdatingWindow || role !== 'Production Manager'}
                              className={`px-3 py-1.5 rounded-btn border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                role === 'Production Manager'
                                  ? 'border-line/60 hover:bg-surface-2 text-ink'
                                  : 'border-line/30 bg-surface-2 text-ink-muted cursor-not-allowed'
                              }`}
                              title={role !== 'Production Manager' ? 'Only Production Manager can request window reschedule' : undefined}
                            >
                              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                              <span>Request another window</span>
                            </button>

                            <Link
                              href={`/work-orders/${wo.id}`}
                              className="text-xs text-ink-muted hover:text-ink underline ml-auto flex items-center gap-1"
                            >
                              <span>Work order page</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>

                          {/* Inline Reschedule Input */}
                          {showRescheduleInput === wo.id && (
                            <div className="p-3 rounded-btn bg-surface-2/40 border border-line/30 space-y-2 mt-2">
                              <label className="text-xs font-semibold text-ink block">
                                Reason for requesting another window:
                              </label>
                              <textarea
                                value={rescheduleReason}
                                onChange={(e) => setRescheduleReason(e.target.value)}
                                placeholder="e.g. Export batch delivery running this shift; please move to Sunday planned shutdown."
                                rows={2}
                                className="w-full bg-surface border border-line/40 rounded-btn p-2 text-xs text-ink placeholder:text-ink-muted focus:outline-hidden resize-none"
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
                                  className="px-3 py-1 rounded-btn bg-ink text-surface text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                                >
                                  {isUpdatingWindow ? 'Submitting...' : 'Submit request'}
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
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-line/30 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedCell(null);
                  setShowRescheduleInput(null);
                }}
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
