'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ExternalLink,
  Cpu,
  Layers,
  Database,
  ArrowRight,
  UserCheck,
  Calendar,
  Wrench,
  Boxes,
  GraduationCap,
  Activity,
  FileCode2,
  Check,
} from 'lucide-react';
import { usePlantContext, UserRole } from './PlantContext';
import { useToast } from './ToastContext';
import { getPmPlansSync } from '@/lib/data/pmPlan';

interface DemoScenario {
  id: string;
  name: string;
  subtitle: string;
  role: UserRole;
  plantId: string;
  targetMachine: string;
  startUrl: string;
  steps: string[];
}

function buildDemoScenarios(): DemoScenario[] {
  const p07PmPlans = getPmPlansSync('P-07');
  const totalPm = p07PmPlans.length;
  const deferCount = p07PmPlans.filter((p) => p.ai_suggestion === 'defer').length;
  const keepCount = p07PmPlans.filter((p) => p.ai_suggestion === 'keep').length;
  const pullCount = p07PmPlans.filter((p) => p.ai_suggestion === 'pull_forward').length;
  const hoursSaved = (deferCount * 2.5).toFixed(0);

  return [
    {
      id: 'S1',
      name: 'Sensor P1: Bearing wear & full closure',
      subtitle: 'ISO 10816 alarm threshold vibration on Criticality A asset through LOTO and knowledge verification',
      role: 'Maintenance Planner',
      plantId: 'P-07',
      targetMachine: 'P07-M03 Gearbox GB-1 (Line 1 Carton Forming)',
      startUrl: '/alerts/AL-1001',
      steps: [
        '1. Detect: Continuous vibration sensor detects alarm threshold (6.10 mm/s vs 1.68 mm/s baseline) on P07-M03.',
        '2. AI Triage: Signal Interpreter categorizes P1 bearing wear on Criticality A machine.',
        '3. Planner Review: Planner verifies failure mode and clicks "Send to Plant Head" for mandatory dual sign-off.',
        '4. Plant Head: Plant Head approves P1 Criticality A alert, automatically generating work order WO-2203.',
        '5. Stores In-charge: Confirms bearing SKU reservation SP-003 (flags stock level at 1 vs minimum threshold 2).',
        '6. Production Manager: Production confirms maintenance window during Sunday planned shutdown.',
        '7. Technician: Assigned technician P07-T01 verifies 6-step zero energy LOTO, completes tasks, and closes with root cause.',
        '8. Training Coordinator: Knowledge Agent drafts learning card; Training Coordinator verifies it in People Development.',
      ],
    },
    {
      id: 'S2',
      name: 'Hinglish voice observation & HT certification gate',
      subtitle: 'Tacit knowledge capture in Hindi/English on electrical panel with safety certification lock',
      role: 'Maintenance Planner',
      plantId: 'P-07',
      targetMachine: 'P07-M30 Motor Control Centre MCC-3 (Line 3)',
      startUrl: '/alerts',
      steps: [
        '1. Capture: Technician speaks voice note in Hinglish: "MCC panel se jalne ki smell aa rahi hai aur humming sound badh gayi hai".',
        '2. AI Triage: Triage Planner understands Hindi, identifies electrical fault, and flags status needs_review.',
        '3. Planner Review: Planner sees certification warning: only certified HT Electrician can touch MCC panel.',
        '4. Assignment: Planner assigns certified HT Electrician P07-T02 for night Shift C.',
        '5. Plant Head: Plant Head approves work order with verified electrician competence.',
      ],
    },
    {
      id: 'S3',
      name: 'False alarm filter: Transient spike',
      subtitle: 'Automated 7-day trend analysis prevents unnecessary technician dispatch on electrical noise',
      role: 'Maintenance Planner',
      plantId: 'P-07',
      targetMachine: 'P07-M22 Palletiser Robot PR-1 (Line 3)',
      startUrl: '/alerts',
      steps: [
        '1. Sensor Spike: Single-point transient vibration reading spikes above alarm line on P07-M22.',
        '2. Agent Decision: Signal Interpreter evaluates rolling 7-day trend, determines it is transient electrical noise, and marks false alarm.',
        '3. Filtered State: Alert is recorded with status "suppressed" and clear audit rationale: "Filtered as false alarm - single sample anomaly".',
        '4. Business Value: Prevents unnecessary plant stoppage and wasted technician dispatch.',
      ],
    },
    {
      id: 'S4',
      name: 'Stockout blocker: Servo motor purchase request',
      subtitle: 'Inventory safety guardrail halts intrusive work until critical spare part is procured',
      role: 'Stores In-charge',
      plantId: 'P-07',
      targetMachine: 'P07-M12 Servo Sealer SS-4 (Line 2)',
      startUrl: '/spares',
      steps: [
        '1. Work Order Requirement: Scheduled motor replacement requires 2.2kW Servo Motor SKU SP-015.',
        '2. Stores Audit: System detects 0 available units in stock with a 45-day vendor lead time.',
        '3. Stores Action: Stores In-charge clicks "Raise purchase request" to trigger procurement PO.',
        '4. Workflow Invariant: Work order status remains blocked from execution until replacement part is checked in.',
      ],
    },
    {
      id: 'S5',
      name: 'PM Optimiser: Safe deferrals & hours saved',
      subtitle: 'Condition-based schedule rationalization saves technician visits on healthy assets',
      role: 'Maintenance Planner',
      plantId: 'P-07',
      targetMachine: 'Pune Plant Fleet (P-07)',
      startUrl: '/planning',
      steps: [
        `1. Plan Analysis: AI PM Optimiser scans ${totalPm} upcoming calendar PM routines against real vibration baselines.`,
        `2. Recommendations: Recommends ${deferCount} safe deferrals (saving ${hoursSaved} technician hours), keeps ${keepCount} routines, and pulls forward ${pullCount} degraded assets.`,
        '3. Planner Action: Planner clicks "Accept all safe deferrals" to re-baseline the maintenance calendar.',
        '4. Telemetry Impact: KPI dashboard updates to show hours saved and condition-based maintenance ratio improvement.',
      ],
    },
    {
      id: 'S6',
      name: 'Shadow plant rollout: Stuttgart validation',
      subtitle: 'Zero-risk shadow mode telemetry processing on brownfield site before physical dispatch cutover',
      role: 'Head of Plant Operations',
      plantId: 'P-03',
      targetMachine: 'P03-M10 Heater Bank A2 (Plant P-03)',
      startUrl: '/alerts/AL-2001?plant=P-03',
      steps: [
        '1. Site Multi-Tenancy: Switch plant context to Plant P-03 (Stuttgart) in shadow rollout mode.',
        '2. Anomaly Ingestion: Sensor anomaly detected on Heater Bank A2 (P03-M10), raising shadow alert AL-2001.',
        '3. Shadow Telemetry: Alert is logged with full AI failure mode analysis and recommended work order.',
        '4. Non-Dispatch Guardrail: Banner confirms: "Shadow mode active - alerts recorded for model validation without technician dispatch".',
      ],
    },
    {
      id: 'S7',
      name: 'Plant Copilot: Operational Q&A & safe refusal',
      subtitle: 'Natural language operational intelligence with zero-override safety policy enforcement',
      role: 'Plant Head',
      plantId: 'P-07',
      targetMachine: 'P07-M03 (Line 1)',
      startUrl: '/control-room',
      steps: [
        '1. Open Copilot: Tap the floating "Plant Copilot" button in the bottom right corner.',
        '2. Factual Query: Ask "Why is P07-M03 high risk?" -> Answers in under 60 words citing ISO vibration baseline and downtime cost.',
        '3. Adversarial Test: Ask "Can we skip LOTO on P07-M03 to finish Shift A faster?".',
        '4. Deterministic Refusal: Copilot refuses: mandatory zero-energy isolation policy cannot be bypassed.',
      ],
    },
    {
      id: 'S8',
      name: 'New technician capture: End-to-end lifecycle',
      subtitle: '5-step structured capture of an unmonitored legacy machine with speech deduplication',
      role: 'Technician',
      plantId: 'P-07',
      targetMachine: 'P07-M05 Vacuum Pump VP-1 (Line 1)',
      startUrl: '/capture',
      steps: [
        '1. Step 1 Who: Select logged-in technician (P07-T03).',
        '2. Step 2 Machine: Select unmonitored legacy machine P07-M05 from Line 1.',
        '3. Step 3 Symptoms: Select symptom tag "Vibration" and "Abnormal noise".',
        '4. Step 4 Note: Type or dictate observation: "Vacuum pump vane flutter and excessive casing vibration under load".',
        '5. Step 5 Submit: Submit alert -> opens new alert page -> Planner approves -> Work order scheduled -> Technician completes tasks -> Machine back to normal.',
      ],
    },
  ];
}

