'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Machine,
  Plant,
  Line,
  SensorReading,
  Observation,
  MaintenanceLog,
  Alert,
  WorkOrder,
  Spares,
  KnowledgeLibrary,
  PmPlan,
  Technician,
} from '@/lib/types';
import { useMachineTelemetry } from '@/lib/simulator';
import { getVibrationSeverity, getTemperatureSeverity } from '@/lib/risk';
import { formatFailureMode, formatObservationTag } from '@/lib/lifecycle';
import { generateMachineSummary } from '@/lib/copilotService';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  FileText,
  Gauge,
  HelpCircle,
  Package,
  Radio,
  Shield,
  Sparkles,
  Thermometer,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line as RechartsLine,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';

interface MachineHistoryCardProps {
  machine: Machine;
  plant?: Plant;
  line?: Line;
  initialReadings: SensorReading[];
  observations: Observation[];
  maintenanceLogs: MaintenanceLog[];
  alerts: Alert[];
  workOrders: WorkOrder[];
  spares: Spares[];
  knowledge: KnowledgeLibrary[];
  pmPlans: PmPlan[];
  technicians: Technician[];
}

export function MachineHistoryCard({
  machine,
  plant,
  line,
  initialReadings,
  observations,
  maintenanceLogs,
  alerts,
  workOrders,
  spares,
  knowledge,
  pmPlans,
  technicians,
}: MachineHistoryCardProps) {
  const [activeTab, setActiveTab] = useState<'maintenance' | 'alerts' | 'spares' | 'knowledge'>('maintenance');

  // Live Simulator Hook for sensor machines
  const latestSensorReading = initialReadings && initialReadings.length > 0 ? initialReadings[initialReadings.length - 1] : null;
  const initialVib = latestSensorReading ? latestSensorReading.vibration_mm_s : (machine.vibration_baseline || 1.5);
  const initialTemp = latestSensorReading ? latestSensorReading.temperature_c : (machine.temperature_baseline || 55);

  const liveTelemetry = useMachineTelemetry(
    machine.id,
    initialVib,
    initialTemp,
    machine.has_sensors
  );

  // Merge live telemetry into readings chart data
  const chartData = useMemo(() => {
    if (!machine.has_sensors) return [];
    const points = initialReadings.map((r) => ({
      date: r.date.slice(5), // MM-DD
      vibration: r.vibration_mm_s,
      temperature: r.temperature_c,
      isLive: false,
    }));

    if (liveTelemetry && points.length > 0) {
      // Append or update live reading
      points.push({
        date: 'Live',
        vibration: liveTelemetry.vibration_mm_s,
        temperature: liveTelemetry.temperature_c,
        isLive: true,
      });
    }
    return points;
  }, [initialReadings, liveTelemetry, machine.has_sensors]);

  const currentVib = machine.has_sensors ? liveTelemetry.vibration_mm_s : null;
  const currentTemp = machine.has_sensors ? liveTelemetry.temperature_c : null;
  const vibSeverity = currentVib ? getVibrationSeverity(currentVib) : 'normal';
  const tempSeverity = currentTemp
    ? getTemperatureSeverity(currentTemp, machine.temperature_baseline || 50)
    : 'normal';

  // Helper maps
  const techMap = useMemo(() => {
    const map = new Map<string, Technician>();
    technicians.forEach((t) => map.set(t.id, t));
    return map;
  }, [technicians]);

  // Reliability calculations
  const totalDowntimeHours = useMemo(() => {
    const total = maintenanceLogs.reduce((acc, l) => acc + (l.downtime_hours || 0), 0);
    return Number(total.toFixed(1));
  }, [maintenanceLogs]);

  const totalMaintenanceCost = useMemo(() => {
    return maintenanceLogs.reduce((acc, l) => acc + (l.cost_usd || 0), 0);
  }, [maintenanceLogs]);

  const mtbfHours = useMemo(() => {
    const breakdowns = maintenanceLogs.filter((l) => l.unplanned || l.type === 'BM');
    if (breakdowns.length === 0) return 1440; // ~2 months
    return Math.round(720 / breakdowns.length);
  }, [maintenanceLogs]);

  const mttrHours = useMemo(() => {
    const breakdowns = maintenanceLogs.filter((l) => l.unplanned || l.type === 'BM');
    if (breakdowns.length === 0) return 0;
    const totalHours = breakdowns.reduce((acc, l) => acc + (l.downtime_hours || 0), 0);
    return Number((totalHours / breakdowns.length).toFixed(1));
  }, [maintenanceLogs]);

  // AI Summary synthesis using copilotService
  const aiSummaryText = useMemo(() => {
    const copilotResp = generateMachineSummary(machine.id, machine.plant_id || 'P-07');
    return copilotResp.answer;
  }, [machine]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted">
        <Link
          href={`/?plant=${plant?.id || 'P-07'}&line=${line?.id || 'all'}`}
          className="flex items-center gap-1.5 hover:text-ink transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Control room ({plant?.name || machine.plant_id})</span>
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{line?.name || machine.line_id}</span>
        <span>/</span>
        <span className="font-mono text-ink font-semibold">{machine.id}</span>
      </nav>

      {/* 2. Machine Header Card */}
      <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[26px] font-semibold text-ink tracking-tight">
                {machine.name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded-chip bg-surface-2 text-ink-muted font-medium">
                {machine.id}
              </span>

              {/* Sensor vs Legacy Tag */}
              {machine.has_sensors ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-chip text-xs font-medium bg-ok/10 text-ok">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Sensor-monitored (IoT)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-chip text-xs font-medium bg-ink/10 text-ink-muted">
                  <Eye className="w-3 h-3" />
                  Legacy asset (Inspection)
                </span>
              )}

              {/* Criticality */}
              <span
                className={`px-2 py-0.5 rounded-chip text-xs font-medium ${
                  machine.criticality === 'A'
                    ? 'bg-danger/10 text-danger'
                    : machine.criticality === 'B'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-surface-2 text-ink-muted'
                }`}
              >
                Criticality {machine.criticality}
              </span>

              {/* Strategy */}
              <span className="px-2 py-0.5 rounded-chip text-xs font-medium bg-surface-2 text-ink">
                {machine.strategy} Strategy
              </span>
            </div>

            <p className="text-xs text-ink-muted mt-1.5 flex items-center gap-3">
              <span>{line?.name || machine.line_id}</span>
              <span>·</span>
              <span>Make: {machine.make}</span>
              <span>·</span>
              <span>Installed: {machine.install_year}</span>
              <span>·</span>
              <span>PM Interval: {machine.pm_interval_days} days</span>
            </p>
          </div>

          {/* Health & Risk Badges */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-card bg-surface-2/60 border border-line/20 text-center min-w-[100px]">
              <span className="text-[11px] text-ink-muted block font-medium">
                Health
              </span>
              <span
                className={`text-2xl font-light tabular-nums ${
                  machine.health_score < 70 ? 'text-warning font-normal' : 'text-ok'
                }`}
              >
                {machine.health_score}%
              </span>
            </div>

            <div className="px-4 py-2 rounded-card bg-surface-2/60 border border-line/20 text-center min-w-[100px]">
              <span className="text-[11px] text-ink-muted block font-medium">
                Risk score
              </span>
              <span
                className={`text-2xl font-light tabular-nums ${
                  machine.risk_score > 70
                    ? 'text-danger font-medium'
                    : machine.risk_score > 40
                    ? 'text-warning'
                    : 'text-ink-muted'
                }`}
              >
                {machine.risk_score}
              </span>
            </div>
          </div>
        </div>

        {/* AI Health Summary Card */}
        <div className="rounded-btn bg-agent/5 border border-agent/20 p-3.5 flex items-start gap-3">
          <div className="p-1.5 rounded-chip bg-agent/15 text-agent shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-agent">
                Agent summary
              </span>
              <span className="text-[10px] text-ink-muted">· Live automated synthesis</span>
            </div>
            <p className="text-xs text-ink leading-relaxed">
              {aiSummaryText}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Primary Section: Telemetry Chart OR Observations Timeline */}
      {machine.has_sensors ? (
        <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-ink-muted" />
              <h2 className="text-base font-semibold text-ink">
                Live Telemetry & ISO 10816 Vibration Analysis
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-ink-muted font-medium">
                <span className="w-2 h-2 rounded-full bg-ok animate-ping" />
                Live: {currentVib} mm/s · {currentTemp}°C
              </span>
              <span
                className={`px-2 py-0.5 rounded-chip text-xs font-medium ${
                  vibSeverity === 'critical'
                    ? 'bg-danger/10 text-danger'
                    : vibSeverity === 'alarm'
                    ? 'bg-danger/10 text-danger'
                    : vibSeverity === 'watch'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-ok/10 text-ok'
                }`}
              >
                ISO Band: {vibSeverity}
              </span>
            </div>
          </div>

          {/* Recharts Vibration & Temp Chart */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} opacity={0.7} />
                <YAxis
                  yAxisId="vib"
                  domain={[0, 9]}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  opacity={0.7}
                  label={{ value: 'Vib (mm/s)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'currentColor', opacity: 0.6 } }}
                />
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  domain={[40, 95]}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  opacity={0.7}
                  label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: 'currentColor', opacity: 0.6 } }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-surface border border-line/50 p-2.5 rounded-btn shadow-lg text-xs space-y-1">
                          <p className="font-semibold text-ink">{label}</p>
                          <p className="text-ink-muted">
                            Vibration: <span className="font-mono font-medium text-ink">{payload[0]?.value} mm/s</span>
                          </p>
                          <p className="text-ink-muted">
                            Temperature: <span className="font-mono font-medium text-ink">{payload[1]?.value} °C</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* ISO 10816 subtle shading */}
                <ReferenceArea yAxisId="vib" y1={0} y2={2.8} fill="#10b981" fillOpacity={0.04} />
                <ReferenceArea yAxisId="vib" y1={2.8} y2={4.5} fill="#f59e0b" fillOpacity={0.06} />
                <ReferenceArea yAxisId="vib" y1={4.5} y2={7.1} fill="#f97316" fillOpacity={0.08} />
                <ReferenceArea yAxisId="vib" y1={7.1} y2={9.0} fill="#ef4444" fillOpacity={0.12} />

                {/* Vibration baseline */}
                {machine.vibration_baseline && (
                  <ReferenceLine
                    yAxisId="vib"
                    y={machine.vibration_baseline}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: `Baseline (${machine.vibration_baseline})`, fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }}
                  />
                )}

                {/* Vibration Trend Line */}
                <RechartsLine
                  yAxisId="vib"
                  type="monotone"
                  dataKey="vibration"
                  stroke={vibSeverity === 'critical' || vibSeverity === 'alarm' ? '#ef4444' : '#3b82f6'}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />

                {/* Temperature Trend Line */}
                <RechartsLine
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-ink-muted border-t border-line/20 pt-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Vibration trend (mm/s)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Temperature (°C)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-500" /> Baseline reference
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Good &lt;2.8</span>
              <span>·</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">Watch 2.8–4.5</span>
              <span>·</span>
              <span className="text-orange-600 dark:text-orange-400 font-medium">Alarm 4.5–7.1</span>
              <span>·</span>
              <span className="text-red-600 dark:text-red-400 font-medium">Critical &gt;7.1</span>
            </div>
          </div>
        </div>
      ) : (
        /* Observations Timeline for Legacy Machine */
        <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-ink-muted" />
              <h2 className="text-base font-semibold text-ink">
                Technician Observations & Sensory Rounds
              </h2>
            </div>
            <span className="text-xs text-ink-muted">
              {observations.length} recorded observation(s)
            </span>
          </div>

          {observations.length === 0 ? (
            <div className="p-8 text-center bg-surface-2/40 rounded-btn text-ink-muted text-xs">
              No sensory observations recorded yet for this asset. Rounds are up to date.
            </div>
          ) : (
            <div className="space-y-3">
              {observations.map((obs) => {
                const tech = techMap.get(obs.technician_id);
                return (
                  <div
                    key={obs.id}
                    className="p-4 rounded-btn bg-surface-2/50 border border-line/20 space-y-2 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">
                          {tech?.name || obs.technician_id}
                        </span>
                        <span className="text-ink-muted">· {tech?.role || 'Technician'}</span>
                      </div>
                      <span className="text-[11px] text-ink-muted font-mono">
                        {new Date(obs.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-ink leading-relaxed">
                      {obs.note}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {obs.symptom_tags?.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-chip text-[11px] font-medium bg-surface-2 text-ink border border-line/30"
                        >
                          {formatObservationTag(tag)}
                        </span>
                      ))}
                      <span className="text-[10px] text-ink-muted ml-auto">
                        Source: {obs.source}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Machine Reliability & Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> MTBF (Mean Time Between Failures)
          </span>
          <p className="text-2xl font-light text-ink mt-2 tabular-nums">
            {mtbfHours} <span className="text-xs text-ink-muted font-normal">hours</span>
          </p>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> MTTR (Mean Time To Repair)
          </span>
          <p className="text-2xl font-light text-ink mt-2 tabular-nums">
            {mttrHours} <span className="text-xs text-ink-muted font-normal">hours</span>
          </p>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Cumulative Downtime
          </span>
          <p className="text-2xl font-light text-ink mt-2 tabular-nums">
            {totalDowntimeHours} <span className="text-xs text-ink-muted font-normal">hours</span>
          </p>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line/30 shadow-xs">
          <span className="text-xs text-ink-muted flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Maintenance Spend
          </span>
          <p className="text-2xl font-light text-ink mt-2 tabular-nums">
            ${totalMaintenanceCost.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 5. Tabs: Maintenance Timeline, Related Alerts, Spares, Knowledge */}
      <div className="bg-surface rounded-card border border-line/30 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-line/30 px-6 pt-3 gap-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'maintenance'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Maintenance Timeline ({maintenanceLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Alerts & Work Orders ({alerts.length + workOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('spares')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'spares'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Compatible Spares ({spares.length})
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'knowledge'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            Knowledge Library ({knowledge.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB 1: Maintenance Timeline */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              {maintenanceLogs.length === 0 ? (
                <p className="text-xs text-ink-muted py-8 text-center">No maintenance logs found for this asset.</p>
              ) : (
                <div className="space-y-3">
                  {maintenanceLogs.map((log) => {
                    const tech = techMap.get(log.technician_id);
                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-btn bg-surface-2/40 border border-line/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink font-mono text-[11px]">{log.id}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-chip text-[11px] font-medium ${
                                log.type === 'BM'
                                  ? 'bg-danger/10 text-danger'
                                  : log.type === 'CBM'
                                  ? 'bg-agent/10 text-agent'
                                  : 'bg-ok/10 text-ok'
                              }`}
                            >
                              {log.type}
                            </span>
                            <span className="font-medium text-ink">{log.finding}</span>
                            {log.failure_mode && (
                              <span className="text-ink-muted">· {log.failure_mode}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink-muted">{log.notes}</p>
                        </div>

                        <div className="flex items-center gap-4 text-ink-muted shrink-0 text-[11px]">
                          <span>Tech: {tech?.name || log.technician_id}</span>
                          <span>Downtime: {log.downtime_hours}h</span>
                          <span>Cost: ${log.cost_usd}</span>
                          <span className="font-mono">{log.date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Related Alerts and Work Orders */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              {/* Active Alerts */}
              <div>
                <h3 className="text-xs font-semibold text-ink mb-3">
                  Alerts ({alerts.length})
                </h3>
                {alerts.length === 0 ? (
                  <p className="text-xs text-ink-muted py-3">No alerts recorded for this machine.</p>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <Link
                        key={alert.id}
                        href={`/alerts/${alert.id}`}
                        className="block p-3.5 rounded-btn bg-surface-2/40 border border-line/20 hover:bg-surface-2 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-ink">{alert.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded-chip text-xs font-semibold ${
                                alert.urgency === 'P1'
                                   ? 'bg-danger/10 text-danger'
                                   : alert.urgency === 'P2'
                                   ? 'bg-warning/10 text-warning'
                                   : 'bg-surface-2 text-ink-muted'
                              }`}
                            >
                              {alert.urgency}
                            </span>
                            <span className="font-medium text-ink">{formatFailureMode(alert.failure_mode)}</span>
                            <span className="text-ink-muted">· Action: {alert.action_type}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-chip text-xs font-medium capitalize ${
                              alert.status === 'approved'
                                ? 'bg-ok/10 text-ok'
                                : alert.status === 'rejected'
                                ? 'bg-ink/10 text-ink-muted'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {alert.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 truncate">
                          {alert.recommended_action}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Work Orders */}
              <div>
                <h3 className="text-xs font-semibold text-ink mb-3">
                  Work orders ({workOrders.length})
                </h3>
                {workOrders.length === 0 ? (
                  <p className="text-xs text-ink-muted py-3">No work orders linked to this machine.</p>
                ) : (
                  <div className="space-y-2">
                    {workOrders.map((wo) => (
                      <div
                        key={wo.id}
                        className="p-3.5 rounded-btn bg-surface-2/40 border border-line/20 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-semibold text-ink">{wo.id}</span>
                          <span className="px-2 py-0.5 rounded-chip bg-surface-2 font-medium text-ink">
                            {wo.type}
                          </span>
                          <span className="text-ink-muted">Alert: {wo.alert_id}</span>
                          {wo.loto_permit_no ? (
                            <span className="px-1.5 py-0.5 rounded-chip text-[11px] bg-ok/10 text-ok font-mono">
                              {wo.loto_permit_no}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-chip text-[11px] bg-surface-2 text-ink-muted">
                              LOTO pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-ink-muted">Status:</span>
                          <span className="font-medium text-ink capitalize text-[11px]">{wo.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Compatible Spares */}
          {activeTab === 'spares' && (
            <div className="space-y-4">
              {spares.length === 0 ? (
                <p className="text-xs text-ink-muted py-8 text-center">No compatible spares found for equipment type "{machine.type}".</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-ink-muted border-b border-line/30">
                      <tr>
                        <th className="pb-2 font-medium">Part ID / No</th>
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 font-medium text-right">In Stock</th>
                        <th className="pb-2 font-medium text-right">Min Level</th>
                        <th className="pb-2 font-medium text-right">Unit Cost</th>
                        <th className="pb-2 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/20">
                      {spares.map((spare) => {
                        const isStockout = spare.stock <= 0;
                        const isBelowMin = spare.stock < spare.min_level;
                        return (
                          <tr key={spare.id} className="hover:bg-surface-2/40 transition-colors">
                            <td className="py-2.5 font-mono text-ink font-semibold">{spare.id}</td>
                            <td className="py-2.5 text-ink font-medium">{spare.name}</td>
                            <td className="py-2.5 text-ink-muted">{spare.category}</td>
                            <td className="py-2.5 text-right font-mono tabular-nums font-semibold">
                              {spare.stock}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-ink-muted">
                              {spare.min_level}
                            </td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-ink-muted">
                              ${spare.unit_cost_usd}
                            </td>
                            <td className="py-2.5 text-center">
                              {isStockout ? (
                                <span className="px-2 py-0.5 rounded-chip text-[11px] font-medium bg-danger/10 text-danger">
                                  Stockout
                                </span>
                              ) : isBelowMin ? (
                                <span className="px-2 py-0.5 rounded-chip text-[11px] font-medium bg-warning/10 text-warning">
                                  Below min
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-chip text-[11px] font-medium bg-ok/10 text-ok">
                                  Available
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Matching Knowledge Library Entries */}
          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              {knowledge.length === 0 ? (
                <p className="text-xs text-ink-muted py-8 text-center">No veteran knowledge records registered for type "{machine.type}".</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {knowledge.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-btn bg-surface-2/40 border border-line/20 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink capitalize">
                          {item.failure_mode.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          Captured from: {item.captured_from}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-ink-muted text-[11px]">
                        {item.sound && (
                          <p>
                            <strong className="text-ink font-medium">Acoustic / Sound:</strong> {item.sound}
                          </p>
                        )}
                        {item.smell && (
                          <p>
                            <strong className="text-ink font-medium">Smell:</strong> {item.smell}
                          </p>
                        )}
                        {item.feel_visual && (
                          <p>
                            <strong className="text-ink font-medium">Tactile / Visual:</strong> {item.feel_visual}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
