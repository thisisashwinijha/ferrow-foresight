'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Machine,
  Plant,
  Line,
  Technician,
  Certification,
  Spares,
  WorkOrder,
} from '@/lib/types';
import { usePlantContext } from './PlantContext';
import { useToast } from './ToastContext';
import {
  runAllGuardrails,
  GuardrailCheckResult,
  STANDARD_LOTO_CHECKLIST,
} from '@/lib/guardrails';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Lock,
  Package,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
  XCircle,
  Check,
  AlertCircle,
} from 'lucide-react';

interface AlertDetailViewProps {
  initialAlert: Alert;
  machine: Machine;
  plant?: Plant;
  line?: Line;
  technicians: Technician[];
  certifications: Certification[];
  liveSpares: Spares[];
  existingWorkOrder?: WorkOrder;
}

export function AlertDetailView({
  initialAlert,
  machine,
  plant,
  line,
  technicians,
  certifications,
  liveSpares,
  existingWorkOrder,
}: AlertDetailViewProps) {
  const router = useRouter();
  const { role, setRole } = usePlantContext();
  const { showToast } = useToast();

  const [alert, setAlert] = useState<Alert>(initialAlert);
  const [createdWorkOrder, setCreatedWorkOrder] = useState<WorkOrder | undefined>(existingWorkOrder);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Override technician picker state
  const [selectedTechOverride, setSelectedTechOverride] = useState<string>(
    alert.assigned_technician || ''
  );

  // Group certifications by technician
  const certsByTech = useMemo(() => {
    const map = new Map<string, Certification[]>();
    certifications.forEach((c) => {
      const list = map.get(c.technician_id) || [];
      list.push(c);
      map.set(c.technician_id, list);
    });
    return map;
  }, [certifications]);

  // Run dynamic guardrails with live context and selected technician
  const guardrailOutcome = useMemo(() => {
    const currentTech = selectedTechOverride || alert.assigned_technician;
    const techObj = technicians.find((t) => t.id === currentTech);

    return runAllGuardrails(
      {
        ...alert,
        assigned_technician: currentTech,
      },
      {
        machineCriticality: machine.criticality,
        technicianShift: techObj?.shift || null,
        technicianCerts: certifications,
        liveSpares,
        userRole: role,
        referenceDate: '2026-10-18',
      }
    );
  }, [alert, selectedTechOverride, machine.criticality, technicians, certifications, liveSpares, role]);

  // Check role authorization for Criticality A + P1
  const isCritAP1 = machine.criticality === 'A' && alert.urgency === 'P1';
  const isAuthorizedRole = role === 'Plant Head' || role === 'Head of Plant Operations';
  const requiresPlantHeadApproval = isCritAP1 && !isAuthorizedRole;

  // Qualified technicians list for override picker
  const qualifiedTechnicians = useMemo(() => {
    const requiredCerts = alert.required_certifications || [];
    return technicians.map((tech) => {
      const techCerts = certsByTech.get(tech.id) || [];
      const validCerts = techCerts.filter(
        (c) => new Date(c.valid_until) >= new Date('2026-10-18')
      );
      const hasAllRequired = requiredCerts.every((req) =>
        validCerts.some((c) => c.certification.toLowerCase() === req.toLowerCase())
      );
      const shiftMatches =
        !alert.proposed_window?.shift ||
        tech.shift.toUpperCase() === alert.proposed_window.shift.toUpperCase();

      return {
        ...tech,
        isQualified: hasAllRequired && shiftMatches,
        missingCerts: requiredCerts.filter(
          (req) => !validCerts.some((c) => c.certification.toLowerCase() === req.toLowerCase())
        ),
        shiftMatches,
      };
    });
  }, [technicians, certsByTech, alert.required_certifications, alert.proposed_window]);

  // Assigned tech details
  const activeTechId = selectedTechOverride || alert.assigned_technician;
  const activeTech = technicians.find((t) => t.id === activeTechId);
  const activeTechCerts = activeTechId ? certsByTech.get(activeTechId) || [] : [];

  // Shadow tech details
  const shadowTech = technicians.find((t) => t.id === alert.shadow_technician);

  // Spares stock check against live database
  const liveSparesMap = useMemo(() => {
    const map = new Map<string, Spares>();
    liveSpares.forEach((s) => map.set(s.id, s));
    return map;
  }, [liveSpares]);

  // Handler: Approve Alert
  const handleApprove = async () => {
    if (requiresPlantHeadApproval) {
      showToast('P1 alerts on Criticality A assets require Plant Head approval.', 'warning');
      return;
    }

    setIsApproving(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decided_by: role,
          decision_notes: `Approved by ${role} via Triage console`,
          assigned_technician: selectedTechOverride || alert.assigned_technician,
          user_role: role,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAlert(data.alert);
        setCreatedWorkOrder(data.workOrder);
        showToast(`Alert approved. Work order ${data.workOrder.id} scheduled!`, 'info');
      } else {
        showToast(data.error || 'Failed to approve alert', 'warning');
      }
    } catch {
      showToast('Network error while approving alert', 'warning');
    } finally {
      setIsApproving(false);
    }
  };

  // Handler: Reject Alert
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('Please enter a rejection reason', 'warning');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decided_by: role,
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAlert(data.alert);
        setShowRejectModal(false);
        showToast(`Alert ${alert.id} rejected with reason`, 'info');
      } else {
        showToast(data.error || 'Failed to reject alert', 'warning');
      }
    } catch {
      showToast('Network error while rejecting alert', 'warning');
    } finally {
      setIsRejecting(false);
    }
  };

  const isPending = alert.status === 'pending' || alert.status === 'needs_review';
  const hasGuardrailNeedsReview = !guardrailOutcome.pass && alert.status !== 'approved';

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted">
        <Link
          href={`/alerts?plant=${plant?.id || 'P-07'}`}
          className="flex items-center gap-1.5 hover:text-ink transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Triage & Alerts</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-ink font-semibold">{alert.id}</span>
        <span>·</span>
        <Link
          href={`/machines/${machine.id}`}
          className="hover:underline text-ink"
        >
          {machine.name} ({machine.id})
        </Link>
      </nav>

      {/* 2. Top Alert Header Card */}
      <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`px-3 py-1 rounded-chip text-xs font-semibold ${
                  alert.urgency === 'P1'
                    ? 'bg-danger/10 text-danger'
                    : alert.urgency === 'P2'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-surface-2 text-ink-muted'
                }`}
              >
                {alert.urgency} Urgency
              </span>

              <h1 className="text-2xl font-semibold text-ink tracking-tight">
                {alert.id} · {alert.failure_mode.replace('_', ' ').toUpperCase()}
              </h1>

              {(() => {
                const isAlertResolved =
                  alert.status === 'resolved' ||
                  (alert.status === 'approved' && createdWorkOrder?.status === 'closed');
                return (
                  <span
                    className={`px-2.5 py-0.5 rounded-chip text-xs font-medium ${
                      isAlertResolved
                        ? 'bg-ok/15 text-ok font-semibold'
                        : alert.status === 'approved'
                        ? 'bg-ok/10 text-ok'
                        : alert.status === 'rejected'
                        ? 'bg-ink/10 text-ink-muted'
                        : alert.status === 'needs_review'
                        ? 'bg-warning/10 text-warning font-semibold'
                        : 'bg-surface-2 text-ink'
                    }`}
                  >
                    {isAlertResolved ? 'Resolved' : alert.status.replace('_', ' ')}
                  </span>
                );
              })()}

              {/* AI Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-xs font-medium bg-agent/10 text-agent">
                <Sparkles className="w-3 h-3" /> AI Triage Plan
              </span>
            </div>

            <p className="text-xs text-ink-muted flex items-center gap-3">
              <span>Machine: <Link href={`/machines/${machine.id}`} className="text-ink font-medium hover:underline">{machine.name} ({machine.id})</Link></span>
              <span>·</span>
              <span>Criticality {machine.criticality}</span>
              <span>·</span>
              <span>Trigger: {alert.trigger}</span>
              <span>·</span>
              <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
            </p>
          </div>

          {/* Quick Metrics (Confidence & Cost Avoidance) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-card bg-surface-2/60 border border-line/20 text-center min-w-[110px]">
              <span className="text-[11px] text-ink-muted block uppercase font-medium">Confidence</span>
              <span className="text-2xl font-light text-ink tabular-nums">
                {(alert.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="px-4 py-2 rounded-card bg-surface-2/60 border border-line/20 text-center min-w-[130px]">
              <span className="text-[11px] text-ink-muted block uppercase font-medium">Est. Downtime Risk</span>
              <span className="text-2xl font-light text-danger tabular-nums">
                ${(alert.est_failure_cost_usd / 1000).toFixed(0)}k
              </span>
            </div>
          </div>
        </div>

        {/* Plant Head Approval Notice if Criticality A & P1 */}
        {requiresPlantHeadApproval && isPending && (
          <div className="p-3.5 rounded-btn bg-danger/10 border border-danger/30 text-xs text-danger flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                <strong>Plant Head Approval Required:</strong> Asset {machine.id} is Criticality A with P1 urgency. Current role is <em>{role}</em>.
              </span>
            </div>
            <button
              onClick={() => setRole('Plant Head')}
              className="px-3 py-1 rounded-chip bg-danger text-white font-medium hover:opacity-90 shrink-0 text-xs transition-opacity"
            >
              Switch role to Plant Head
            </button>
          </div>
        )}

        {/* Existing Work Order banner if already approved */}
        {createdWorkOrder && (
          <div className={`p-4 rounded-btn text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            createdWorkOrder.status === 'closed'
              ? 'bg-ok/10 border border-ok/30 text-ok'
              : 'bg-surface-2 border border-line/40 text-ink'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
              <span>
                {createdWorkOrder.status === 'closed' ? (
                  <>Work order <strong>{createdWorkOrder.id}</strong> completed & closed. Machine restored to nominal baseline.</>
                ) : (
                  <>
                    Work order <strong>{createdWorkOrder.id}</strong> scheduled for {createdWorkOrder.scheduled_window?.date} (Shift {createdWorkOrder.scheduled_window?.shift}).
                    {createdWorkOrder.loto_permit_no && ` LOTO permit: ${createdWorkOrder.loto_permit_no}.`}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-chip bg-surface-3 text-ink">
                {createdWorkOrder.status.replace('_', ' ').toUpperCase()}
              </span>
              <Link
                href={`/work-orders/${createdWorkOrder.id}`}
                className="font-medium text-xs px-2.5 py-1 rounded-btn bg-ink text-canvas hover:opacity-90 transition-opacity"
              >
                View work order →
              </Link>
            </div>
          </div>
        )}

        {/* Rejection banner if rejected */}
        {alert.status === 'rejected' && (
          <div className="p-4 rounded-btn bg-surface-2 border border-line/40 text-xs text-ink space-y-1">
            <div className="flex items-center gap-2 text-danger font-medium">
              <XCircle className="w-4 h-4" />
              <span>Alert Rejected by {alert.decided_by || 'Supervisor'}</span>
            </div>
            <p className="text-ink-muted pl-6">
              Reason: "{alert.decision_reason || 'No reason specified'}"
            </p>
          </div>
        )}
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Evidence, Reasoning, Recommended Action, Spares, Cost (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reasoning & Recommended Action */}
          <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <FileText className="w-4 h-4 text-ink-muted" /> Reasoning & Recommended Action
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] text-agent font-medium">
                <Sparkles className="w-3 h-3" /> AI Generated
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">
                  Clinical Assessment
                </span>
                <p className="text-xs text-ink leading-relaxed p-3.5 rounded-btn bg-surface-2/40 border border-line/20">
                  {alert.reasoning}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">
                  Recommended Technician Action
                </span>
                <div className="p-3.5 rounded-btn bg-surface-2/40 border border-line/20 space-y-2">
                  <p className="text-xs text-ink font-medium leading-relaxed">
                    {alert.recommended_action}
                  </p>
                  {alert.loto_required && (
                    <div className="flex items-center gap-1.5 text-danger text-[11px] font-semibold pt-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lockout / Tagout (LOTO) mandatory before mechanical work.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Evidence List */}
          <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-3">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Shield className="w-4 h-4 text-ink-muted" /> Supporting Evidence ({alert.evidence?.length || 0})
            </h2>

            <div className="space-y-2 pt-1">
              {alert.evidence?.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-btn bg-surface-2/40 border border-line/20 flex items-start gap-3 text-xs"
                >
                  <span className="font-mono font-semibold text-ink px-1.5 py-0.5 rounded-chip bg-surface text-[11px] shrink-0">
                    {item.id}
                  </span>
                  <div className="space-y-0.5 flex-1">
                    <span className="text-[11px] font-medium text-ink-muted uppercase">
                      {item.type}
                    </span>
                    <p className="text-ink leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Comparison Visual (Failure vs Intervention) */}
          <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-ink-muted" /> Cost Impact & ROI Analysis
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-btn bg-surface-2/50 border border-line/20 space-y-1">
                <span className="text-[11px] text-ink-muted font-medium uppercase">
                  Unplanned Failure Cost
                </span>
                <p className="text-2xl font-light text-danger tabular-nums">
                  ${alert.est_failure_cost_usd.toLocaleString()}
                </p>
                <span className="text-[10px] text-ink-muted block">
                  Based on machine criticality {machine.criticality} downtime risk
                </span>
              </div>

              <div className="p-4 rounded-btn bg-surface-2/50 border border-line/20 space-y-1">
                <span className="text-[11px] text-ink-muted font-medium uppercase">
                  Planned Intervention Cost
                </span>
                <p className="text-2xl font-light text-ok tabular-nums">
                  ${alert.est_intervention_cost_usd.toLocaleString()}
                </p>
                <span className="text-[10px] text-ink-muted block">
                  Parts + technician labor cost
                </span>
              </div>
            </div>

            {/* Savings Ratio Visual */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-ink-muted">Net Avoided Cost</span>
                <span className="text-ok font-semibold">
                  +${(alert.est_failure_cost_usd - alert.est_intervention_cost_usd).toLocaleString()} (
                  {(
                    ((alert.est_failure_cost_usd - alert.est_intervention_cost_usd) /
                      alert.est_failure_cost_usd) *
                    100
                  ).toFixed(1)}
                  % savings)
                </span>
              </div>
              <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-ok h-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        5,
                        100 -
                          (alert.est_intervention_cost_usd / alert.est_failure_cost_usd) * 100
                      )
                    )}%`,
                  }}
                />
                <div
                  className="bg-danger h-full"
                  style={{
                    width: `${Math.min(
                      95,
                      Math.max(
                        5,
                        (alert.est_intervention_cost_usd / alert.est_failure_cost_usd) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Spares Re-check Table */}
          <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-3">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Package className="w-4 h-4 text-ink-muted" /> Live Spares Verification
            </h2>

            {alert.spares_check && alert.spares_check.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-ink-muted uppercase border-b border-line/30">
                    <tr>
                      <th className="pb-2 font-medium">Part ID</th>
                      <th className="pb-2 font-medium">Part Name</th>
                      <th className="pb-2 font-medium text-right">Model Qty</th>
                      <th className="pb-2 font-medium text-right">Live Stock</th>
                      <th className="pb-2 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/20">
                    {alert.spares_check.map((part) => {
                      const live = liveSparesMap.get(part.part_id);
                      const currentStock = live !== undefined ? live.stock : part.stock;
                      const isStockout = currentStock <= 0;

                      return (
                        <tr key={part.part_id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-2.5 font-mono text-ink font-semibold">{part.part_id}</td>
                          <td className="py-2.5 text-ink">{part.name || live?.name || 'Part'}</td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-ink-muted">
                            {part.stock}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-ink">
                            {currentStock}
                          </td>
                          <td className="py-2.5 text-center">
                            {isStockout ? (
                              <span className="px-2 py-0.5 rounded-chip text-[11px] font-medium bg-danger/10 text-danger">
                                Stockout (Blocked)
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
            ) : (
              <p className="text-xs text-ink-muted">No replacement parts required for this intervention.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Guardrails, Technician Assignment, Window & Actions (1 Col) */}
        <div className="space-y-6">
          {/* Action Approval Card */}
          {isPending && (
            <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">
                Intervention Approval
              </h2>

              <p className="text-xs text-ink-muted leading-relaxed">
                Approving this alert will automatically generate a scheduled work order with standard 6-step LOTO checklist, reserve required spares, and dispatch to the assigned technician.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleApprove}
                  disabled={isApproving || requiresPlantHeadApproval}
                  className={`w-full py-2.5 rounded-btn text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    requiresPlantHeadApproval
                      ? 'bg-surface-2 text-ink-muted cursor-not-allowed opacity-60'
                      : 'bg-ink text-canvas hover:opacity-90 shadow-xs'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isApproving ? 'Approving...' : 'Approve & Schedule Work Order'}</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isRejecting}
                  className="w-full py-2 rounded-btn border border-line/40 hover:bg-surface-2 text-xs font-medium text-ink transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-ink-muted" />
                  <span>Reject Alert with Reason</span>
                </button>
              </div>
            </div>
          )}

          {/* Guardrail Validator Panel */}
          <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Shield className="w-4 h-4 text-ink-muted" /> Guardrail Verification
              </h2>
              <span
                className={`px-2 py-0.5 rounded-chip text-xs font-medium ${
                  guardrailOutcome.pass
                    ? 'bg-ok/10 text-ok'
                    : 'bg-warning/10 text-warning font-semibold'
                }`}
              >
                {guardrailOutcome.pass ? 'All Passed' : 'Needs Review'}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {guardrailOutcome.checks.map((check) => (
                <div
                  key={check.rule}
                  className={`p-3 rounded-btn text-xs space-y-1 transition-colors ${
                    check.pass
                      ? 'bg-surface-2/40 border border-line/20'
                      : 'bg-warning/10 border border-warning/30 text-ink'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize flex items-center gap-1.5">
                      {check.pass ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                      )}
                      {check.rule.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-semibold ${
                        check.pass ? 'text-ok' : 'text-warning'
                      }`}
                    >
                      {check.pass ? 'Pass' : check.failBehavior || 'Fail'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed pl-5">
                    {check.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Technician Assignment Card with Certifications */}
          <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-ink-muted" /> Technician Assignment
              </h2>
              <span className="text-[11px] text-ink-muted">
                Proposed Shift: {alert.proposed_window?.shift || 'A'}
              </span>
            </div>

            {/* Active Technician Details */}
            {activeTech ? (
              <div className="p-3.5 rounded-btn bg-surface-2/50 border border-line/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-ink">{activeTech.name}</span>
                    <span className="font-mono text-[11px] text-ink-muted ml-1.5">({activeTech.id})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-chip text-[11px] bg-surface font-medium text-ink">
                    Shift {activeTech.shift} · {activeTech.role}
                  </span>
                </div>

                {/* Certifications with Expiration status */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-ink-muted uppercase font-semibold block">
                    Certifications Status (Ref: 2026-10-18)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeTechCerts.map((c) => {
                      const isExpired = new Date(c.valid_until) < new Date('2026-10-18');
                      return (
                        <span
                          key={c.certification}
                          className={`px-2 py-0.5 rounded-chip text-[11px] font-medium flex items-center gap-1 ${
                            isExpired
                              ? 'bg-danger/10 text-danger border border-danger/30'
                              : 'bg-ok/10 text-ok'
                          }`}
                        >
                          {c.certification}
                          {isExpired ? ` (expired ${c.valid_until})` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-btn bg-warning/10 border border-warning/30 text-xs text-warning">
                No technician currently assigned (assignment removed by guardrail or pending).
              </div>
            )}

            {/* Shadow Technician (Skill development) */}
            {shadowTech && (
              <div className="p-3 rounded-btn bg-surface-2/30 border border-line/20 text-xs space-y-0.5">
                <span className="text-[10px] font-semibold text-ink-muted uppercase block">
                  Shadow Trainee (Skill Development)
                </span>
                <p className="text-ink font-medium">
                  {shadowTech.name} <span className="font-mono text-ink-muted">({shadowTech.id})</span> · Shift {shadowTech.shift}
                </p>
              </div>
            )}

            {/* Override Technician Picker (Guardrail Override) */}
            {isPending && (
              <div className="pt-2 border-t border-line/20 space-y-2">
                <label className="text-[11px] font-semibold text-ink-muted uppercase block">
                  Re-assign / Override Qualified Technician
                </label>
                <select
                  value={selectedTechOverride}
                  onChange={(e) => setSelectedTechOverride(e.target.value)}
                  className="w-full bg-surface-2/60 border border-line/30 rounded-btn p-2 text-xs text-ink focus:outline-hidden"
                >
                  <option value="">Select technician...</option>
                  {qualifiedTechnicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id}) — Shift {t.shift} {t.isQualified ? '✓ (Qualified)' : '✗ (Missing certs)'}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-ink-muted block">
                  Select a certified technician matching the window shift to clear guardrail warnings.
                </span>
              </div>
            )}
          </div>

          {/* Proposed Maintenance Window */}
          <div className="bg-surface rounded-card p-6 border border-line/30 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-muted" /> Proposed Window
            </h2>

            {alert.proposed_window ? (
              <div className="p-3.5 rounded-btn bg-surface-2/40 border border-line/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">
                    {alert.proposed_window.date}
                  </span>
                  <span className="px-2 py-0.5 rounded-chip bg-surface font-medium text-ink">
                    Shift {alert.proposed_window.shift}
                  </span>
                </div>
                <p className="text-ink-muted">
                  Window type: <span className="text-ink font-medium capitalize">{alert.proposed_window.window_type.replace('_', ' ')}</span>
                </p>
                <p className="text-ink-muted">
                  Production loss: <span className="text-ink font-semibold">{alert.proposed_window.production_loss_units ?? 0} units</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">No scheduled window specified.</p>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal Dialog */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-card p-6 border border-line/40 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-ink">Reject Alert Intervention</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Please provide a clear operational reason for rejecting this automated recommendation. This reason will be logged for audit and model evaluation.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. False alarm confirmed by manual laser alignment; spare parts backlog prevents Sunday window; asset scheduled for decommission."
              rows={4}
              className="w-full bg-surface-2/60 border border-line/30 rounded-btn p-3 text-xs text-ink placeholder:text-ink-muted focus:outline-hidden focus:border-ink"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-btn text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="px-4 py-2 rounded-btn bg-danger text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
