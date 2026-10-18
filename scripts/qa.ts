import { execSync } from 'child_process';

const steps = [
  { name: 'TypeScript Typecheck', cmd: 'npx tsc --noEmit' },
  { name: 'ESLint Code Quality', cmd: 'npx next lint' },
  { name: 'Vitest Unit & Integration Suite', cmd: 'AGENT_PROVIDER=cached npx vitest run' },
  { name: 'Playwright E2E Demo Scenarios (1440px & 375px)', cmd: 'AGENT_PROVIDER=cached npx tsx scripts/runE2EScenarios.ts' },
  { name: 'Axe-Core Automated Contrast Check', cmd: 'AGENT_PROVIDER=cached npx tsx scripts/checkContrast.ts' },
  { name: 'Responsive Viewport Overflow Check (375px - 1920px)', cmd: 'AGENT_PROVIDER=cached npx tsx scripts/checkOverflow.ts' },
];

console.log('====================================================');
console.log('       Ferrow Foresight Quality Assurance (QA)       ');
console.log('====================================================\n');

for (const step of steps) {
  console.log(`▶ Running: ${step.name}...`);
  try {
    execSync(step.cmd, { stdio: 'inherit', env: { ...process.env, AGENT_PROVIDER: 'cached' } });
    console.log(`✔ Passed: ${step.name}\n`);
  } catch (err: any) {
    console.error(`\n✖ FAILED: ${step.name}`);
    console.error(`Stopping QA process on first failure.`);
    process.exit(1);
  }
}

console.log('====================================================');
console.log('🎉 ALL QA GATES PASSED (Types, Lints, Tests, E2E, Contrast, Overflow)');
console.log('====================================================');
