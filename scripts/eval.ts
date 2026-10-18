import fs from 'fs';
import path from 'path';
import { executeAgent } from '../lib/agents/agentRouter';
import { AgentProviderName } from '../lib/agents/types';

// 1. Load .env.local without external dependencies
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// 2. Parse command line arguments (--provider, --limit)
const args = process.argv.slice(2);
let providerArg: AgentProviderName = 'direct';
let limitArg = Infinity;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--provider' && args[i + 1]) {
    providerArg = args[++i] as AgentProviderName;
  } else if (args[i] === '--limit' && args[i + 1]) {
    limitArg = parseInt(args[++i], 10);
  }
}

console.log(`=== Ferrow Foresight Golden Set Evaluation ===`);
console.log(`Provider: ${providerArg}`);
console.log(`Limit: ${limitArg === Infinity ? 'Full dataset (85 cases)' : limitArg}`);

// 3. Load Excluded IDs
const excludedIds = new Set<string>();
const excludedPath = path.resolve(
  process.cwd(),
  'make',
  'FEWSHOT_CASES_EXCLUDED_FROM_EVAL.txt'
);
if (fs.existsSync(excludedPath)) {
  const content = fs.readFileSync(excludedPath, 'utf-8');
  for (const line of content.split('\n')) {
    const id = line.trim();
    if (id) excludedIds.add(id);
  }
}
console.log(`Excluded cases (few-shot): ${Array.from(excludedIds).join(', ')}`);

// 4. Load Golden Dataset
const datasetPath = path.resolve(process.cwd(), 'golden', 'golden_dataset.json');
if (!fs.existsSync(datasetPath)) {
  console.error(`Dataset not found at ${datasetPath}`);
  process.exit(1);
}

const rawDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8')) as any[];
const casesToEvaluate = rawDataset
  .filter((c) => !excludedIds.has(c.case_id))
  .slice(0, limitArg);

console.log(`Total cases to evaluate: ${casesToEvaluate.length}\n`);

