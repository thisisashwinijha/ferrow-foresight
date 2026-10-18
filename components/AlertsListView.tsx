'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Alert, Machine, Plant } from '@/lib/types';
import { formatFailureMode } from '@/lib/lifecycle';
import { usePlantContext } from './PlantContext';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
  Eye,
} from 'lucide-react';

interface AlertsListViewProps {
  initialAlerts: Alert[];
  machines: Machine[];
  plants: Plant[];
}

export function AlertsListView({
  initialAlerts,
  machines,
  plants,
}: AlertsListViewProps) {
  const { plantId, setPlantId } = usePlantContext();

  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [plantFilter, setPlantFilter] = useState<string>(plantId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach((m) => map.set(m.id, m));
    return map;
  }, [machines]);

  const plantMap = useMemo(() => {
    const map = new Map<string, Plant>();
    plants.forEach((p) => map.set(p.id, p));
    return map;
  }, [plants]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return initialAlerts.filter((alert) => {
      // Plant filter
      const machine = machineMap.get(alert.machine_id);
      const alertPlant = alert.plant_id || machine?.plant_id;
      if (plantFilter !== 'all' && alertPlant !== plantFilter) {
        return false;
      }

      // Urgency filter
      if (urgencyFilter !== 'all' && alert.urgency !== urgencyFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (alert.status !== 'pending' && alert.status !== 'needs_review') return false;
        } else if (alert.status !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = machine?.name.toLowerCase() || '';
        const mId = alert.machine_id.toLowerCase();
        const aId = alert.id.toLowerCase();
        const fMode = alert.failure_mode.toLowerCase();
        const reason = (alert.reasoning || '').toLowerCase();
        if (
          !mName.includes(q) &&
          !mId.includes(q) &&
          !aId.includes(q) &&
          !fMode.includes(q) &&
          !reason.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialAlerts, plantFilter, urgencyFilter, statusFilter, searchQuery, machineMap]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = initialAlerts.length;
    const p1Count = initialAlerts.filter((a) => a.urgency === 'P1').length;
    const pendingReview = initialAlerts.filter(
      (a) => a.status === 'pending' || a.status === 'needs_review'
    ).length;
    const approved = initialAlerts.filter((a) => a.status === 'approved').length;
    return { total, p1Count, pendingReview, approved };
  }, [initialAlerts]);

  const clearFilters = () => {
    setUrgencyFilter('all');
    setStatusFilter('all');
    setPlantFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-ink tracking-tight">
            Triage & Alerts
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Deterministic triage planner outputs, guardrail verification, and supervisor review.
          </p>
        </div>

        {/* Plant Switcher Quick Bar */}
        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-card border border-line/30 text-xs">
          <button
            onClick={() => {
              setPlantFilter('all');
              setPlantId('all');
            }}
            className={`px-3 py-1 rounded-chip transition-colors ${
              plantFilter === 'all'
                ? 'bg-surface-2 font-semibold text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            All plants
          </button>
          {plants
            .filter((p) => p.status === 'pilot' || p.status === 'shadow')
            .map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPlantFilter(p.id);
                  setPlantId(p.id);
                }}
                className={`px-3 py-1 rounded-chip transition-colors ${
                  plantFilter === p.id
                    ? 'bg-surface-2 font-semibold text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {p.id} ({p.city})
              </button>
            ))}
        </div>
      </div>

      {/* 2. Hero Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
          <p className="text-2xl font-light text-ink mt-2 tabular-nums">
            {metrics.pendingReview}
          </p>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-danger" /> Open P1 Urgency
          </span>
          <p className="text-2xl font-semibold text-danger mt-2 tabular-nums">
            {metrics.p1Count}
          </p>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-ok" /> Approved & Scheduled
          </span>
          <p className="text-2xl font-light text-ok mt-2 tabular-nums">
            {metrics.approved}
          </p>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-agent" /> Total Triaged Alerts
          </span>
          <p className="text-2xl font-light text-ink mt-2 tabular-nums">
            {metrics.total}
          </p>
        </div>
      </div>

      {/* 3. Filter Controls */}
      <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search machine, ID, fault..."
              className="w-full bg-surface-2/60 border border-line/30 rounded-btn pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-hidden focus:border-ink"
            />
          </div>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="bg-surface-2/60 border border-line/30 rounded-btn px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
          >
            <option value="all">All urgencies</option>
            <option value="P1">P1 (Critical action)</option>
            <option value="P2">P2 (Urgent action)</option>
            <option value="P3">P3 (Routine inspection)</option>
            <option value="none">None (Monitor)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-2/60 border border-line/30 rounded-btn px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
          >
            <option value="all">All statuses</option>
            <option value="active">Active (Pending & Needs Review)</option>
            <option value="pending">Pending</option>
            <option value="needs_review">Needs Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suppressed">Suppressed</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(urgencyFilter !== 'all' || statusFilter !== 'all' || plantFilter !== 'all' || searchQuery) && (
          <button
            onClick={clearFilters}
            className="text-xs text-ink-muted hover:text-ink transition-colors font-medium underline underline-offset-4"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* 4. Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-surface rounded-card p-12 border border-line/30 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center mx-auto text-ink-muted">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-ink">No alerts found</h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            No maintenance triage alerts match your current filter settings. Try adjusting urgency, status, or plant filters.
          </p>
          <button
            onClick={clearFilters}
            className="px-3.5 py-1.5 rounded-btn bg-surface-2 hover:bg-surface-3 text-xs font-medium text-ink transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const machine = machineMap.get(alert.machine_id);
            const plantObj = plantMap.get(alert.plant_id || machine?.plant_id || '');
            const hasGuardrailFail = alert.guardrail_result && !alert.guardrail_result.pass;

            return (
              <div
                key={alert.id}
                className="bg-surface rounded-card p-5 border border-line/30 shadow-xs hover:border-line/60 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Urgency Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-chip text-xs font-semibold ${
                        alert.urgency === 'P1'
                          ? 'bg-danger/10 text-danger'
                          : alert.urgency === 'P2'
                          ? 'bg-warning/10 text-warning'
                          : alert.urgency === 'P3'
                          ? 'bg-surface-2 text-ink-muted'
                          : 'bg-ok/10 text-ok'
                      }`}
                    >
                      {alert.urgency}
                    </span>

                    {/* Alert ID */}
                    <span className="font-mono text-xs font-semibold text-ink">
                      {alert.id}
                    </span>

                    {/* Machine Link */}
                    <Link
                      href={`/machines/${alert.machine_id}`}
                      className="font-medium text-xs text-ink hover:underline flex items-center gap-1.5"
                    >
                      <span>{machine?.name || alert.machine_id}</span>
                      <span className="font-mono text-[11px] text-ink-muted">({alert.machine_id})</span>
                    </Link>

                    {/* Plant Badge */}
                    {plantObj && (
                      <span className="px-2 py-0.5 rounded-chip text-[11px] bg-surface-2 text-ink-muted">
                        {plantObj.name}
                      </span>
                    )}

                    {/* AI Agent Marker */}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-chip text-[10px] bg-agent/10 text-agent font-medium">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  </div>

                  {/* Status & Review Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Status Chip */}
                    <span
                      className={`px-2.5 py-0.5 rounded-chip text-xs font-medium ${
                        alert.status === 'approved'
                          ? 'bg-ok/10 text-ok'
                          : alert.status === 'rejected'
                          ? 'bg-ink/10 text-ink-muted'
                          : alert.status === 'needs_review'
                          ? 'bg-warning/10 text-warning font-semibold'
                          : alert.status === 'suppressed'
                          ? 'bg-surface-2 text-ink-muted'
                          : 'bg-surface-2 text-ink font-medium'
                      }`}
                    >
                      {alert.status.replace('_', ' ')}
                    </span>

                    <Link
                      href={`/alerts/${alert.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-ink text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Reason & Action Summary */}
                <div className="text-xs text-ink space-y-1">
                  <p className="font-medium text-ink">
                    Failure mode: <span>{formatFailureMode(alert.failure_mode)}</span> · Action: <span className="capitalize font-semibold">{alert.action_type}</span>
                  </p>
                  <p className="text-ink-muted leading-relaxed line-clamp-2">
                    {alert.reasoning}
                  </p>
                </div>

                {/* Footer specs */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-ink-muted pt-2 border-t border-line/20 gap-2">
                  <div className="flex items-center gap-4">
                    <span>
                      Confidence: <strong className="font-medium text-ink">{(alert.confidence * 100).toFixed(0)}%</strong>
                    </span>
                    {alert.assigned_technician && (
                      <span>
                        Tech: <strong className="font-mono text-ink">{alert.assigned_technician}</strong>
                      </span>
                    )}
                    {alert.proposed_window && (
                      <span>
                        Window: <strong className="text-ink">{alert.proposed_window.date} (Shift {alert.proposed_window.shift})</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {hasGuardrailFail ? (
                      <span className="flex items-center gap-1 text-warning font-medium">
                        <AlertTriangle className="w-3 h-3" /> Guardrail Needs Review
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-ok font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Guardrails Passed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
