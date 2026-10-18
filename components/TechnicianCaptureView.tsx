'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Machine,
  Plant,
  Line,
  Technician,
  Alert as AlertType,
  Observation,
} from '@/lib/types';
import { formatFailureMode, formatObservationTag } from '@/lib/lifecycle';
import { usePlantContext } from './PlantContext';
import { useToast } from './ToastContext';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Gauge,
  HardHat,
  Mic,
  MicOff,
  RotateCcw,
  Search,
  Sparkles,
  Thermometer,
  User,
  Volume2,
} from 'lucide-react';

interface TechnicianCaptureViewProps {
  initialMachines: Machine[];
  plants: Plant[];
  lines: Line[];
  technicians: Technician[];
}

const SYMPTOM_CATEGORIES = [
  {
    category: 'Sound',
    description: 'Acoustic cues',
    icon: Volume2,
    options: [
      { id: 'sound:grinding', label: 'Grinding noise', badge: 'Grinding' },
      { id: 'sound:squeal', label: 'High-pitch squeal', badge: 'Squeal' },
      { id: 'sound:hiss', label: 'Air / gas hiss', badge: 'Hiss' },
    ],
  },
  {
    category: 'Smell',
    description: 'Thermal & electrical odors',
    icon: Flame,
    options: [
      { id: 'smell:burning', label: 'Burning insulation / oil', badge: 'Burning' },
      { id: 'smell:ozone', label: 'Ozone / electrical sparks', badge: 'Ozone' },
    ],
  },
  {
    category: 'Heat',
    description: 'Thermal contact',
    icon: Thermometer,
    options: [
      { id: 'heat:hot_to_touch', label: 'Abnormally hot casing', badge: 'Hot casing' },
    ],
  },
  {
    category: 'Vibration',
    description: 'Mechanical oscillation',
    icon: Activity,
    options: [
      { id: 'vibration:unusual_rattle', label: 'Unusual rattle or shudder', badge: 'Unusual rattle' },
    ],
  },
  {
    category: 'Visual',
    description: 'Physical inspection',
    icon: Eye,
    options: [
      { id: 'visual:leak', label: 'Oil or hydraulic fluid leak', badge: 'Fluid leak' },
      { id: 'visual:smoke', label: 'Faint or heavy smoke', badge: 'Smoke' },
      { id: 'visual:loose', label: 'Loose mounting / bracket', badge: 'Loose mount' },
    ],
  },
  {
    category: 'Performance',
    description: 'Operational degradation',
    icon: Gauge,
    options: [
      { id: 'performance:slow', label: 'Slow cycle / reduced feed', badge: 'Slow cycle' },
      { id: 'performance:tripping', label: 'Frequent breaker tripping', badge: 'Breaker tripping' },
    ],
  },
];