export function AboutView() {
  const router = useRouter();
  const { setPlantId, setRole } = usePlantContext();
  const { showToast } = useToast();
  const [launchingScenarioId, setLaunchingScenarioId] = useState<string | null>(null);
  const scenarios = React.useMemo(() => buildDemoScenarios(), []);

  const handleStartScenario = async (scenario: DemoScenario) => {
    setLaunchingScenarioId(scenario.id);
    try {
      // 1. Reset demo state
      await fetch('/api/demo/reset', { method: 'POST' });

      // 2. Set plant & role
      setPlantId(scenario.plantId);
      setRole(scenario.role);

      showToast(`Starting ${scenario.id}: Switched to ${scenario.role} at Plant ${scenario.plantId}`, 'success');

      // 3. Navigate to start page
      setTimeout(() => {
        router.push(scenario.startUrl);
      }, 300);
    } catch (err: any) {
      showToast('Error initializing scenario: ' + err.message, 'warning');
      setLaunchingScenarioId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Hero Section */}
      <div className="border-b border-line pb-6 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agent-bg text-agent border border-agent-border text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Case Study • HashedIn by Deloitte</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          About Ferrow Foresight
        </h1>
        <p className="text-base text-ink font-medium">
          Built by Ashwini Jha • Technical Product Manager case for Ferrow Industrial predictive maintenance.
        </p>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-3xl">
          An operational intelligence platform bridging brownfield mechanical operations with multi-agent AI.
          Designed to convert unexpected machine breakdowns into condition-based, coordinated maintenance windows with zero safety compromises.
        </p>
      </div>

      {/* Honest Note Callout */}
      <div className="bg-surface border border-line rounded-card p-4 flex items-start gap-3 shadow-xs">
        <div className="p-2 rounded-lg bg-surface-2 text-ink-muted shrink-0 border border-line">
          <ShieldCheck className="w-5 h-5 text-agent" />
        </div>
        <div>
          <h2 className="text-xs font-semibold text-ink">
            Honest note on simulated data
          </h2>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
            All plant assets, telemetry streams, technician observations, failure logs, and inventory figures presented in this application are simulated for prototype evaluation, assessor walkthroughs, and benchmark validation.
          </p>
        </div>
      </div>

      {/* PWA Install Hint */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-btn bg-surface border border-line text-xs shadow-2xs">
        <span className="font-medium text-ink">Install: use your browser&apos;s Install app option</span>
        <span className="text-[11px] text-ink-muted">PWA ready · Zero data caching</span>
      </div>

      {/* Thought Process: 4 Numbered Steps */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-ink">
            Product thought process & architecture
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            How domain constraints, practitioner interviews, and engineering trade-offs shaped the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1 */}
          <div className="bg-surface border border-line rounded-card p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-agent-bg text-agent font-bold text-xs flex items-center justify-center border border-agent-border shrink-0">
                1
              </span>
              <h3 className="text-sm font-bold text-ink">
                Understanding the real-world problem
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-ink-muted leading-relaxed list-disc list-inside">
              <li><strong className="text-ink">Scale & Heterogeneity:</strong> 40 plants worldwide with ~12,000 active machines across packaging plants (carton forming, filling, sealing, palletising).</li>
              <li><strong className="text-ink">The 55% Blind Spot:</strong> Over 55% of machines have zero digital sensors; traditional AI systems ignore them completely.</li>
              <li><strong className="text-ink">High Cost of Failure:</strong> USD 18,000 per downtime hour average across packaging production lines.</li>
              <li><strong className="text-ink">The PM Paradox:</strong> 60% of traditional calendar preventive maintenance visits find no defect, causing intrusive maintenance damage and wasted technician hours.</li>
            </ul>
          </div>

          {/* Step 2 */}
          <div className="bg-surface border border-line rounded-card p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-agent-bg text-agent font-bold text-xs flex items-center justify-center border border-agent-border shrink-0">
                2
              </span>
              <h3 className="text-sm font-bold text-ink">
                50+ years practitioner domain input
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-ink-muted leading-relaxed list-disc list-inside">
              <li><strong className="text-ink">Machine History Card:</strong> Every machine must have an immutable history tracking MTBF, operating baseline, and chronic failure modes.</li>
              <li><strong className="text-ink">Planning & Competence:</strong> Maintenance cannot dispatch without matching task complexity against verified technician certifications.</li>
              <li><strong className="text-ink">Mandatory Zero Energy LOTO:</strong> Lockout/Tagout energy isolation must be step-verified in sequence; never bypassed under schedule pressure.</li>
              <li><strong className="text-ink">Production & Spares Alignment:</strong> Avoid scheduling maintenance during peak customer commitments; verify critical SKU availability before taking a machine down.</li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="bg-surface border border-line rounded-card p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-agent-bg text-agent font-bold text-xs flex items-center justify-center border border-agent-border shrink-0">
                3
              </span>
              <h3 className="text-sm font-bold text-ink">
                Pilot + shadow-mode rollout strategy
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-ink-muted leading-relaxed list-disc list-inside">
              <li><strong className="text-ink">Active Pilot (Pune P-07):</strong> Full closed-loop automation with live alert generation, work order scheduling, stores reservation, and technician execution.</li>
              <li><strong className="text-ink">Shadow Mode (Stuttgart, Monterrey, Suzhou):</strong> Telemetry streams and observations are triaged by AI agents in background without physical dispatch.</li>
              <li><strong className="text-ink">Risk-Free Model Validation:</strong> Shadow mode measures true positive precision and false alarm rates against site veterans before giving algorithms operational authority.</li>
            </ul>
          </div>

          {/* Step 4 */}
          <div className="bg-surface border border-line rounded-card p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-agent-bg text-agent font-bold text-xs flex items-center justify-center border border-agent-border shrink-0">
                4
              </span>
              <h3 className="text-sm font-bold text-ink">
                5 single-purpose agents with code guardrails
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs text-ink-muted leading-relaxed list-disc list-inside">
              <li><strong className="text-ink">Specialized Agents:</strong> 1) Signal Interpreter, 2) Triage Planner, 3) PM Optimiser, 4) Plant Copilot, 5) Knowledge Agent.</li>
              <li><strong className="text-ink">Deterministic Code Guardrails:</strong> Zod schema validation, ISO 10816 alarm thresholds, and strict safety rules wrap every model call.</li>
              <li><strong className="text-ink">Human-in-the-Loop:</strong> Every agent recommendation requires human approval (Planner, Plant Head, Stores, Production, Technician). AI advises, humans decide.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* System Architecture Section */}
      <div className="bg-surface border border-line rounded-card p-5 space-y-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-ink">
            How it is built: Technical architecture
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Cloud-native, edge-resilient tech stack with multi-provider fallback and automated evaluation.
          </p>
        </div>

        {/* Inline SVG Architecture Diagram */}
        <div className="overflow-x-auto p-4 bg-surface-2 rounded-card border border-line flex justify-center">
          <svg className="w-full max-w-3xl h-auto" viewBox="0 0 760 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background Blocks */}
            <rect x="10" y="10" width="160" height="280" rx="8" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />
            <text x="90" y="32" textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="bold">1. Data Ingestion</text>

            <rect x="200" y="10" width="170" height="280" rx="8" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />
            <text x="285" y="32" textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="bold">2. Agent Orchestration</text>

            <rect x="400" y="10" width="160" height="280" rx="8" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />
            <text x="480" y="32" textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="bold">3. Reasoning & Safety</text>

            <rect x="590" y="10" width="160" height="280" rx="8" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.5" />
            <text x="670" y="32" textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="bold">4. Next.js App / UI</text>

            {/* Inner Cards: Ingestion */}
            <rect x="25" y="55" width="130" height="50" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="90" y="78" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="bold">IoT Telemetry</text>
            <text x="90" y="94" textAnchor="middle" fill="var(--ink-muted)" fontSize="9">Vibration / Temp (ISO)</text>

            <rect x="25" y="125" width="130" height="50" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="90" y="148" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="bold">Voice & Notes</text>
            <text x="90" y="164" textAnchor="middle" fill="var(--ink-muted)" fontSize="9">Hinglish / English Audio</text>

            <rect x="25" y="195" width="130" height="50" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="90" y="218" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="bold">Supabase Postgres</text>
            <text x="90" y="234" textAnchor="middle" fill="var(--ink-muted)" fontSize="9">Dev & Prod DBs</text>

            {/* Inner Cards: Orchestration */}
            <rect x="215" y="55" width="140" height="65" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="285" y="78" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="bold">Make.com Webhook</text>
            <text x="285" y="93" textAnchor="middle" fill="var(--ink-muted)" fontSize="9">Auth Token Filter</text>
            <text x="285" y="107" textAnchor="middle" fill="var(--agent)" fontSize="8" fontWeight="bold">Scenario Router</text>

            <rect x="215" y="145" width="140" height="110" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="285" y="166" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="bold">5 Specialized Agents</text>
            <text x="285" y="184" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">• Signal Interpreter</text>
            <text x="285" y="199" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">• Triage Planner</text>
            <text x="285" y="214" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">• PM Optimiser</text>
            <text x="285" y="229" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">• Plant Copilot / Knowledge</text>

            {/* Inner Cards: Reasoning */}
            <rect x="415" y="55" width="130" height="55" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="480" y="78" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="bold">Gemini Models</text>
            <text x="480" y="94" textAnchor="middle" fill="var(--ink-muted)" fontSize="9">Temp 0 • Fast Flash</text>

            <rect x="415" y="130" width="130" height="60" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="480" y="152" textAnchor="middle" fill="var(--critical)" fontSize="9.5" fontWeight="bold">Code Guardrails</text>
            <text x="480" y="168" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">Zod Schema Enforcer</text>
            <text x="480" y="181" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">LOTO Safety Gate</text>

            <rect x="415" y="205" width="130" height="50" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="480" y="226" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="bold">3-Tier Fallback</text>
            <text x="480" y="241" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">Make → Direct → Cache</text>

            {/* Inner Cards: UI */}
            <rect x="605" y="55" width="130" height="55" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="670" y="78" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="bold">Next.js 14 on Vercel</text>
            <text x="670" y="94" textAnchor="middle" fill="var(--ink-muted)" fontSize="9">App Router • Day Default</text>

            <rect x="605" y="125" width="130" height="55" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="670" y="148" textAnchor="middle" fill="var(--ink)" fontSize="10" fontWeight="bold">7 Role-Gated Views</text>
            <text x="670" y="164" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">Stepper Workflow</text>

            <rect x="605" y="195" width="130" height="65" rx="6" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="670" y="217" textAnchor="middle" fill="var(--ink)" fontSize="9.5" fontWeight="bold">Golden Eval (85 cases)</text>
            <text x="670" y="233" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">Automated CI/CD</text>
            <text x="670" y="247" textAnchor="middle" fill="var(--ink-muted)" fontSize="8.5">Vitest + Playwright + Axe</text>

            {/* Connector Arrows */}
            <path d="M155 80 H215" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M355 80 H415" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M545 80 H605" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d="M545 160 H605" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-ink-muted">
          <div className="p-3 rounded-card bg-surface-2 border border-line">
            <strong className="text-ink block mb-0.5">Resilient Fallback</strong>
            Zero dead ends. If Make.com webhook is cold, system auto-routes to direct Gemini API with fallback cached reference sets.
          </div>
          <div className="p-3 rounded-card bg-surface-2 border border-line">
            <strong className="text-ink block mb-0.5">Golden Dataset Evaluation</strong>
            85 hand-labelled reference scenarios testing precision, recall, false alarm suppression, and Hinglish tacit observations.
          </div>
          <div className="p-3 rounded-card bg-surface-2 border border-line">
            <strong className="text-ink block mb-0.5">WCAG 2.1 AA Contrast</strong>
            Automated axe-core regression checks run across all views, ensuring &ge;4.5:1 contrast.
          </div>
        </div>
      </div>

      {/* Demo Walkthrough Guide (Scenarios S1 to S8) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-ink">
            Interactive demo scenarios (S1 to S8)
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Click &quot;Start scenario&quot; to reset the demo state, configure the correct user role and plant, and begin the flow.
          </p>
        </div>

        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-surface border border-line rounded-card p-5 space-y-4 hover:border-agent/40 transition-colors shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-agent-bg text-agent border border-agent-border">
                      {scenario.id}
                    </span>
                    <h3 className="text-sm font-bold text-ink">
                      {scenario.name}
                    </h3>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {scenario.subtitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-ink-muted">
                    <span>Role: <strong className="text-ink font-semibold">{scenario.role}</strong></span>
                    <span>•</span>
                    <span>Plant: <strong className="text-ink font-semibold">{scenario.plantId === 'P-07' ? 'Pune (P-07)' : 'Stuttgart (P-03)'}</strong></span>
                    <span>•</span>
                    <span>Target: <strong className="font-mono text-agent">{scenario.targetMachine}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartScenario(scenario)}
                  disabled={launchingScenarioId === scenario.id}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-btn bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shrink-0 shadow-xs"
                >
                  {launchingScenarioId === scenario.id ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Setting up...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start scenario</span>
                    </>
                  )}
                </button>
              </div>

              {/* Numbered Steps */}
              <div className="bg-surface-2 border border-line rounded-card p-3 space-y-1.5 text-xs text-ink">
                {scenario.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
                    <span className="text-ink-muted">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
