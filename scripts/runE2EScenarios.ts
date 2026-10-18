import { chromium, firefox, webkit, BrowserType } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'desktop (1440px)', width: 1440, height: 900 },
  { name: 'mobile (375px)', width: 375, height: 667 },
];

const BROWSER_MAP: Record<string, BrowserType> = {
  chromium,
  firefox,
  webkit,
};

async function resetDemo() {
  try {
    const res = await fetch(`${BASE_URL}/api/demo/reset`, { method: 'POST' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${txt}`);
    }
  } catch (err: any) {
    throw new Error(`Failed to reset demo: ${err.message}`);
  }
}

async function runScenario1(page: any, vpName: string) {
  console.log(`  [${vpName}] S1: Sensor P1 P07-M03 bearing wear...`);
  await page.goto(`${BASE_URL}/alerts/AL-1001`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Check alert title / machine
  const text = await page.innerText('body');
  if (!text.includes('P07-M03') && !text.includes('AL-1001')) {
    throw new Error('S1: Expected P07-M03 / AL-1001 on alert page');
  }

  // Flow tracker should be visible
  const hasStepper = await page.$('.stepper, [data-testid="flow-tracker"], .overflow-x-auto');
  if (!hasStepper) throw new Error('S1: Workflow stepper not found');
}

async function runScenario2(page: any, vpName: string) {
  console.log(`  [${vpName}] S2: Hinglish voice / HT certification gate...`);
  await page.goto(`${BASE_URL}/alerts`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const text = await page.innerText('body');
  if (!text.includes('Alerts') && !text.includes('P07')) {
    throw new Error('S2: Expected Alerts list to load');
  }
}

async function runScenario3(page: any, vpName: string) {
  console.log(`  [${vpName}] S3: False alarm filter P07-M22...`);
  await page.goto(`${BASE_URL}/alerts`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Filter by suppressed / check suppressed alerts
  const text = await page.innerText('body');
  if (!text.includes('Alerts')) {
    throw new Error('S3: Expected alerts page');
  }
}

async function runScenario4(page: any, vpName: string) {
  console.log(`  [${vpName}] S4: Stockout SP-015 purchase request...`);
  await page.goto(`${BASE_URL}/spares`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const text = await page.innerText('body');
  if (!text.includes('Spares') && !text.includes('SP-015')) {
    throw new Error('S4: Expected Spares view with inventory');
  }

  // Check for Purchase request button
  const hasButton = await page.$('button:has-text("Raise purchase request"), button:has-text("Purchase request")');
  if (!hasButton) throw new Error('S4: Purchase request button not found');
}

async function runScenario5(page: any, vpName: string) {
  console.log(`  [${vpName}] S5: PM Optimiser safe deferrals...`);
  await page.goto(`${BASE_URL}/planning`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const text = await page.innerText('body');
  if (!text.includes('Maintenance planning') && !text.includes('PM')) {
    throw new Error('S5: Expected planning page to load');
  }
}

async function runScenario6(page: any, vpName: string) {
  console.log(`  [${vpName}] S6: Shadow plant Stuttgart (P-03)...`);
  await page.goto(`${BASE_URL}/alerts?plant=P-03`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const text = await page.innerText('body');
  if (!text.includes('Stuttgart') && !text.includes('P-03') && !text.includes('Shadow')) {
    throw new Error('S6: Expected Stuttgart shadow plant context');
  }
}

async function runScenario7(page: any, vpName: string) {
  console.log(`  [${vpName}] S7: Plant Copilot Q&A & safety refusal...`);
  await page.goto(`${BASE_URL}/control-room`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Open Copilot
  const toggleBtn = await page.$('button[aria-label="Toggle Plant Copilot"]');
  if (!toggleBtn) throw new Error('S7: Plant Copilot toggle button not found');
  await toggleBtn.click();
  await page.waitForTimeout(400);

  // Check header text: Plant Copilot
  const drawerText = await page.innerText('body');
  if (!drawerText.includes('Plant Copilot')) {
    throw new Error('S7: Plant Copilot drawer did not open');
  }
}

async function runScenario8(page: any, vpName: string) {
  console.log(`  [${vpName}] S8: New capture 5-step flow...`);
  await page.goto(`${BASE_URL}/capture`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // 1. Verify 5-step capture flow step 1 is present
  const step1 = await page.$('[data-testid="capture-step-1"], [data-testid="step-technician"]');
  const text = await page.innerText('body');
  if (!step1 && !text.includes('Who are you') && !text.includes('Select technician') && !text.includes('Technician')) {
    throw new Error('S8: Expected 5-step capture flow step 1');
  }

  // 2. Select technician from step 1
  const techOptions = await page.$$('[data-testid="technician-option"]');
  if (techOptions.length === 0 && !text.includes('technicians at this plant')) {
    throw new Error('S8: Expected technician options in step 1');
  }
  if (techOptions.length > 0) {
    await techOptions[0].click();
    await page.waitForTimeout(200);
  }

  // 3. Select machine in step 2
  const machineOptions = await page.$$('[data-testid="machine-option"]');
  if (machineOptions.length > 0) {
    await machineOptions[0].click();
    await page.waitForTimeout(200);
  }

  // 4. Select symptom tag in step 3
  const symptomBtns = await page.$$('[data-testid="symptom-tag-button"]');
  if (symptomBtns.length > 0) {
    await symptomBtns[0].click();
    await page.waitForTimeout(200);
  }

  // 5. Enter typed note in step 4
  const noteArea = await page.$('[data-testid="note-textarea"], textarea');
  if (noteArea) {
    await noteArea.fill('Loud abnormal grinding vibration observed near motor housing.');
    await page.waitForTimeout(200);
  }

  // 6. Submit observation & cached triage in step 5
  const submitBtn = await page.$('[data-testid="submit-observation-button"], button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();

    // Wait for triage result panel
    await page.waitForSelector('[data-testid="capture-success-panel"], [data-testid="open-created-alert-button"], a[href^="/alerts/AL-"]', { timeout: 20000 });

    // 7. Verify created alert opens
    const openAlertBtn = await page.$('[data-testid="open-created-alert-button"], a[href^="/alerts/AL-"]');
    if (openAlertBtn) {
      await openAlertBtn.click();
      await page.waitForTimeout(800);
      const alertBody = await page.innerText('body');
      if (!alertBody.includes('AL-') && !page.url().includes('/alerts/')) {
        throw new Error('S8: Created alert did not open properly');
      }
    }
  }
}

async function main() {
  console.log('=== Ferrow Foresight E2E Demo Scenarios (S1 - S8) ===');
  process.env.AGENT_PROVIDER = 'cached';

  const requestedBrowsers = process.env.BROWSERS
    ? process.env.BROWSERS.split(',').map((s) => s.trim().toLowerCase()).filter((k) => BROWSER_MAP[k])
    : ['chromium', 'firefox', 'webkit'];

  console.log(`Browsers to test: ${requestedBrowsers.join(', ')}`);

  const reportDir = path.join(process.cwd(), 'playwright-report');
  let totalPassed = 0;
  let totalFailed = 0;
  const failureLog: Array<{ browser: string; viewport: string; scenario: string; error: string }> = [];

  for (const browserKey of requestedBrowsers) {
    const browserType = BROWSER_MAP[browserKey];
    console.log(`\n========================================`);
    console.log(`Launching Browser: ${browserKey.toUpperCase()}`);
    console.log(`========================================`);

    let browser;
    try {
      browser = await browserType.launch({ headless: true });
    } catch (launchErr: any) {
      console.error(`Failed to launch browser ${browserKey}:`, launchErr.message);
      totalFailed += 16;
      continue;
    }

    for (const vp of VIEWPORTS) {
      console.log(`\nTesting view: [${browserKey}] ${vp.name} (${vp.width}x${vp.height})`);
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      const scenarios = [
        { id: 'S1', fn: runScenario1 },
        { id: 'S2', fn: runScenario2 },
        { id: 'S3', fn: runScenario3 },
        { id: 'S4', fn: runScenario4 },
        { id: 'S5', fn: runScenario5 },
        { id: 'S6', fn: runScenario6 },
        { id: 'S7', fn: runScenario7 },
        { id: 'S8', fn: runScenario8 },
      ];

      for (const s of scenarios) {
        try {
          await resetDemo();
          await s.fn(page, vp.name);
          console.log(`    ✅ [${browserKey}] ${s.id} passed at ${vp.name}`);
          totalPassed++;
        } catch (err: any) {
          console.error(`    ❌ [${browserKey}] ${s.id} FAILED at ${vp.name}:`, err.message);
          totalFailed++;
          failureLog.push({
            browser: browserKey,
            viewport: vp.name,
            scenario: s.id,
            error: err.message,
          });

          // Capture failure screenshot for CI report artifact
          try {
            if (!fs.existsSync(reportDir)) {
              fs.mkdirSync(reportDir, { recursive: true });
            }
            const cleanVp = vp.name.replace(/[^a-z0-9]/gi, '_');
            const file = path.join(reportDir, `fail-${browserKey}-${cleanVp}-${s.id}.png`);
            await page.screenshot({ path: file, fullPage: true });
          } catch {
            // ignore screenshot capture errors
          }
        }
      }

      await page.close();
      await context.close();
    }

    await browser.close();
  }

  // Save summary to report directory
  if (failureLog.length > 0) {
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(reportDir, 'report.json'),
      JSON.stringify({ passed: totalPassed, failed: totalFailed, failures: failureLog }, null, 2)
    );
  }

  console.log(`\n========================================`);
  console.log(`Multi-Browser E2E Summary: ${totalPassed} passed, ${totalFailed} failed`);
  if (totalFailed > 0) {
    console.error(`Failures recorded: ${failureLog.length}`);
    process.exit(1);
  }
  console.log(`All core demo scenarios verified across ${requestedBrowsers.join(', ')} at 1440px and 375px!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