interface CaseEvalResult {
  case_id: string;
  category: string;
  description: string;
  expected: any;
  actual: any;
  latency_ms: number;
  valid_json: boolean;
  alert_match: boolean;
  failure_mode_match: boolean;
  urgency_match: boolean;
  loto_correct: boolean;
  uncertified_assigned: boolean;
  insufficient_evidence_match: boolean;
  error?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(str: any): string {
  if (!str) return '';
  return String(str).toLowerCase().trim().replace(/[-\s]/g, '_');
}

async function runEvaluation() {
  const results: CaseEvalResult[] = [];
  const latencies: number[] = [];

  for (let idx = 0; idx < casesToEvaluate.length; idx++) {
    const c = casesToEvaluate[idx];
    const progress = `[${idx + 1}/${casesToEvaluate.length}]`;
    console.log(`${progress} Evaluating ${c.case_id} (${c.category})...`);

    const input = c.input;
    const expected = c.expected;

    let attempts = 0;
    let evalOutput: any = null;
    let caseLatency = 0;
    let caseError: string | undefined;

    // Retry loop on transient error / 429
    while (attempts < 3) {
      attempts++;
      const startTime = Date.now();
      try {
        const triageContext = {
          machine: input.machine,
          sensor: input.sensor,
          observation: input.observation,
          recent_history: input.recent_history,
          spares: input.spares,
          technicians_on_shift: input.technicians_on_shift,
          production_windows: input.production_windows,
        };

        const res = await executeAgent({
          agent: 'triage',
          forceProvider: providerArg,
          bypassRateLimit: true,
          interpreter_input: { observation: input.observation },
          triage_context: triageContext,
          context: triageContext,
          machine_id: input.machine?.id || 'P07-M01',
          plant_id: 'P-07',
          trigger: 'golden_eval',
        });

        caseLatency = res.latency_ms || Date.now() - startTime;

        if (res.data && (providerArg === 'cached' || res.provider !== 'cached')) {
          console.log(`  -> Result: Alert=${res.data.alert}, Mode=${res.data.failure_mode}, Urgency=${res.data.urgency}, LOTO=${res.data.loto_required}`);
          evalOutput = res.data;
          break;
        } else {
          console.warn(`  -> Rate limit or live error (${res.provider}: ${res.error || 'fell back to cached'}), waiting 8s before attempt ${attempts + 1}...`);
          await sleep(8000 * attempts);
          continue;
        }
      } catch (err: any) {
        caseLatency = Date.now() - startTime;
        caseError = err?.message || String(err);
        console.warn(`  -> Error: ${caseError}, waiting 8s before retry...`);
        await sleep(8000 * attempts);
      }
    }

    latencies.push(caseLatency);

    const actual = evalOutput || {};
    const validJson = Boolean(evalOutput && typeof evalOutput === 'object');

    // 1. Alert decision match
    const actualAlert = Boolean(actual.alert);
    const expectedAlert = Boolean(expected.alert);
    const alertMatch = actualAlert === expectedAlert;

    // 2. Failure mode match (evaluated on alert cases)
    const actualMode = normalize(actual.failure_mode);
    const expectedMode = normalize(expected.failure_mode);
    const failureModeMatch = expectedAlert ? actualMode === expectedMode : true;

    // 3. Urgency match (evaluated on alert cases)
    const actualUrgency = normalize(actual.urgency);
    const expectedUrgency = normalize(expected.urgency);
    const urgencyMatch = expectedAlert ? actualUrgency === expectedUrgency : true;

    // 4. LOTO correctness
    const actualLoto = Boolean(actual.loto_required);
    const expectedLoto = Boolean(expected.loto_required);
    const lotoCorrect = actualLoto === expectedLoto;

    // 5. Uncertified assignment check
    const assignedTech = actual.assigned_technician;
    const mustNotAssign = Array.isArray(expected.must_not_assign)
      ? expected.must_not_assign
      : [];
    const uncertifiedAssigned = assignedTech
      ? mustNotAssign.includes(assignedTech)
      : false;

    // 6. Insufficient evidence detection
    const actualInsuff = Boolean(actual.insufficient_evidence);
    const expectedInsuff = Boolean(expected.insufficient_evidence);
    const insuffMatch = expectedInsuff ? actualInsuff === true : true;

    results.push({
      case_id: c.case_id,
      category: c.category,
      description: c.description,
      expected,
      actual,
      latency_ms: caseLatency,
      valid_json: validJson,
      alert_match: alertMatch,
      failure_mode_match: failureModeMatch,
      urgency_match: urgencyMatch,
      loto_correct: lotoCorrect,
      uncertified_assigned: uncertifiedAssigned,
      insufficient_evidence_match: insuffMatch,
      error: caseError,
    });

    // Polite inter-request delay to protect free-tier quotas when using direct provider
    if (providerArg === 'direct') {
      await sleep(1200);
    }
  }

  // --- Compute Overall Metrics ---
  const total = results.length;

  // Alert precision & recall
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (const r of results) {
    const exp = Boolean(r.expected.alert);
    const act = Boolean(r.actual?.alert);
    if (exp && act) tp++;
    else if (!exp && act) fp++;
    else if (exp && !act) fn++;
    else tn++;
  }

  const alertPrecision = tp + fp > 0 ? tp / (tp + fp) : 1.0;
  const alertRecall = tp + fn > 0 ? tp / (tp + fn) : 1.0;

  // Trap false alarm rate
  const trapCases = results.filter((r) => r.category === 'false_alarm_trap');
  const trapFalseAlarms = trapCases.filter((r) => Boolean(r.actual?.alert)).length;
  const trapRate = trapCases.length > 0 ? trapFalseAlarms / trapCases.length : 0;

  // Failure mode accuracy on expected alert cases
  const alertCases = results.filter((r) => Boolean(r.expected.alert));
  const modeCorrect = alertCases.filter((r) => r.failure_mode_match).length;
  const failureModeAcc = alertCases.length > 0 ? modeCorrect / alertCases.length : 1.0;

  // Urgency match on expected alert cases
  const urgencyCorrect = alertCases.filter((r) => r.urgency_match).length;
  const urgencyMatchAcc = alertCases.length > 0 ? urgencyCorrect / alertCases.length : 1.0;

  // LOTO correctness across all cases
  const lotoCorrectCount = results.filter((r) => r.loto_correct).length;
  const lotoAcc = total > 0 ? lotoCorrectCount / total : 1.0;

  // Uncertified assignment violations count
  const uncertifiedCount = results.filter((r) => r.uncertified_assigned).length;

  // Insufficient evidence detection
  const insuffExpectedCases = results.filter(
    (r) => Boolean(r.expected.insufficient_evidence)
  );
  const insuffDetected = insuffExpectedCases.filter(
    (r) => r.insufficient_evidence_match
  ).length;
  const insuffAcc =
    insuffExpectedCases.length > 0
      ? insuffDetected / insuffExpectedCases.length
      : 1.0;

  // Valid JSON
  const validJsonCount = results.filter((r) => r.valid_json).length;
  const validJsonAcc = total > 0 ? validJsonCount / total : 1.0;

  // Latency p95
  latencies.sort((a, b) => a - b);
  const p95Idx = Math.min(
    latencies.length - 1,
    Math.floor(latencies.length * 0.95)
  );
  const p95LatencySec = ((latencies[p95Idx] || 0) / 1000).toFixed(2);
  const avgLatencySec = (
    latencies.reduce((a, b) => a + b, 0) / (latencies.length * 1000 || 1)
  ).toFixed(2);

  // Scorecard JSON (matching exact metric keys in AgentConsoleView)
  const scorecardJson: Record<string, any> = {
    'Alert precision': `${(alertPrecision * 100).toFixed(1)}%`,
    'Alert recall': `${(alertRecall * 100).toFixed(1)}%`,
    'False alarm rate on trap cases': `${(trapRate * 100).toFixed(1)}%`,
    'Failure-mode accuracy (alert cases)': `${(failureModeAcc * 100).toFixed(1)}%`,
    'Urgency exact match': `${(urgencyMatchAcc * 100).toFixed(1)}%`,
    'LOTO correctness': `${(lotoAcc * 100).toFixed(1)}%`,
    'Uncertified assignment': `${uncertifiedCount} cases`,
    'Insufficient-evidence detection': `${(insuffAcc * 100).toFixed(1)}%`,
    'Valid JSON': `${(validJsonAcc * 100).toFixed(1)}%`,
    'p95 latency per case': `${p95LatencySec} s`,
    summary: {
      total_cases: total,
      provider: providerArg,
      evaluated_at: new Date().toISOString(),
      alert_precision: alertPrecision,
      alert_recall: alertRecall,
      trap_false_alarm_rate: trapRate,
      failure_mode_accuracy: failureModeAcc,
      urgency_match_accuracy: urgencyMatchAcc,
      loto_correctness: lotoAcc,
      uncertified_violations: uncertifiedCount,
      insufficient_evidence_detection: insuffAcc,
      valid_json_rate: validJsonAcc,
      p95_latency_sec: parseFloat(p95LatencySec),
      avg_latency_sec: parseFloat(avgLatencySec),
    },
  };

  // Category breakdown
  const categoryStats: Record<string, any> = {};
  const categories = Array.from(new Set(results.map((r) => r.category)));

  for (const cat of categories) {
    const list = results.filter((r) => r.category === cat);
    const catAlerts = list.filter((r) => Boolean(r.expected.alert));
    const catModeMatch = catAlerts.filter((r) => r.failure_mode_match).length;
    const catUrgencyMatch = catAlerts.filter((r) => r.urgency_match).length;
    const catLoto = list.filter((r) => r.loto_correct).length;
    categoryStats[cat] = {
      cases: list.length,
      alert_match_pct: `${((list.filter((r) => r.alert_match).length / list.length) * 100).toFixed(1)}%`,
      failure_mode_pct: catAlerts.length > 0 ? `${((catModeMatch / catAlerts.length) * 100).toFixed(1)}%` : 'N/A',
      urgency_pct: catAlerts.length > 0 ? `${((catUrgencyMatch / catAlerts.length) * 100).toFixed(1)}%` : 'N/A',
      loto_correct_pct: `${((catLoto / list.length) * 100).toFixed(1)}%`,
    };
  }

  scorecardJson.categories = categoryStats;

  // 5. Write to golden/eval_results.json
  const outJsonPath = path.resolve(process.cwd(), 'golden', 'eval_results.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(scorecardJson, null, 2), 'utf-8');
  console.log(`Saved results to ${outJsonPath}`);

  // 6. Write to golden/eval_report.md
  const reportMd = `# Golden Dataset Evaluation Report

**Generated:** ${new Date().toISOString()}  
**Provider:** ${providerArg}  
**Total Cases Evaluated:** ${total} (Excluded few-shot: ${Array.from(excludedIds).join(', ')})

## 1. Overall Scorecard vs Targets

| Evaluation Metric | Target Threshold | Achieved Result | Status |
|---|---|---|---|
| Alert precision | >= 0.85 | ${scorecardJson['Alert precision']} | ${alertPrecision >= 0.85 ? 'PASS' : 'WARN'} |
| Alert recall | >= 0.90 | ${scorecardJson['Alert recall']} | ${alertRecall >= 0.90 ? 'PASS' : 'WARN'} |
| False alarm rate on trap cases | <= 10% | ${scorecardJson['False alarm rate on trap cases']} | ${trapRate <= 0.10 ? 'PASS' : 'WARN'} |
| Failure-mode accuracy (alert cases) | >= 0.80 | ${scorecardJson['Failure-mode accuracy (alert cases)']} | ${failureModeAcc >= 0.80 ? 'PASS' : 'WARN'} |
| Urgency exact match | >= 0.75 | ${scorecardJson['Urgency exact match']} | ${urgencyMatchAcc >= 0.75 ? 'PASS' : 'WARN'} |
| LOTO correctness | 100% | ${scorecardJson['LOTO correctness']} | ${lotoAcc >= 1.0 ? 'PASS' : 'FAIL'} |
| Uncertified assignment | 0 cases | ${scorecardJson['Uncertified assignment']} | ${uncertifiedCount === 0 ? 'PASS' : 'BLOCKER'} |
| Insufficient-evidence detection | >= 0.90 | ${scorecardJson['Insufficient-evidence detection']} | ${insuffAcc >= 0.90 ? 'PASS' : 'WARN'} |
| Valid JSON | 100% | ${scorecardJson['Valid JSON']} | ${validJsonAcc >= 1.0 ? 'PASS' : 'FAIL'} |
| p95 latency per case | < 8 s | ${scorecardJson['p95 latency per case']} | ${parseFloat(p95LatencySec) < 8.0 ? 'PASS' : 'WARN'} |

## 2. Category Performance Breakdown

| Category | Cases | Alert Match | Failure Mode Match | Urgency Match | LOTO Correct |
|---|---|---|---|---|---|
${Object.entries(categoryStats)
  .map(
    ([cName, s]) =>
      `| \`${cName}\` | ${s.cases} | ${s.alert_match_pct} | ${s.failure_mode_pct} | ${s.urgency_pct} | ${s.loto_correct_pct} |`
  )
  .join('\n')}

## 3. Latency Distribution

- **Minimum:** ${((latencies[0] || 0) / 1000).toFixed(2)} s
- **Average:** ${avgLatencySec} s
- **p95:** ${p95LatencySec} s
- **Maximum:** ${((latencies[latencies.length - 1] || 0) / 1000).toFixed(2)} s
`;

  const outReportPath = path.resolve(process.cwd(), 'golden', 'eval_report.md');
  fs.writeFileSync(outReportPath, reportMd, 'utf-8');
  console.log(`Saved markdown report to ${outReportPath}`);

  console.log('\n=== Evaluation Completed Successfully ===');
  console.table({
    'Alert precision': scorecardJson['Alert precision'],
    'Alert recall': scorecardJson['Alert recall'],
    'False alarm trap rate': scorecardJson['False alarm rate on trap cases'],
    'Failure-mode acc': scorecardJson['Failure-mode accuracy (alert cases)'],
    'Urgency match': scorecardJson['Urgency exact match'],
    'LOTO correctness': scorecardJson['LOTO correctness'],
    'Uncertified assignments': scorecardJson['Uncertified assignment'],
    'Insufficient evidence': scorecardJson['Insufficient-evidence detection'],
    'Valid JSON': scorecardJson['Valid JSON'],
    'p95 latency': scorecardJson['p95 latency per case'],
  });
}

runEvaluation().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
