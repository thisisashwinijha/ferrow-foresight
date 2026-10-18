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
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Training Coordinator home
            </span>
            <span className="text-xs text-slate-400">
              Plant {plantId} {plant ? `• ${plant.name}` : ''}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            People & skills development
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Technician skill matrix heatmap, compliance certification tracking, peer pairing, and veteran knowledge library.
          </p>
        </div>
      </div>

      {/* Critical Expiry Callout Alert Banner if any certs expired or expiring */}
      {(expiredCerts.length > 0 || expiringSoonCerts.length > 0) && (
        <div className="space-y-2">
          {expiredCerts.length > 0 && (
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertOctagon className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-rose-200">
                    Critical certification expired: {expiredCerts.map((c) => `${c.technician_id} (${c.technicianName}) - ${c.certification}`).join(', ')}
                  </div>
                  <div className="text-xs text-rose-300/80 mt-0.5">
                    P07-T04 LOTO expired on 30 Sep 2026. Guardrails will hard-block this technician from work orders requiring LOTO.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('certs')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-medium transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <span>View certifications</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {expiringSoonCerts.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-200">
                    Certification expiring within 30 days: {expiringSoonCerts.map((c) => `${c.technician_id} (${c.technicianName}) - ${c.certification} (${c.diffDays} days left)`).join(', ')}
                  </div>
                  <div className="text-xs text-amber-300/80 mt-0.5">
                    P07-T09 LOTO expires on 10 Nov 2026. Schedule re-certification course with Training Coordinator before expiry.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('certs')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-medium transition-colors whitespace-nowrap self-start sm:self-auto"
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Plant team</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{plantTechs.length}</div>
          <div className="text-xs text-slate-500 mt-1">Technicians on roster</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Expired certs</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{expiredCerts.length}</div>
          <div className="text-xs text-rose-400/80 mt-1">P07-T04 LOTO expired</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Expiring &lt;30d</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{expiringSoonCerts.length}</div>
          <div className="text-xs text-amber-400/80 mt-1">P07-T09 LOTO renewal</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Skill gaps</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{skillGapsCount}</div>
          <div className="text-xs text-slate-500 mt-1">Below target level</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Knowledge items</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{knowledgeEntries.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {knowledgeEntries.filter((k) => k.verified).length} verified by veterans
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Skill matrix heatmap</span>
        </button>

        <button
          onClick={() => setActiveTab('certs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'certs'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Certifications & expiry</span>
          {expiredCerts.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'knowledge'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Knowledge library</span>
        </button>

        <button
          onClick={() => setActiveTab('pairings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'pairings'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Suggested pairings</span>
        </button>

        <button
          onClick={() => setActiveTab('learning')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'learning'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Learning cards</span>
        </button>
      </div>

      {/* TAB 1: Skill Matrix Heatmap */}
      {activeTab === 'matrix' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-200">
                Technician skill competency matrix
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation on a 1–4 scale vs target level. Gaps where level &lt; target are highlighted in soft amber.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block" /> 1: Basic
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30 inline-block" /> 2: Working
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-indigo-500/20 border border-indigo-500/30 inline-block" /> 3: Advanced
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30 inline-block" /> 4: Master
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-3 font-semibold sticky left-0 bg-slate-950/95 z-10 min-w-[180px]">
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
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {plantTechs.map((tech) => {
                  const techSkills = skillsMap.get(tech.id);
                  return (
                    <tr key={tech.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-200 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-indigo-400 font-semibold">{tech.id}</span>
                          <span>{tech.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {tech.role} • {tech.years_experience} yrs
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 font-mono">
                          {tech.shift}
                        </span>
                      </td>
                      {distinctSkills.map((skill) => {
                        const s = techSkills?.get(skill);
                        if (!s) {
                          return (
                            <td key={skill} className="py-2.5 px-2 text-center text-slate-600">
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
                                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                                  : s.level === 4
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                  : s.level === 3
                                  ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                                  : 'bg-slate-800/80 border border-slate-700/60 text-slate-300'
                              }`}
                              title={`Current: Level ${s.level} / Target: Level ${s.target_level} ${hasGap ? `(Gap: -${gapSize})` : ''}`}
                            >
                              <span className="font-bold text-xs">{s.level}</span>
                              <span className="text-[9px] opacity-70">tgt {s.target_level}</span>
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Certifications & safety compliance roster
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Lockout/Tagout (LOTO), electrical LV/HT, hydraulics, pneumatics, and robot safety authorizations.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-3 font-semibold">Technician</th>
                  <th className="py-3 px-3 font-semibold">Certification</th>
                  <th className="py-3 px-3 font-semibold">Shift</th>
                  <th className="py-3 px-3 font-semibold">Valid until</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {enrichedCertifications.map((c, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      c.status === 'expired'
                        ? 'bg-rose-950/20 hover:bg-rose-950/30'
                        : c.status === 'expiring_soon'
                        ? 'bg-amber-950/20 hover:bg-amber-950/30'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-3 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-400 font-semibold">{c.technician_id}</span>
                        <span>{c.technicianName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {c.technicianRole}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-100">{c.certification}</td>
                    <td className="py-3 px-3 font-mono">{c.shift}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{c.valid_until}</td>
                    <td className="py-3 px-3">
                      {c.status === 'expired' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                          <AlertOctagon className="w-3 h-3" />
                          Expired (Critical)
                        </span>
                      )}
                      {c.status === 'expiring_soon' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                          <Clock className="w-3 h-3" />
                          Expiring soon (&lt;30d)
                        </span>
                      )}
                      {c.status === 'valid' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {c.status === 'expired' ? (
                        <span className="text-rose-400 font-semibold">
                          {Math.abs(c.diffDays)} days overdue
                        </span>
                      ) : (
                        <span className="text-slate-400">{c.diffDays} days</span>
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-200">
                Institutional knowledge repository
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Heuristic sensory signs (sound, smell, touch/visual) captured from retiring veterans and verified by senior staff.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sound, smell, feel..."
                value={searchKnowledge}
                onChange={(e) => setSearchKnowledge(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Machine type:</span>
            </div>
            <select
              value={machineTypeFilter}
              onChange={(e) => setMachineTypeFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All machine types</option>
              {distinctMachineTypes.map((mt) => (
                <option key={mt} value={mt}>
                  {formatText(mt)}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-slate-400 ml-2">
              <span>Failure mode:</span>
            </div>
            <select
              value={failureModeFilter}
              onChange={(e) => setFailureModeFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
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
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-xs text-indigo-400">
                          {item.id}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                          {formatText(item.machine_type)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                          {formatText(item.failure_mode)}
                        </span>
                      </div>
                    </div>

                    <div>
                      {item.verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          <Clock className="w-3 h-3" />
                          AI-suggested
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sensory Cues */}
                  <div className="space-y-2 text-xs">
                    <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80">
                      <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">
                        Sound cue:
                      </span>
                      <span className="text-slate-200">{item.sound || 'None reported'}</span>
                    </div>

                    <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80">
                      <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">
                        Smell cue:
                      </span>
                      <span className="text-slate-200">{item.smell || 'None reported'}</span>
                    </div>

                    <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/80">
                      <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">
                        Touch & visual:
                      </span>
                      <span className="text-slate-200">{item.feel_visual || 'None reported'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div className="text-slate-400 text-[11px]">
                    Captured from: <strong className="text-slate-300">{item.captured_from}</strong> • {item.captured_at_plant}
                  </div>

                  {!item.verified && (
                    <button
                      onClick={() => handleVerifyKnowledge(item.id)}
                      disabled={verifyingId === item.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Veteran-junior mentorship pairings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Algorithmically suggested pairings matching experienced masters with junior technicians on the same shift with shared upcoming work orders.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
            {suggestedPairings.map((pairing) => (
              <div
                key={pairing.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      Shift {pairing.shift}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {pairing.id}
                    </span>
                  </div>

                  {/* Veteran Card */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-1">
                    <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                      Veteran mentor
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      {pairing.veteran_name} ({pairing.veteran_id})
                    </div>
                    <div className="text-xs text-slate-400">
                      {pairing.veteran_role} • Lead technical mentor
                    </div>
                  </div>

                  {/* Junior Card */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-1">
                    <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Junior mentee
                    </div>
                    <div className="text-sm font-bold text-slate-100">
                      {pairing.junior_name} ({pairing.junior_id})
                    </div>
                    <div className="text-xs text-slate-400">
                      {pairing.junior_role} • Active shadow technician
                    </div>
                  </div>

                  {/* Upcoming Job */}
                  <div className="text-xs space-y-1">
                    <span className="text-slate-400 font-medium">Shared upcoming assignment:</span>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-slate-200 font-medium">
                      {pairing.upcoming_job}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 leading-relaxed italic">
                  &ldquo;{pairing.reason}&rdquo;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Learning Cards */}
      {activeTab === 'learning' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-200">
              Interactive learning cards for juniors & trainees
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
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
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {card.for_role} curriculum
                      </span>
                      <span className="text-xs font-mono text-slate-500">{card.id}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100">
                      {card.title}
                    </h3>

                    {/* Key Points */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        3 key operational rules:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {card.key_points.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Interactive Quick Check Question */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Quick check question:
                      </span>
                      <button
                        onClick={() => toggleAnswer(cardKey)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                      >
                        {isAnswerShown ? 'Hide answer' : 'Reveal answer'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-200 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      &ldquo;{card.quick_check_question}&rdquo;
                    </p>

                    {isAnswerShown && (
                      <div className="text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-lg animate-fadeIn">
                        <strong className="text-emerald-200">Answer: </strong>
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
