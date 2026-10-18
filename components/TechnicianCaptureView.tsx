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
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  Gauge,
  Globe,
  HardHat,
  HelpCircle,
  Mic,
  MicOff,
  Radio,
  RotateCcw,
  Sparkles,
  Thermometer,
  Volume2,
  Wrench,
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
    options: [
      { id: 'sound:grinding', label: 'Grinding noise', badge: 'Grinding' },
      { id: 'sound:squeal', label: 'High-pitch squeal', badge: 'Squeal' },
      { id: 'sound:hiss', label: 'Air / gas hiss', badge: 'Hiss' },
    ],
  },
  {
    category: 'Smell',
    description: 'Thermal & electrical odors',
    options: [
      { id: 'smell:burning', label: 'Burning insulation / oil', badge: 'Burning' },
      { id: 'smell:ozone', label: 'Ozone / electrical sparks', badge: 'Ozone' },
    ],
  },
  {
    category: 'Heat',
    description: 'Thermal contact',
    options: [
      { id: 'heat:hot_to_touch', label: 'Abnormally hot casing', badge: 'Hot to touch' },
    ],
  },
  {
    category: 'Vibration',
    description: 'Mechanical oscillation',
    options: [
      { id: 'vibration:unusual_rattle', label: 'Unusual rattle or shudder', badge: 'Unusual rattle' },
    ],
  },
  {
    category: 'Visual',
    description: 'Physical inspection',
    options: [
      { id: 'visual:leak', label: 'Oil or hydraulic fluid leak', badge: 'Fluid leak' },
      { id: 'visual:smoke', label: 'Faint or heavy smoke', badge: 'Smoke' },
      { id: 'visual:loose', label: 'Loose mounting / bracket', badge: 'Loose mount' },
    ],
  },
  {
    category: 'Performance',
    description: 'Operational degradation',
    options: [
      { id: 'performance:slow', label: 'Slow cycle / reduced feed', badge: 'Slow cycle' },
      { id: 'performance:tripping', label: 'Frequent breaker tripping', badge: 'Frequent tripping' },
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

  // Active step in mobile wizard: 1 = machine, 2 = symptoms, 3 = voice/note, 4 = success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Machine selection
  const [filterLegacyOnly, setFilterLegacyOnly] = useState(true);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');

  // Symptoms selection
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  // Note & Speech
  const [note, setNote] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Technician logged in or picking
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState<{
    observation?: Observation;
    alert?: AlertType;
    message?: string;
  } | null>(null);

  // Machines filtered by current plant
  const plantMachines = initialMachines.filter((m) => m.plant_id === plantId);
  const legacyMachines = plantMachines.filter((m) => !m.has_sensors);
  const displayedMachines = filterLegacyOnly && legacyMachines.length > 0 ? legacyMachines : plantMachines;

  // Selected machine object
  const selectedMachine = initialMachines.find((m) => m.id === selectedMachineId);
  const selectedLine = lines.find((l) => l.id === selectedMachine?.line_id);

  // Default selection to first legacy machine if available
  useEffect(() => {
    if (!selectedMachineId && displayedMachines.length > 0) {
      setSelectedMachineId(displayedMachines[0].id);
    }
  }, [displayedMachines, selectedMachineId]);

  // Set default technician
  useEffect(() => {
    const plantTechs = technicians.filter((t) => t.plant_id === plantId);
    if (plantTechs.length > 0 && !selectedTechnicianId) {
      setSelectedTechnicianId(plantTechs[0].id);
    }
  }, [technicians, plantId, selectedTechnicianId]);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  // Handle Speech Recognition Toggle
  const toggleRecording = () => {
    if (!speechSupported) {
      showToast('Voice input not supported on this browser; type note directly.', 'info');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setNote((prev) => {
            // If previous already ends with text, add space
            const base = prev.trim();
            return base ? `${base} ${currentTranscript.trim()}` : currentTranscript.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice capture: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setSpeechError(err.message || 'Could not start microphone');
      setIsRecording(false);
    }
  };

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((s) => s !== symptomId) : [...prev, symptomId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedMachineId) {
      showToast('Please select a machine.', 'warning');
      setStep(1);
      return;
    }

    if (selectedSymptoms.length === 0) {
      showToast('Please select at least one observed symptom.', 'warning');
      setStep(2);
      return;
    }

    if (!note.trim()) {
      showToast('Please record or type an observation note.', 'warning');
      setStep(3);
      return;
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
          technician_id: selectedTechnicianId || 'P07-T01',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit observation');
      }

      setTriageResult(data);
      setStep(4);
      showToast(data.message || 'Observation logged and triage alert raised.', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(err?.message || 'Network error while logging observation.', 'alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedSymptoms([]);
    setNote('');
    setTriageResult(null);
    setStep(1);
  };

  return (
    <div className="max-w-[640px] mx-auto pb-16 pt-2">
      {/* Phone-first container header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-ink">
              <HardHat className="w-4 h-4 text-ink-muted" />
            </span>
            <h1 className="text-xl font-semibold text-ink tracking-tight">Technician floor capture</h1>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-ink-muted border border-line">
            Plant {plantId}
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          Quick mobile logging for sensory observations. AI synthesizes root failure mode and creates an actionable triage alert.
        </p>
      </div>

      {/* Wizard Step Progress Pills */}
      {step < 4 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              step === 1
                ? 'bg-ink text-canvas font-semibold shadow-sm'
                : selectedMachineId
                ? 'bg-surface-2 text-ink hover:bg-surface-3'
                : 'bg-surface-1 text-ink-muted'
            }`}
          >
            <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center">
              1
            </span>
            <span>Machine</span>
          </button>

          <button
            type="button"
            onClick={() => selectedMachineId && setStep(2)}
            disabled={!selectedMachineId}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
              step === 2
                ? 'bg-ink text-canvas font-semibold shadow-sm'
                : selectedSymptoms.length > 0
                ? 'bg-surface-2 text-ink hover:bg-surface-3'
                : 'bg-surface-1 text-ink-muted'
            }`}
          >
            <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center">
              2
            </span>
            <span>Symptoms {selectedSymptoms.length > 0 ? `(${selectedSymptoms.length})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => selectedMachineId && selectedSymptoms.length > 0 && setStep(3)}
            disabled={!selectedMachineId || selectedSymptoms.length === 0}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
              step === 3
                ? 'bg-ink text-canvas font-semibold shadow-sm'
                : note.trim()
                ? 'bg-surface-2 text-ink hover:bg-surface-3'
                : 'bg-surface-1 text-ink-muted'
            }`}
          >
            <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center">
              3
            </span>
            <span>Voice / Note</span>
          </button>
        </div>
      )}

      {/* STEP 1: MACHINE PICKER */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-canvas border border-line rounded-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Step 1: Select machine</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Defaults to uninstrumented legacy machines where floor inspections catch early wear.
                </p>
              </div>

              {/* Legacy toggle pill */}
              <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-lg border border-line text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterLegacyOnly(true)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    filterLegacyOnly ? 'bg-canvas text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Legacy ({legacyMachines.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLegacyOnly(false)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    !filterLegacyOnly ? 'bg-canvas text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  All ({plantMachines.length})
                </button>
              </div>
            </div>

            {/* Machine list */}
            <div className="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {displayedMachines.map((m) => {
                const isSelected = m.id === selectedMachineId;
                const lineInfo = lines.find((l) => l.id === m.line_id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMachineId(m.id)}
                    className={`text-left p-3.5 rounded-card border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-ink bg-surface-1 shadow-sm'
                        : 'border-line hover:border-line-hover bg-canvas hover:bg-surface-1/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-ink">{m.id}</span>
                        <span className="text-xs font-medium text-ink truncate">{m.name}</span>
                        {!m.has_sensors ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-badge bg-surface-2 text-ink-muted border border-line">
                            Legacy · No sensors
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-badge bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Sensor-rich
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-ink-muted mt-1">
                        <span>{lineInfo?.name || m.line_id}</span>
                        <span>·</span>
                        <span>{m.type}</span>
                        <span>·</span>
                        <span>Crit {m.criticality}</span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-ink bg-ink text-canvas' : 'border-line bg-canvas'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Technician reporting selector */}
            <div className="pt-2 border-t border-line">
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Technician reporting
              </label>
              <select
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="w-full text-xs bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink focus:outline-none focus:border-ink"
              >
                {technicians
                  .filter((t) => t.plant_id === plantId)
                  .map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.id}) · {tech.role} · Shift {tech.shift}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!selectedMachineId}
            onClick={() => setStep(2)}
            className="w-full py-3 px-4 rounded-btn bg-ink text-canvas text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span>Proceed to symptoms</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* STEP 2: SYMPTOM TAGS */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-canvas border border-line rounded-card p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Step 2: Select observed symptoms</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Tap all sensory observations detected on <span className="font-mono font-medium text-ink">{selectedMachine?.name}</span> ({selectedMachine?.id}).
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-ink border border-line">
                {selectedSymptoms.length} selected
              </span>
            </div>

            {/* Categorized symptoms */}
            <div className="space-y-4">
              {SYMPTOM_CATEGORIES.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink flex items-center gap-1.5">
                      {cat.category === 'Sound' && <Volume2 className="w-3.5 h-3.5 text-ink-muted" />}
                      {cat.category === 'Smell' && <Flame className="w-3.5 h-3.5 text-amber-500" />}
                      {cat.category === 'Heat' && <Thermometer className="w-3.5 h-3.5 text-red-500" />}
                      {cat.category === 'Vibration' && <Activity className="w-3.5 h-3.5 text-blue-500" />}
                      {cat.category === 'Visual' && <Eye className="w-3.5 h-3.5 text-emerald-500" />}
                      {cat.category === 'Performance' && <Gauge className="w-3.5 h-3.5 text-purple-500" />}
                      {cat.category}
                    </span>
                    <span className="text-[11px] text-ink-muted">{cat.description}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.options.map((opt) => {
                      const isChecked = selectedSymptoms.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleSymptom(opt.id)}
                          className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                            isChecked
                              ? 'border-ink bg-surface-2 shadow-xs'
                              : 'border-line bg-canvas hover:border-line-hover hover:bg-surface-1'
                          }`}
                        >
                          <span className="text-xs font-medium text-ink">{opt.label}</span>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border transition-colors ${
                              isChecked ? 'bg-ink border-ink text-canvas' : 'border-line bg-surface-1'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-3 px-4 rounded-btn border border-line bg-canvas text-ink text-xs font-medium hover:bg-surface-2 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={selectedSymptoms.length === 0}
              onClick={() => setStep(3)}
              className="flex-1 py-3 px-4 rounded-btn bg-ink text-canvas text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <span>Proceed to note ({selectedSymptoms.length} tags)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: VOICE NOTE & TYPED OBSERVATION */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-canvas border border-line rounded-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Step 3: Observation note</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Speak using the voice recorder or type field notes.
                </p>
              </div>

              {/* Language toggle */}
              <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-lg border border-line text-[11px]">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    language === 'en' ? 'bg-canvas text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    language === 'hi' ? 'bg-canvas text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>

            {/* Voice Record Action Box */}
            <div className="rounded-xl p-4 bg-surface-1 border border-line flex flex-col items-center justify-center text-center space-y-3">
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse shadow-lg ring-4 ring-red-500/20'
                    : 'bg-ink text-canvas hover:scale-105 active:scale-95 shadow-sm'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice note'}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-ink">
                  {isRecording
                    ? `Listening (${language === 'hi' ? 'हिन्दी में बोलें' : 'Speak now'})... tap to finish`
                    : 'Tap microphone to speak observation'}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {speechSupported
                    ? 'Uses Web Speech API for real-time transcription on floor devices'
                    : 'Voice input not supported on this browser; type note directly below'}
                </p>
              </div>

              {speechError && (
                <div className="text-[11px] text-red-600 bg-red-500/10 px-3 py-1.5 rounded-md border border-red-500/20">
                  {speechError}
                </div >
              )}
            </div>

            {/* Note Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-ink">
                Observation note <span className="text-ink-muted">(transcribed or typed)</span>
              </label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Heavy grinding noise noticed on drive side bearing during 2nd shift. Casing feels unusually hot to the touch."
                className="w-full text-xs bg-canvas border border-line rounded-lg p-3 text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink transition-colors leading-relaxed"
              />
            </div>

            {/* Summary preview of what's being triaged */}
            <div className="rounded-lg bg-surface-2 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span>Machine:</span>
                <span className="font-mono font-medium text-ink">{selectedMachine?.id} ({selectedMachine?.name})</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span>Symptoms selected:</span>
                <span className="font-medium text-ink">{selectedSymptoms.length} tags</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1 border-t border-line">
                {selectedSymptoms.map((sym) => (
                  <span
                    key={sym}
                    className="text-[10px] px-2 py-0.5 rounded-chip bg-surface-2 border border-line text-ink"
                  >
                    {formatObservationTag(sym)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="py-3 px-4 rounded-btn border border-line bg-canvas text-ink text-xs font-medium hover:bg-surface-2 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={submitting || !note.trim()}
              onClick={handleSubmit}
              className="flex-1 py-3 px-4 rounded-btn bg-ink text-canvas text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-canvas border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing triage with AI...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-canvas" />
                  <span>Submit observation for AI triage</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS / TRIAGE CONFIRMATION */}
      {step === 4 && triageResult && (
        <div className="space-y-4">
          <div className="bg-canvas border border-line rounded-card p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink">Observation logged & triaged</h2>
              <p className="text-xs text-ink-muted">
                The observation has been captured and an actionable triage alert was raised in the Control Room.
              </p>
            </div>

            {/* Triaged alert card */}
            {triageResult.alert && (
              <div className="p-4 rounded-card bg-surface-1 border border-line text-left space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">
                      {triageResult.alert.id}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-badge font-semibold ${
                        triageResult.alert.urgency === 'P1'
                          ? 'bg-red-500 text-white'
                          : triageResult.alert.urgency === 'P2'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-surface-2 text-ink-muted'
                      }`}
                    >
                      {triageResult.alert.urgency}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-ink-muted">
                    {triageResult.alert.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>{formatFailureMode(triageResult.alert.failure_mode)}</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {triageResult.alert.recommended_action}
                  </p>
                </div>

                <div className="pt-2 border-t border-line text-[11px] flex items-center justify-between text-ink-muted">
                  <span>Confidence: {triageResult.alert.confidence}%</span>
                  <span>Machine: {triageResult.alert.machine_id}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              {triageResult.alert && (
                <Link
                  href={`/alerts/${triageResult.alert.id}`}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-btn bg-ink text-canvas text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <span>Review alert {triageResult.alert.id}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-btn border border-line bg-canvas text-ink text-xs font-medium hover:bg-surface-2 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
                <span>Capture another</span>
              </button>
            </div>

            <Link
              href="/"
              className="inline-block text-xs text-ink-muted hover:text-ink transition-colors"
            >
              Return to Control room
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
