'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Technician,
  Certification,
  TechnicianSkill,
  KnowledgeLibrary,
  Plant,
} from '@/lib/types';
import type {
  LearningCardPayload,
  SuggestedPairingPayload,
} from '@/lib/knowledgeService';
import { usePlantContext } from './PlantContext';
import { useToast } from './ToastContext';
import {
  GraduationCap,
  Award,
  BookOpen,
  Users,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowRight,
  Shield,
  Layers,
  HelpCircle,
  Briefcase,
  AlertOctagon,
} from 'lucide-react';

interface PeopleDevelopmentViewProps {
  technicians: Technician[];
  certifications: Certification[];
  technicianSkills: TechnicianSkill[];
  initialKnowledgeEntries: KnowledgeLibrary[];
  learningCards: LearningCardPayload[];
  suggestedPairings: SuggestedPairingPayload[];
  plant?: Plant;
}

export function PeopleDevelopmentView({
  technicians,
  certifications,
  technicianSkills,
  initialKnowledgeEntries,
  learningCards,
  suggestedPairings,
  plant,
}: PeopleDevelopmentViewProps) {
  const { plantId, role } = usePlantContext();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'matrix' | 'certs' | 'knowledge' | 'pairings' | 'learning'>('matrix');
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeLibrary[]>(initialKnowledgeEntries);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Knowledge filters
  const [machineTypeFilter, setMachineTypeFilter] = useState<string>('all');
  const [failureModeFilter, setFailureModeFilter] = useState<string>('all');
  const [searchKnowledge, setSearchKnowledge] = useState<string>('');

  // Learning card open question states
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const toggleAnswer = (cardId: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Plant specific technicians
  const plantTechs = useMemo(() => {
    return technicians.filter((t) => t.plant_id === plantId);
  }, [technicians, plantId]);

  const plantTechIds = useMemo(() => {
    return new Set(plantTechs.map((t) => t.id));
  }, [plantTechs]);

  // Certifications with expiry calculation
  // Today's date reference: mid-October 2026 (2026-10-18)
  const TODAY = new Date('2026-10-18');

  const enrichedCertifications = useMemo(() => {
    return certifications
      .filter((c) => plantTechIds.has(c.technician_id))
      .map((cert) => {
        const expiryDate = new Date(cert.valid_until);
        const diffDays = Math.ceil(
          (expiryDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24)
        );

        let status: 'expired' | 'expiring_soon' | 'valid' = 'valid';
        if (diffDays < 0) {
          status = 'expired';
        } else if (diffDays <= 30) {
          status = 'expiring_soon';
        }

        const tech = plantTechs.find((t) => t.id === cert.technician_id);

        return {
          ...cert,
          diffDays,
          status,
          technicianName: tech?.name || cert.technician_id,
          technicianRole: tech?.role || 'Technician',
          shift: tech?.shift || 'A',
        };
      })
      .sort((a, b) => {
        const order = { expired: 0, expiring_soon: 1, valid: 2 };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return a.valid_until.localeCompare(b.valid_until);
      });
  }, [certifications, plantTechIds, plantTechs]);

  // Expired and Expiring counts
  const expiredCerts = useMemo(() => {
    return enrichedCertifications.filter((c) => c.status === 'expired');
  }, [enrichedCertifications]);

  const expiringSoonCerts = useMemo(() => {
    return enrichedCertifications.filter((c) => c.status === 'expiring_soon');
  }, [enrichedCertifications]);

  // Skill Matrix Calculation
  const distinctSkills = useMemo(() => {
    const set = new Set<string>();
    technicianSkills.forEach((s) => set.add(s.skill));
    return Array.from(set).sort();
  }, [technicianSkills]);

  const skillsMap = useMemo(() => {
    const map = new Map<string, Map<string, TechnicianSkill>>();
    technicianSkills.forEach((ts) => {
      if (!map.has(ts.technician_id)) {
        map.set(ts.technician_id, new Map());
      }
      map.get(ts.technician_id)!.set(ts.skill, ts);
    });
    return map;
  }, [technicianSkills]);

  // Total skill gaps count
  const skillGapsCount = useMemo(() => {
    let count = 0;
    plantTechs.forEach((t) => {
      const techSkills = skillsMap.get(t.id);
      distinctSkills.forEach((skill) => {
        const s = techSkills?.get(skill);
        if (s && s.level < s.target_level) {
          count++;
        }
      });
    });
    return count;
  }, [plantTechs, skillsMap, distinctSkills]);

  // Knowledge Library filters
  const distinctMachineTypes = useMemo(() => {
    const set = new Set<string>();
    knowledgeEntries.forEach((k) => set.add(k.machine_type));
    return Array.from(set).sort();
  }, [knowledgeEntries]);

  const distinctFailureModes = useMemo(() => {
    const set = new Set<string>();
    knowledgeEntries.forEach((k) => set.add(k.failure_mode));
    return Array.from(set).sort();
  }, [knowledgeEntries]);

  const filteredKnowledge = useMemo(() => {
    return knowledgeEntries.filter((k) => {
      if (machineTypeFilter !== 'all' && k.machine_type !== machineTypeFilter) return false;
      if (failureModeFilter !== 'all' && k.failure_mode !== failureModeFilter) return false;
      if (searchKnowledge.trim()) {
        const q = searchKnowledge.toLowerCase();
        const matchesSound = k.sound.toLowerCase().includes(q);
        const matchesSmell = k.smell.toLowerCase().includes(q);
        const matchesFeel = k.feel_visual.toLowerCase().includes(q);
        const matchesMachine = k.machine_type.toLowerCase().includes(q);
        const matchesMode = k.failure_mode.toLowerCase().includes(q);
        if (!matchesSound && !matchesSmell && !matchesFeel && !matchesMachine && !matchesMode) {
          return false;
        }
      }
      return true;
    });
  }, [knowledgeEntries, machineTypeFilter, failureModeFilter, searchKnowledge]);

  // Mark knowledge entry as verified
  const handleVerifyKnowledge = async (id: string) => {
    try {
      setVerifyingId(id);
      const res = await fetch(`/api/knowledge/${id}/verify`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to verify knowledge entry');

      setKnowledgeEntries((prev) =>
        prev.map((k) => (k.id === id ? { ...k, verified: true } : k))
      );
      showToast('Knowledge entry marked as verified by veteran', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error updating entry', 'warning');
    } finally {
      setVerifyingId(null);
    }
  };

  const formatText = (txt: string) => {
    return txt.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            People & skills development
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Plant {plantId} {plant ? `• ${plant.name}` : ''} — Skill matrix, certifications, pairings, and knowledge library.
          </p>
        </div>
      </div>

      {/* Critical Expiry Callout Alert Banner if any certs expired or expiring */}
      {(expiredCerts.length > 0 || expiringSoonCerts.length > 0) && (
        <div className="space-y-2">
          {expiredCerts.length > 0 && (
            <div className="bg-critical-bg border border-critical-border rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-critical">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-btn bg-white/60 text-critical border border-critical-border">
                  <AlertOctagon className="w-5 h-5 text-critical" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-critical">
                    Critical certification expired: {expiredCerts.map((c) => `${c.technician_id} (${c.technicianName}) - ${c.certification}`).join(', ')}
                  </div>
                  <div className="text-xs opacity-90 mt-0.5">
                    P07-T04 LOTO expired on 30 Sep 2026. Guardrails hard-block this technician from work orders requiring LOTO.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('certs')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#B42318] hover:bg-[#912018] text-white text-xs font-medium transition-colors whitespace-nowrap self-start sm:self-auto shadow-xs"
              >
                <span>View certifications</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {expiringSoonCerts.length > 0 && (
            <div className="bg-warning-bg border border-warning-border rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-warning">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-btn bg-white/60 text-warning border border-warning-border">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-warning">
                    Certification expiring within 30 days: {expiringSoonCerts.map((c) => `${c.technician_id} (${c.technicianName}) - ${c.certification} (${c.diffDays} days left)`).join(', ')}
                  </div>
                  <div className="text-xs opacity-90 mt-0.5">
                    P07-T09 LOTO expires on 10 Nov 2026. Schedule re-certification course with Training Coordinator before expiry.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('certs')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[#93370D] hover:bg-[#7A2E0B] text-white text-xs font-medium transition-colors whitespace-nowrap self-start sm:self-auto shadow-xs"
              >
                <span>View renewals</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-surface border border-line rounded-card p-4">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Plant team</span>
            <Users className="w-4 h-4 text-ink-muted" />
          </div>
          <div className="text-2xl font-bold text-ink">{plantTechs.length}</div>
          <div className="text-xs text-ink-muted mt-1">Technicians on roster</div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Expired certs</span>
            <ShieldAlert className="w-4 h-4 text-critical" />
          </div>
          <div className="text-2xl font-bold text-critical">{expiredCerts.length}</div>
          <div className="text-xs text-critical font-medium mt-1">P07-T04 LOTO expired</div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Expiring &lt;30d</span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-warning">{expiringSoonCerts.length}</div>
          <div className="text-xs text-warning font-medium mt-1">P07-T09 LOTO renewal</div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Skill gaps</span>
            <Award className="w-4 h-4 text-agent" />
          </div>
          <div className="text-2xl font-bold text-agent">{skillGapsCount}</div>
          <div className="text-xs text-ink-muted mt-1">Below target level</div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Knowledge items</span>
            <BookOpen className="w-4 h-4 text-ok" />
          </div>
          <div className="text-2xl font-bold text-ok">{knowledgeEntries.length}</div>
          <div className="text-xs text-ink-muted mt-1">
            {knowledgeEntries.filter((k) => k.verified).length} verified by veterans
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-line pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'border-agent text-agent bg-agent-bg'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Skill matrix heatmap</span>
        </button>

        <button
          onClick={() => setActiveTab('certs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'certs'
              ? 'border-agent text-agent bg-agent-bg'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Certifications & expiry</span>
          {expiredCerts.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-critical" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'knowledge'
              ? 'border-agent text-agent bg-agent-bg'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Knowledge library</span>
        </button>

        <button
          onClick={() => setActiveTab('pairings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'pairings'
              ? 'border-agent text-agent bg-agent-bg'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Suggested pairings</span>
        </button>

        <button
          onClick={() => setActiveTab('learning')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'learning'
              ? 'border-agent text-agent bg-agent-bg'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Learning cards</span>
        </button>
      </div>
      {/* TAB 1: Skill Matrix Heatmap */}
      {activeTab === 'matrix' && (
        <div className="bg-surface border border-line rounded-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Technician skill competency matrix
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Evaluation on a 1–4 scale vs target level. Gaps where level &lt; target are highlighted in soft amber.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-surface-2 border border-line inline-block" /> 1: Basic
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-agent-bg border border-agent/20 inline-block" /> 2: Working
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-agent-bg border border-agent inline-block" /> 3: Advanced
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-ok-bg border border-ok inline-block" /> 4: Master
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-2 text-ink-muted border-b border-line">
                  <th className="py-3 px-3 font-semibold sticky left-0 bg-surface-2 z-10 min-w-[180px]">
                    Technician
                  </th>
                  <th className="py-3 px-2 font-semibold">Shift</th>
                  {distinctSkills.map((skill) => (
                    <th key={skill} className="py-3 px-2 font-semibold text-center min-w-[90px]">
                      {skill}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {plantTechs.map((tech) => {
                  const techSkills = skillsMap.get(tech.id);
                  return (
                    <tr key={tech.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-ink sticky left-0 bg-surface z-10 border-r border-line">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-agent font-semibold">{tech.id}</span>
                          <span>{tech.name}</span>
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5">
                          {tech.role} • {tech.years_experience} yrs
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-surface-2 text-ink font-mono border border-line">
                          {tech.shift}
                        </span>
                      </td>
                      {distinctSkills.map((skill) => {
                        const s = techSkills?.get(skill);
                        if (!s) {
                          return (
                            <td key={skill} className="py-2.5 px-2 text-center text-ink-muted">
                              —
                            </td>
                          );
                        }

                        const hasGap = s.level < s.target_level;
                        const gapSize = s.target_level - s.level;

                        return (
                          <td key={skill} className="py-2.5 px-2 text-center">
                            <div
                              className={`inline-flex flex-col items-center justify-center w-9 py-1 rounded transition-colors ${
                                hasGap
                                  ? 'bg-warning-bg border border-warning-border text-warning'
                                  : s.level === 4
                                  ? 'bg-ok-bg border border-ok-border text-ok'
                                  : s.level === 3
                                  ? 'bg-agent-bg border border-agent-border text-agent'
                                  : 'bg-surface-2 border border-line text-ink'
                              }`}
                              title={`Current: Level ${s.level} / Target: Level ${s.target_level} ${hasGap ? `(Gap: -${gapSize})` : ''}`}
                            >
                              <span className="font-bold text-xs">{s.level}</span>
                              <span className="text-[9px] font-medium">tgt {s.target_level}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Certifications & Expiry */}
      {activeTab === 'certs' && (
        <div className="bg-surface border border-line rounded-card p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Certifications & safety compliance roster
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Lockout/Tagout (LOTO), electrical LV/HT, hydraulics, pneumatics, and robot safety authorizations.
            </p>
          </div>

          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-2 text-ink-muted border-b border-line">
                  <th className="py-3 px-3 font-semibold">Technician</th>
                  <th className="py-3 px-3 font-semibold">Certification</th>
                  <th className="py-3 px-3 font-semibold">Shift</th>
                  <th className="py-3 px-3 font-semibold">Valid until</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {enrichedCertifications.map((c, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      c.status === 'expired'
                        ? 'bg-critical-bg/30 hover:bg-critical-bg/50'
                        : c.status === 'expiring_soon'
                        ? 'bg-warning-bg/30 hover:bg-warning-bg/50'
                        : 'hover:bg-surface-2/40'
                    }`}
                  >
                    <td className="py-3 px-3 font-medium text-ink">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-agent font-semibold">{c.technician_id}</span>
                        <span>{c.technicianName}</span>
                      </div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        {c.technicianRole}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-ink">{c.certification}</td>
                    <td className="py-3 px-3 font-mono text-ink">{c.shift}</td>
                    <td className="py-3 px-3 font-mono text-ink">{c.valid_until}</td>
                    <td className="py-3 px-3">
                      {c.status === 'expired' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-critical-bg text-critical border border-critical-border font-semibold">
                          <AlertOctagon className="w-3 h-3" />
                          Expired (Critical)
                        </span>
                      )}
                      {c.status === 'expiring_soon' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-warning-bg text-warning border border-warning-border font-medium">
                          <Clock className="w-3 h-3" />
                          Expiring soon (&lt;30d)
                        </span>
                      )}
                      {c.status === 'valid' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-ok-bg text-ok border border-ok-border font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {c.status === 'expired' ? (
                        <span className="text-critical font-semibold">
                          {Math.abs(c.diffDays)} days overdue
                        </span>
                      ) : (
                        <span className="text-ink-muted">{c.diffDays} days</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Knowledge Library */}
      {activeTab === 'knowledge' && (
        <div className="bg-surface border border-line rounded-card p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">
                Institutional knowledge repository
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Heuristic sensory signs (sound, smell, touch/visual) captured from retiring veterans and verified by senior staff.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sound, smell, feel..."
                value={searchKnowledge}
                onChange={(e) => setSearchKnowledge(e.target.value)}
                className="w-full bg-surface border border-line rounded-btn pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-agent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line text-xs">
            <div className="flex items-center gap-1.5 text-ink-muted">
              <Filter className="w-3.5 h-3.5" />
              <span>Machine type:</span>
            </div>
            <select
              value={machineTypeFilter}
              onChange={(e) => setMachineTypeFilter(e.target.value)}
              className="bg-surface border border-line rounded-btn px-2.5 py-1 text-ink focus:outline-none focus:border-agent text-xs"
            >
              <option value="all">All machine types</option>
              {distinctMachineTypes.map((mt) => (
                <option key={mt} value={mt}>
                  {formatText(mt)}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-ink-muted ml-2">
              <span>Failure mode:</span>
            </div>
            <select
              value={failureModeFilter}
              onChange={(e) => setFailureModeFilter(e.target.value)}
              className="bg-surface border border-line rounded-btn px-2.5 py-1 text-ink focus:outline-none focus:border-agent text-xs"
            >
              <option value="all">All failure modes</option>
              {distinctFailureModes.map((fm) => (
                <option key={fm} value={fm}>
                  {formatText(fm)}
                </option>
              ))}
            </select>
          </div>

          {/* Knowledge Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filteredKnowledge.map((item) => (
              <div
                key={item.id}
                className="bg-surface border border-line rounded-card p-4 space-y-3 flex flex-col justify-between hover:border-agent/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-agent">
                          {item.id}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-ink border border-line font-medium">
                          {formatText(item.machine_type)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-agent-bg text-agent border border-agent-border font-medium">
                          {formatText(item.failure_mode)}
                        </span>
                      </div>
                    </div>

                    <div>
                      {item.verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-ok-bg text-ok border border-ok-border font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-warning-bg text-warning border border-warning-border font-medium">
                          <Clock className="w-3 h-3" />
                          AI-suggested
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sensory Cues */}
                  <div className="space-y-2 text-xs">
                    <div className="bg-surface-2 rounded-btn p-2.5 border border-line">
                      <span className="text-ink-muted font-semibold block text-[11px] mb-0.5">
                        Sound cue:
                      </span>
                      <span className="text-ink">{item.sound || 'None reported'}</span>
                    </div>

                    <div className="bg-surface-2 rounded-btn p-2.5 border border-line">
                      <span className="text-ink-muted font-semibold block text-[11px] mb-0.5">
                        Smell cue:
                      </span>
                      <span className="text-ink">{item.smell || 'None reported'}</span>
                    </div>

                    <div className="bg-surface-2 rounded-btn p-2.5 border border-line">
                      <span className="text-ink-muted font-semibold block text-[11px] mb-0.5">
                        Touch & visual:
                      </span>
                      <span className="text-ink">{item.feel_visual || 'None reported'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                  <div className="text-ink-muted text-[11px]">
                    Captured from: <strong className="text-ink">{item.captured_from}</strong> • {item.captured_at_plant}
                  </div>

                  {!item.verified && (
                    <button
                      onClick={() => handleVerifyKnowledge(item.id)}
                      disabled={verifyingId === item.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-btn bg-ok text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50 hover:opacity-90"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{verifyingId === item.id ? 'Verifying...' : 'Mark as verified'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Suggested Pairings */}
      {activeTab === 'pairings' && (
        <div className="bg-surface border border-line rounded-card p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Veteran-junior mentorship pairings
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Algorithmically suggested pairings matching experienced masters with junior technicians on the same shift with shared upcoming work orders.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
            {suggestedPairings.map((pairing) => (
              <div
                key={pairing.id}
                className="bg-surface border border-line rounded-card p-4 space-y-4 flex flex-col justify-between hover:border-agent/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-agent-bg text-agent border border-agent-border font-mono">
                      Shift {pairing.shift}
                    </span>
                    <span className="text-[11px] text-ink-muted font-mono">
                      {pairing.id}
                    </span>
                  </div>

                  {/* Veteran Card */}
                  <div className="bg-surface-2 border border-line rounded-btn p-3 space-y-1">
                    <div className="text-[11px] font-semibold text-agent uppercase tracking-wider">
                      Veteran mentor
                    </div>
                    <div className="text-sm font-bold text-ink">
                      {pairing.veteran_name} ({pairing.veteran_id})
                    </div>
                    <div className="text-xs text-ink-muted">
                      {pairing.veteran_role} • Lead technical mentor
                    </div>
                  </div>

                  {/* Junior Card */}
                  <div className="bg-surface-2 border border-line rounded-btn p-3 space-y-1">
                    <div className="text-[11px] font-semibold text-ok uppercase tracking-wider">
                      Junior mentee
                    </div>
                    <div className="text-sm font-bold text-ink">
                      {pairing.junior_name} ({pairing.junior_id})
                    </div>
                    <div className="text-xs text-ink-muted">
                      {pairing.junior_role} • Active shadow technician
                    </div>
                  </div>

                  {/* Upcoming Job */}
                  <div className="text-xs space-y-1">
                    <span className="text-ink-muted font-medium">Shared upcoming assignment:</span>
                    <div className="p-2 rounded bg-surface border border-line text-ink font-medium">
                      {pairing.upcoming_job}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="pt-3 border-t border-line text-xs text-ink-muted leading-relaxed italic">
                  &ldquo;{pairing.reason}&rdquo;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Learning Cards */}
      {activeTab === 'learning' && (
        <div className="bg-surface border border-line rounded-card p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Interactive learning cards for juniors & trainees
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Micro-lessons generated from historical work order closures and veteran observations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {learningCards.map((card) => {
              const cardKey = card.id || card.title;
              const isAnswerShown = revealedAnswers[cardKey];
              return (
                <div
                  key={cardKey}
                  className="bg-surface border border-line rounded-card p-5 space-y-4 flex flex-col justify-between hover:border-agent/40 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-ok-bg text-ok border border-ok-border">
                        {card.for_role} curriculum
                      </span>
                      <span className="text-xs font-mono text-ink-muted">{card.id}</span>
                    </div>

                    <h3 className="text-sm font-bold text-ink">
                      {card.title}
                    </h3>

                    {/* Key Points */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                        3 key operational rules:
                      </span>
                      <ul className="space-y-1.5 text-xs text-ink">
                        {card.key_points.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-agent mt-1.5 shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Interactive Quick Check Question */}
                  <div className="pt-3 border-t border-line space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-warning flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Quick check question:
                      </span>
                      <button
                        onClick={() => toggleAnswer(cardKey)}
                        className="text-[11px] text-agent hover:underline font-medium"
                      >
                        {isAnswerShown ? 'Hide answer' : 'Reveal answer'}
                      </button>
                    </div>

                    <p className="text-xs text-ink italic bg-surface-2 p-2.5 rounded-btn border border-line">
                      &ldquo;{card.quick_check_question}&rdquo;
                    </p>

                    {isAnswerShown && (
                      <div className="text-xs text-ok bg-ok-bg border border-ok-border p-2.5 rounded-btn animate-fadeIn">
                        <strong className="font-semibold">Answer: </strong>
                        {card.answer}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
