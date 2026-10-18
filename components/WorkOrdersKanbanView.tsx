'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  WorkOrder,
  Machine,
  Plant,
  Line,
  Technician,
  WorkOrderStatus,
} from '@/lib/types';
import { usePlantContext } from './PlantContext';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  HardHat,
  Search,
  Shield,
  User,
  Users,
  Wrench,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

interface WorkOrdersKanbanViewProps {
  initialWorkOrders: WorkOrder[];
  machines: Machine[];
  plant?: Plant;
  lines: Line[];
  technicians: Technician[];
}

const KANBAN_COLUMNS: Array<{
  id: WorkOrderStatus | 'raised_group';
  statuses: WorkOrderStatus[];
  title: string;
  description: string;
  color: string;
}> = [
  {
    id: 'raised_group',
    statuses: ['raised', 'approved'],
    title: 'Raised',
    description: 'Awaiting scheduling & permit prep',
    color: 'border-line/60 text-ink-muted',
  },
  {
    id: 'scheduled',
    statuses: ['scheduled'],
    title: 'Scheduled',
    description: 'Window booked, ready for isolation',
    color: 'border-agent/40 text-agent',
  },
  {
    id: 'loto_applied',
    statuses: ['loto_applied'],
    title: 'LOTO Applied',
    description: 'Energy isolated, permit issued',
    color: 'border-amber-500/40 text-amber-600',
  },
  {
    id: 'in_progress',
    statuses: ['in_progress'],
    title: 'In Progress',
    description: 'Active maintenance intervention',
    color: 'border-blue-500/40 text-blue-600',
  },
  {
    id: 'closed',
    statuses: ['closed'],
    title: 'Closed',
    description: 'Intervention verified & resolved',
    color: 'border-ok/40 text-ok',
  },
];