export function TechnicianCaptureView({
  initialMachines,
  plants,
  lines,
  technicians,
}: TechnicianCaptureViewProps) {
  const router = useRouter();
  const { plantId, role } = usePlantContext();
  const { showToast } = useToast();

  // 1) Who are you? (technician of the selected plant)
  const plantTechs = technicians.filter((t) => t.plant_id === plantId);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');

  useEffect(() => {
    if (plantTechs.length > 0 && !selectedTechnicianId) {
      setSelectedTechnicianId(plantTechs[0].id);
    }
  }, [plantTechs, selectedTechnicianId]);

  // 2) Machine (legacy machines first, search includes all)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLegacyOnly, setFilterLegacyOnly] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');

  const plantMachines = initialMachines.filter((m) => m.plant_id === plantId);
  const legacyMachines = plantMachines.filter((m) => !m.has_sensors);
  const sensorMachines = plantMachines.filter((m) => m.has_sensors);

  // Filtered by search query across all fields
  const filteredMachines = plantMachines.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const line = lines.find((l) => l.id === m.line_id);
    return (
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q) ||
      (line?.name && line.name.toLowerCase().includes(q))
    );
  });

  // When not searching, order legacy machines first, then sensor machines
  const orderedMachines = searchQuery.trim()
    ? filteredMachines
    : filterLegacyOnly
    ? legacyMachines
    : [...legacyMachines, ...sensorMachines];

  // Set default machine selection
  useEffect(() => {
    if (!selectedMachineId && orderedMachines.length > 0) {
      setSelectedMachineId(orderedMachines[0].id);
    }
  }, [orderedMachines, selectedMachineId]);

  const selectedMachine = initialMachines.find((m) => m.id === selectedMachineId);
  const selectedLine = lines.find((l) => l.id === selectedMachine?.line_id);

  // 3) Symptoms (large tag buttons)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((s) => s !== symptomId) : [...prev, symptomId]
    );
  };

  // 4) Note (voice or typed)
  const [note, setNote] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const baseNoteRef = useRef<string>('');
  const finalTranscriptRef = useRef<string>('');

  // Detect Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    setInterimText('');
  };

  const startRecording = () => {
    if (!speechSupported) return;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Mobile check: use continuous=false on mobile browsers where duplicates occur
      const isMobile =
        typeof navigator !== 'undefined' &&
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      baseNoteRef.current = note.trim();
      finalTranscriptRef.current = '';
      setInterimText('');

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        // Rebuild transcript ONLY from final results using event.resultIndex
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }

        if (finalChunk) {
          finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + finalChunk.trim();
          // Replace rather than append repeatedly
          const combined = baseNoteRef.current
            ? `${baseNoteRef.current} ${finalTranscriptRef.current}`
            : finalTranscriptRef.current;
          setNote(combined);
        }

        setInterimText(interimChunk.trim());
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech error:', event.error);
          setSpeechError(`Voice capture error: ${event.error}`);
        }
        setIsRecording(false);
        setInterimText('');
      };

      recognition.onend = () => {
        // Stop cleanly on silence or end
        setIsRecording(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Error starting speech:', err);
      setSpeechError(err.message || 'Could not start microphone');
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // 5) Submit & Result
  const [submitting, setSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState<{
    observation?: Observation;
    alert?: AlertType;
    message?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTechnicianId) {
      showToast('Please select your technician profile.', 'warning');
      return;
    }
    if (!selectedMachineId) {
      showToast('Please select a machine.', 'warning');
      return;
    }
    if (selectedSymptoms.length === 0) {
      showToast('Please select at least one observed symptom.', 'warning');
      return;
    }
    if (!note.trim()) {
      showToast('Please provide an observation note.', 'warning');
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: selectedMachineId,
          plant_id: plantId,
          symptom_tags: selectedSymptoms,
          note: note.trim(),
          technician_id: selectedTechnicianId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit observation');
      }

      setTriageResult(data);
      showToast('Observation logged and AI triage alert created.', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(err?.message || 'Error communicating with server', 'alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedSymptoms([]);
    setNote('');
    setInterimText('');
    setTriageResult(null);
  };

  return (
    <div className="max-w-[700px] mx-auto pb-20 pt-2 space-y-6">
      {/* Header */}
      <div className="border-b border-line/30 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-btn bg-surface-2 text-ink">
              <HardHat className="w-5 h-5 text-ink-muted" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink tracking-tight">
                Capture floor observation
              </h1>
              <p className="text-xs text-ink-muted mt-0.5">
                Log sensory inspection. AI synthesizes root cause and alerts the maintenance planner.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-chip bg-surface border border-line/40 text-ink-muted shrink-0">
            Plant {plantId}
          </span>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL / PANEL */}
      {triageResult ? (
        <div className="bg-surface rounded-card p-6 border border-line/30 space-y-5 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-ok/10 text-ok flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink">
              Observation captured & triaged
            </h2>
            <p className="text-xs text-ink-muted max-w-md mx-auto">
              Your observation on <strong>{selectedMachine?.name}</strong> has been logged to machine history and submitted for planner review.
            </p>
          </div>

          {triageResult.alert && (
            <div className="p-4 rounded-card bg-surface-2/40 border border-line/40 text-left space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-ink">
                    {triageResult.alert.id}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-chip font-semibold ${
                      triageResult.alert.urgency === 'P1'
                        ? 'bg-danger/10 text-danger'
                        : triageResult.alert.urgency === 'P2'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-surface text-ink-muted'
                    }`}
                  >
                    {triageResult.alert.urgency} Priority
                  </span>
                </div>
                <span className="text-[11px] text-ink-muted capitalize">
                  {triageResult.alert.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-agent" />
                  <span>{formatFailureMode(triageResult.alert.failure_mode)}</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {triageResult.alert.recommended_action}
                </p>
              </div>

              <div className="pt-2 border-t border-line/20 text-[11px] flex items-center justify-between text-ink-muted flex-wrap gap-2">
                <span>Confidence: {Math.round((triageResult.alert.confidence || 0.85) * 100)}%</span>
                <span>Machine: {selectedMachine?.name} ({triageResult.alert.machine_id})</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            {triageResult.alert && (
              <Link
                href={`/alerts/${triageResult.alert.id}`}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-btn bg-ink text-surface text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Open alert {triageResult.alert.id}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-btn border border-line/50 bg-surface text-ink text-xs font-medium hover:bg-surface-2 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
              <span>Capture another</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: WHO ARE YOU? */}
          <div className="bg-surface rounded-card p-5 border border-line/30 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-ink text-surface text-[11px] font-semibold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-semibold text-ink">
                  Who are you?
                </h2>
              </div>
              <span className="text-[11px] text-ink-muted">
                {plantTechs.length} technicians at this plant
              </span>
            </div>

            <p className="text-xs text-ink-muted">
              Select your technician profile to record authoring credentials and dispatch eligibility.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {plantTechs.map((tech) => {
                const isSelected = tech.id === selectedTechnicianId;
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => setSelectedTechnicianId(tech.id)}
                    className={`p-3 rounded-card border text-left transition-all ${
                      isSelected
                        ? 'border-ink bg-surface-2/70 shadow-xs'
                        : 'border-line/40 bg-surface hover:bg-surface-2/40 hover:border-line/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink truncate">
                          {tech.name}
                        </div>
                        <div className="text-[11px] text-ink-muted truncate">
                          {tech.role}
                        </div>
                        <div className="text-[10px] text-ink-muted font-mono mt-0.5">
                          {tech.id} · Shift {tech.shift}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-ink border-ink text-surface' : 'border-line/60 bg-surface'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: MACHINE SELECTION */}
          <div className="bg-surface rounded-card p-5 border border-line/30 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-ink text-surface text-[11px] font-semibold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-semibold text-ink">
                  Select machine
                </h2>
              </div>

              {/* Legacy first filter toggle */}
              <div className="flex items-center gap-1 bg-surface-2/70 p-0.5 rounded-chip border border-line/30 text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setFilterLegacyOnly(false);
                    setSearchQuery('');
                  }}
                  className={`px-2.5 py-1 rounded-chip transition-all font-medium ${
                    !filterLegacyOnly && !searchQuery ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Legacy first ({legacyMachines.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterLegacyOnly(true);
                    setSearchQuery('');
                  }}
                  className={`px-2.5 py-1 rounded-chip transition-all font-medium ${
                    filterLegacyOnly ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Legacy only
                </button>
              </div>
            </div>

            {/* Search Input includes ALL machines */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all machines by ID, name, or line (e.g. P07-M05, lathe, line 2)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-surface-2/40 border border-line/40 rounded-btn text-ink focus:outline-hidden focus:border-ink placeholder:text-ink-muted transition-colors"
              />
            </div>

            {/* Machine List */}
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {orderedMachines.map((m) => {
                const isSelected = m.id === selectedMachineId;
                const lineInfo = lines.find((l) => l.id === m.line_id);

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMachineId(m.id)}
                    className={`text-left p-3 rounded-card border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-ink bg-surface-2/60 shadow-xs'
                        : 'border-line/30 hover:border-line/60 bg-surface hover:bg-surface-2/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-ink">
                          {m.id}
                        </span>
                        <span className="text-xs font-medium text-ink truncate">
                          {m.name}
                        </span>
                        {!m.has_sensors ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-chip bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                            Legacy · No sensors
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-chip bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
                            Sensor-rich
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] text-ink-muted mt-1">
                        <span>{lineInfo?.name || m.line_id}</span>
                        <span>·</span>
                        <span>{m.type}</span>
                        <span>·</span>
                        <span>Criticality {m.criticality}</span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-ink border-ink text-surface' : 'border-line/40 bg-surface'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: SYMPTOMS (LARGE TAG BUTTONS) */}
          <div className="bg-surface rounded-card p-5 border border-line/30 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-ink text-surface text-[11px] font-semibold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-sm font-semibold text-ink">
                  Observed symptoms
                </h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-chip bg-surface-2 text-ink border border-line/40">
                {selectedSymptoms.length} selected
              </span>
            </div>

            <p className="text-xs text-ink-muted">
              Tap large tag buttons corresponding to sensory cues on <strong>{selectedMachine?.name || 'machine'}</strong>.
            </p>

            {/* Categories of Large Tag Buttons */}
            <div className="space-y-4">
              {SYMPTOM_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <CatIcon className="w-3.5 h-3.5 text-ink-muted" />
                      <span>{cat.category}</span>
                      <span className="text-[11px] font-normal text-ink-muted">· {cat.description}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {cat.options.map((opt) => {
                        const isChecked = selectedSymptoms.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleSymptom(opt.id)}
                            className={`min-h-[44px] p-3 rounded-btn border text-left transition-all flex items-center justify-between gap-2 ${
                              isChecked
                                ? 'border-ink bg-ink text-surface font-semibold shadow-xs'
                                : 'border-line/40 bg-surface hover:border-line hover:bg-surface-2/40 text-ink'
                            }`}
                          >
                            <span className="text-xs leading-snug">{opt.label}</span>
                            <span
                              className={`w-4 h-4 rounded-chip flex items-center justify-center shrink-0 border ${
                                isChecked
                                  ? 'bg-surface text-ink border-surface'
                                  : 'border-line/40 bg-surface-2'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: NOTE (VOICE OR TYPED) */}
          <div className="bg-surface rounded-card p-5 border border-line/30 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-ink text-surface text-[11px] font-semibold flex items-center justify-center">
                  4
                </span>
                <h2 className="text-sm font-semibold text-ink">
                  Observation note
                </h2>
              </div>

              {/* Language toggle: English or Hindi */}
              <div className="flex items-center gap-1 bg-surface-2/70 p-0.5 rounded-chip border border-line/30 text-[11px]">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-chip transition-all font-medium ${
                    language === 'en' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`px-2.5 py-1 rounded-chip transition-all font-medium ${
                    language === 'hi' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  हिन्दी (Hindi)
                </button>
              </div>
            </div>

            {/* Voice Recording Box (COMPLETELY HIDDEN IF WEB SPEECH API UNSUPPORTED) */}
            {speechSupported && (
              <div className="rounded-card p-4 bg-surface-2/40 border border-line/40 flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <span>Voice observation</span>
                    {isRecording && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-danger font-medium animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                        Listening ({language === 'hi' ? 'बोलिए...' : 'Listening in English...'})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    Tap mic to speak. Voice is transcribed cleanly without duplication. Tap again to stop.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isRecording
                      ? 'bg-danger text-white animate-pulse shadow-md ring-4 ring-danger/20'
                      : 'bg-ink text-surface hover:opacity-90 active:scale-95 shadow-xs'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start voice note'}
                  aria-label={isRecording ? 'Stop recording' : 'Start voice note'}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            )}

            {speechError && (
              <div className="text-[11px] text-danger bg-danger/10 p-2.5 rounded-btn border border-danger/20 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{speechError}</span>
              </div>
            )}

            {/* Textarea for note with interim speech preview */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">
                Notes & Field Description <span className="text-danger">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Heavy grinding noise noticed on drive side bearing during 2nd shift. Casing feels hot to touch."
                className="w-full text-xs bg-surface-2/30 border border-line/40 rounded-btn p-3 text-ink placeholder:text-ink-muted focus:outline-hidden focus:border-ink transition-colors leading-relaxed resize-none"
              />

              {/* Interim text shown separately in grey */}
              {interimText && (
                <div className="text-xs text-ink-muted/70 italic px-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-agent animate-pulse" />
                  <span>Hearing: &quot;{interimText}&quot;</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: SUBMIT */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !selectedMachineId || selectedSymptoms.length === 0 || !note.trim()}
              className="w-full py-3.5 px-5 rounded-btn bg-ink text-surface text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  <span>Triaging with AI agent...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-surface" />
                  <span>Submit observation & AI triage</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
