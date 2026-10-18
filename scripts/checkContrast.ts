import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const PAGES = [
  '/',
  '/alerts',
  '/work-orders',
  '/planning',
  '/production',
  '/spares',
  '/people',
  '/kpis',
  '/capture',
  '/agent',
  '/about',
  '/status',
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  let totalViolations = 0;

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  for (const path of PAGES) {
    try {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(300);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const violations = accessibilityScanResults.violations;
      if (violations.length > 0) {
        console.log(`❌ [LIGHT] ${path}: ${violations.length} contrast violation(s)`);
        violations.forEach((v) => {
          console.log(`   Rule: ${v.id} - ${v.help}`);
          v.nodes.slice(0, 3).forEach((n) => {
            console.log(`     Target: ${n.target.join(' ')}`);
            console.log(`     Summary: ${n.failureSummary}`);
          });
        });
        totalViolations += violations.length;
      } else {
        console.log(`✅ [LIGHT] ${path}: 0 contrast violations`);
      }
    } catch (err: any) {
      console.error(`Error checking ${path}:`, err.message);
    }
  }

  await page.close();
  await context.close();

  await browser.close();

  console.log(`\nContrast check finished. Total violations: ${totalViolations}`);
  if (totalViolations > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