export function WorkOrdersKanbanView({
  initialWorkOrders,
  machines,
  plant,
  lines,
  technicians,
}: WorkOrdersKanbanViewProps) {
  const router = useRouter();
  const { plantId, lineId, setLineId, role } = usePlantContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechId, setSelectedTechId] = useState<string>(
    technicians[0]?.id || 'P07-T01'
  );
  const [techFilterMode, setTechFilterMode] = useState<'my' | 'all'>('my');

  // Build machine map
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach((m) => map.set(m.id, m));
    return map;
  }, [machines]);

  // Build technician map
  const techMap = useMemo(() => {
    const map = new Map<string, Technician>();
    technicians.forEach((t) => map.set(t.id, t));
    return map;
  }, [technicians]);

  // Filter work orders
  const filteredWorkOrders = useMemo(() => {
    return initialWorkOrders.filter((wo) => {
      // Plant filter
      if (plantId && plantId !== 'all' && wo.plant_id && wo.plant_id !== plantId) {
        return false;
      }

      // Line filter
      if (lineId && lineId !== 'all') {
        const m = machineMap.get(wo.machine_id);
        const windowLine = wo.scheduled_window?.line_id;
        if (m?.line_id !== lineId && windowLine !== lineId) {
          return false;
        }
      }

      // Technician Persona filter
      if (role === 'Technician' && techFilterMode === 'my') {
        const isAssigned = wo.assigned_technician === selectedTechId;
        const isShadow = wo.shadow_technician === selectedTechId;
        if (!isAssigned && !isShadow) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m = machineMap.get(wo.machine_id);
        const matchId = wo.id.toLowerCase().includes(q);
        const matchMachine = m?.name.toLowerCase().includes(q) || wo.machine_id.toLowerCase().includes(q);
        const matchTech = (wo.assigned_technician || '').toLowerCase().includes(q);
        if (!matchId && !matchMachine && !matchTech) return false;
      }

      return true;
    });
  }, [initialWorkOrders, plantId, lineId, machineMap, role, techFilterMode, selectedTechId, searchQuery]);

  // Summary counts
  const totalCount = filteredWorkOrders.length;
  const inProgressCount = filteredWorkOrders.filter((w) => w.status === 'in_progress').length;
  const lotoCount = filteredWorkOrders.filter((w) => w.status === 'loto_applied').length;
  const scheduledCount = filteredWorkOrders.filter((w) => w.status === 'scheduled').length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted mb-1">
            <Link href="/" className="hover:text-ink">Control Room</Link>
            <span>/</span>
            <span className="text-ink font-medium">Work orders</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-semibold text-ink tracking-tight">
              Work orders
            </h1>
            <span className="px-2.5 py-0.5 rounded-chip text-xs font-medium bg-surface-2 text-ink-muted">
              {plant?.city || plantId || 'All plants'}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Maintenance lifecycle dispatch across LOTO isolation, execution, and verification
          </p>
        </div>

        {/* Quick summary counters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-card bg-surface border border-line/30 flex items-center gap-2">
            <span className="text-ink-muted">Total:</span>
            <span className="font-semibold text-ink font-mono">{totalCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-card bg-surface border border-line/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-ink-muted">LOTO:</span>
            <span className="font-semibold text-ink font-mono">{lotoCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-card bg-surface border border-line/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-ink-muted">In progress:</span>
            <span className="font-semibold text-ink font-mono">{inProgressCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Persona Picker Bar */}
      <div className="bg-surface rounded-card p-3 border border-line/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Search & Line filter */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search WO, asset, tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-btn bg-surface-2/60 text-xs text-ink placeholder:text-ink-muted/60 border border-line/30 focus:outline-hidden focus:border-ink/40"
            />
          </div>

          {/* Line Segmented Filter */}
          <div className="bg-surface-2/60 p-0.5 rounded-btn flex items-center gap-0.5 overflow-x-auto text-xs">
            <button
              onClick={() => setLineId('all')}
              className={`px-2.5 py-1 rounded-chip text-xs font-medium transition-all ${
                !lineId || lineId === 'all'
                  ? 'bg-surface text-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              All lines
            </button>
            {lines.map((l) => (
              <button
                key={l.id}
                onClick={() => setLineId(l.id)}
                className={`px-2.5 py-1 rounded-chip text-xs font-medium transition-all font-mono ${
                  lineId === l.id
                    ? 'bg-surface text-ink font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {l.id}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Technician Persona "Who are you?" Picker */}
        {role === 'Technician' ? (
          <div className="flex items-center gap-2 bg-agent/5 border border-agent/20 p-1.5 rounded-card">
            <HardHat className="w-4 h-4 text-agent shrink-0" />
            <span className="text-xs font-medium text-ink shrink-0">Who are you?</span>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="bg-surface text-xs font-medium text-ink px-2 py-1 rounded-btn border border-line/40 focus:outline-hidden"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.name} ({t.role})
                </option>
              ))}
            </select>

            <div className="flex items-center bg-surface-2 p-0.5 rounded-btn text-xs ml-1">
              <button
                onClick={() => setTechFilterMode('my')}
                className={`px-2 py-0.5 rounded-chip text-[11px] font-medium transition-all ${
                  techFilterMode === 'my'
                    ? 'bg-surface text-ink font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                My work orders
              </button>
              <button
                onClick={() => setTechFilterMode('all')}
                className={`px-2 py-0.5 rounded-chip text-[11px] font-medium transition-all ${
                  techFilterMode === 'all'
                    ? 'bg-surface text-ink font-semibold shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                All plant
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-ink-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Viewing as {role}</span>
          </div>
        )}
      </div>

      {/* 3. 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colWorkOrders = filteredWorkOrders.filter((w) =>
            col.statuses.includes(w.status)
          );

          return (
            <div
              key={col.id}
              className="bg-surface-2/30 rounded-card p-3 border border-line/20 space-y-3 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-line/20">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-semibold text-ink">
                    {col.title}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono font-medium bg-surface-2 text-ink-muted">
                    {colWorkOrders.length}
                  </span>
                </div>
              </div>

              {/* Work Order Cards List */}
              <div className="space-y-2.5 flex-1">
                {colWorkOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-ink-muted/60 border border-dashed border-line/30 rounded-btn">
                    No work orders
                  </div>
                ) : (
                  colWorkOrders.map((wo) => {
                    const machine = machineMap.get(wo.machine_id);
                    const tech = wo.assigned_technician ? techMap.get(wo.assigned_technician) : null;
                    const shadowTech = wo.shadow_technician ? techMap.get(wo.shadow_technician) : null;

                    const isP1 = wo.priority === 'P1';
                    const isP2 = wo.priority === 'P2';

                    // Checklist progression
                    const checklist: Array<{ step: string; done: boolean }> = Array.isArray(wo.checklist)
                      ? wo.checklist
                      : [];
                    const doneCount = checklist.filter((s) => s.done).length;

                    return (
                      <div
                        key={wo.id}
                        onClick={() => router.push(`/work-orders/${wo.id}`)}
                        className="bg-surface rounded-card p-3.5 border border-line/30 hover:border-line/70 hover:shadow-xs transition-all cursor-pointer space-y-2.5 group"
                      >
                        {/* Top: WO ID & Priority */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-ink group-hover:underline">
                            {wo.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-chip text-[11px] font-semibold ${
                              isP1
                                ? 'bg-danger/10 text-danger'
                                : isP2
                                ? 'bg-warning/10 text-warning'
                                : 'bg-surface-2 text-ink-muted'
                            }`}
                          >
                            {wo.priority}
                          </span>
                        </div>

                        {/* Machine info */}
                        <div>
                          <div className="text-xs font-medium text-ink truncate">
                            {machine?.name || wo.machine_id}
                          </div>
                          <div className="text-[11px] text-ink-muted font-mono">
                            {wo.machine_id} {machine?.line_id ? `· ${machine.line_id}` : ''}
                          </div>
                        </div>

                        {/* Scheduled Window */}
                        {wo.scheduled_window && (
                          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted bg-surface-2/40 px-2 py-1 rounded-btn">
                            <Calendar className="w-3 h-3 opacity-70 shrink-0" />
                            <span className="truncate">
                              {wo.scheduled_window.date} · {wo.scheduled_window.shift}
                            </span>
                          </div>
                        )}

                        {/* LOTO permit badge if applied, or LOTO pending */}
                        {wo.loto_permit_no ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-ok bg-ok/10 px-2 py-0.5 rounded-chip font-mono">
                            <Shield className="w-3 h-3 shrink-0" />
                            <span className="truncate">{wo.loto_permit_no}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted bg-surface-2/60 px-2 py-0.5 rounded-chip">
                            <Shield className="w-3 h-3 opacity-60 shrink-0" />
                            <span>LOTO pending</span>
                          </div>
                        )}

                        {/* Assigned Tech & Progress */}
                        <div className="pt-2 border-t border-line/20 flex items-center justify-between text-[11px] text-ink-muted">
                          <div className="flex items-center gap-1 truncate max-w-[120px]">
                            <User className="w-3 h-3 opacity-60 shrink-0" />
                            <span className="truncate">{tech?.name || wo.assigned_technician || 'Unassigned'}</span>
                          </div>

                          {checklist.length > 0 && (
                            <span className="font-mono text-[10px]">
                              {doneCount}/{checklist.length} done
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
