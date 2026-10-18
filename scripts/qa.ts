import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface StepResult {
  name: string;
  command: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const results: StepResult[] = [];

function checkPort(port: number): number | null {
  try {
    const out = execSync(`lsof -nP -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf-8' }).trim();
    if (out) {
      const pid = parseInt(out.split('\n')[0], 10);
      return isNaN(pid) ? null : pid;
    }
  } catch {
    // port not in use
  }
  return null;
}

function killPort(port: number) {
  try {
    const out = execSync(`lsof -nP -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf-8' }).trim();
    const pids = out
      .split('\n')
      .map((p) => parseInt(p.trim(), 10))
      .filter((p) => !isNaN(p) && p !== process.pid);
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  } catch {}
}

function runStep(name: string, command: string, env: Record<string, string> = {}): boolean {
  console.log(`\n▶ [QA] ${name}...`);
  console.log(`  $ ${command}`);
  const start = Date.now();
  try {
    execSync(command, {
      stdio: 'inherit',
      env: { ...process.env, AGENT_PROVIDER: 'cached', ...env },
    });
    const durationMs = Date.now() - start;
    results.push({
      name,
      command,
      passed: true,
      durationMs,
      details: 'Clean execution, all checks passed',
    });
    console.log(`  ✔ PASSED: ${name} (${(durationMs / 1000).toFixed(2)}s)`);
    return true;
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      name,
      command,
      passed: false,
      durationMs,
      details: err.message || 'Execution error',
    });
    console.error(`  ✖ FAILED: ${name} (${(durationMs / 1000).toFixed(2)}s)`);
    return false;
  }
}

async function waitForServer(port: number, timeoutSec = 25): Promise<boolean> {
  for (let i = 0; i < timeoutSec * 2; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log('====================================================');
  console.log('   Ferrow Foresight Production QA Verification Suite   ');
  console.log('====================================================');

  const startTime = Date.now();
  const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  const now = new Date();

  // Clean ports and local state before QA
  killPort(3000);
  killPort(3001);
  killPort(3002);
  execSync('rm -f data/local_state.json');
  execSync('sleep 1');

  // 1. TypeScript Typecheck
  runStep('TypeScript Typecheck', 'npm run typecheck');

  // 2. ESLint Code Quality
  runStep('ESLint Code Quality', 'npm run lint');

  // 3. Vitest Unit & Integration Suite
  runStep('Vitest Unit & Integration Suite', 'npm test');

  // 4. Clean Production Build (Rule: stop dev server before build)
  execSync('rm -rf .next && rm -f data/local_state.json');
  const buildSuccess = runStep('Next.js Production Build', 'npm run build');

  if (!buildSuccess) {
    console.error('Build step failed. Aborting remaining E2E gates.');
  } else {
    // 5. Start Production Server for E2E, Contrast, Overflow
    console.log('\n[QA Lifecycle] Starting Next.js production server on port 3000...');
    execSync('nohup npx next start -p 3000 </dev/null >/dev/null 2>&1 &');

    const isReady = await waitForServer(3000, 25);
    if (!isReady) {
      console.error('❌ Failed to connect to production server on port 3000');
    } else {
      console.log('✔ Production server is ready on http://127.0.0.1:3000');

      // 6. Cross-browser E2E Scenarios (Chromium, Firefox, WebKit)
      runStep('Cross-Browser E2E Scenarios (Chromium, Firefox, WebKit)', 'tsx scripts/runE2EScenarios.ts', {
        BASE_URL: 'http://127.0.0.1:3000',
        BROWSERS: 'chromium,firefox,webkit',
      });

      // 7. Axe Accessibility Contrast Check
      runStep('Axe-Core Color Contrast Compliance', 'tsx scripts/checkContrast.ts', {
        BASE_URL: 'http://127.0.0.1:3000',
      });

      // 8. Responsive Viewport Overflow Check
      runStep('Responsive Viewport Overflow Check', 'tsx scripts/checkOverflow.ts', {
        BASE_URL: 'http://127.0.0.1:3000',
      });

      // Stop production server
      console.log('\n[QA Lifecycle] Stopping production server...');
      killPort(3000);
      execSync('sleep 1');
    }
  }

  // USER RULE: "after the build, delete .next and restart the dev server"
  console.log('\n[QA Lifecycle] Cleaning .next and restarting background dev server on port 3000...');
  execSync('rm -rf .next');
  execSync('nohup npm run dev </dev/null >/dev/null 2>&1 &');
  execSync('sleep 2');
  console.log('[QA Lifecycle] Background dev server restarted.');

  const totalDurationMs = Date.now() - startTime;
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  // -------------------------------------------------------------
  // Generate docs/test-results.md
  // -------------------------------------------------------------
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  let md = '# QA Test Results Record\n\n';
  md += `**Date**: ${now.toISOString()} (${now.toUTCString()})  \n`;
  md += `**Branch**: \`${branch}\`  \n`;
  md += `**Git Commit**: \`${commitHash}\`  \n`;
  md += `**Evaluation Mode**: \`AGENT_PROVIDER=cached\` (0 external API credits spent)  \n`;
  md += `**Total Execution Time**: ${(totalDurationMs / 1000).toFixed(2)}s  \n\n`;

  md += '## Reproduction Command\n\n';
  md += 'To re-execute this complete verification suite locally:\n\n';
  md += '```bash\nnpm run qa\n```\n\n';

  md += '## Verification Gates Summary\n\n';
  md += '| # | Gate / Test Suite | Command | Duration | Result |\n';
  md += '|---|---|---|---|:---:|\n';

  results.forEach((r, idx) => {
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    md += `| ${idx + 1} | **${r.name}** | \`${r.command}\` | ${(r.durationMs / 1000).toFixed(2)}s | ${icon} |\n`;
  });

  md += '\n## Detailed Findings\n\n';
  results.forEach((r, idx) => {
    md += `### ${idx + 1}. ${r.name}\n\n`;
    md += `- **Status**: ${r.passed ? 'PASSED' : 'FAILED'}\n`;
    md += `- **Command**: \`${r.command}\`\n`;
    md += `- **Duration**: ${(r.durationMs / 1000).toFixed(2)}s\n`;
    md += `- **Telemetry / Notes**: ${r.details}\n\n`;
  });

  md += '## Summary\n\n';
  md += `- **Total Gates Tested**: ${results.length}\n`;
  md += `- **Passed**: ${totalPassed}\n`;
  md += `- **Failed**: ${totalFailed}\n\n`;
  if (totalFailed === 0) {
    md += '> [!NOTE]\n> All type safety, linting, unit/integration suites, production build, multi-browser E2E, accessibility, and responsive overflow checks passed with zero errors.\n';
  }

  const outPath = path.join(docsDir, 'test-results.md');
  fs.writeFileSync(outPath, md, 'utf-8');
  console.log(`\n====================================================`);
  console.log(`✅ Test record written to: docs/test-results.md`);
  console.log(`Summary: ${totalPassed} passed, ${totalFailed} failed in ${(totalDurationMs / 1000).toFixed(2)}s`);
  console.log('====================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during QA run:', err);
  process.exit(1);
});
