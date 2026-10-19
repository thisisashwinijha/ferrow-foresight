import { chromium } from '@playwright/test';
import {
  createBrowserContext,
  finalizeVideo,
  switchRole,
  captureScreenshot,
  resetDemoThroughUI,
  PROD_URL,
} from './helpers';
import * as path from 'path';
import * as fs from 'fs';

export async function runLiveAiClip() {
  const videoTempDir = path.resolve(process.cwd(), 'docs/walkthrough/temp_live_ai');
  const targetMp4 = path.resolve(process.cwd(), 'docs/walkthrough/videos/ferrow-live-ai-clip.mp4');
  const liveAiScreenshotsDir = path.resolve(process.cwd(), 'docs/walkthrough/live-ai');

  if (!fs.existsSync(liveAiScreenshotsDir)) {
    fs.mkdirSync(liveAiScreenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const { context, page } = await createBrowserContext(browser, videoTempDir);

  try {
    console.log('\n======================================================');
    console.log('  ▶ LIVE AI CLIP: Real Make.com & Gemini Verification');
    console.log(`  Site: ${PROD_URL}`);
    console.log('======================================================');

    // 0. Reset demo state on production
    console.log('  🔄 Resetting demo state on production site...');
    await page.goto(`${PROD_URL}/control-room`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await resetDemoThroughUI(page, PROD_URL);
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------------------
    // Step 1: Technician P07-T03 captures observation on P07-M05
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Technician Floor Capture on Production ---');
    await switchRole(page, 'Technician');
    await page.goto(`${PROD_URL}/capture`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Select technician P07-T03
    const techBtn = page.locator('button:has-text("P07-T03"), button:has-text("Vikram Singh")').first();
    if (await techBtn.isVisible()) {
      await techBtn.click();
    } else {
      const anyTechBtn = page.locator('div.grid button').first();
      if (await anyTechBtn.isVisible()) await anyTechBtn.click();
    }
    await page.waitForTimeout(300);

    // Select machine P07-M05
    const machineBtn = page.locator('button:has-text("P07-M05"), button:has-text("Vacuum Pump VP-1")').first();
    if (await machineBtn.isVisible()) {
      await machineBtn.scrollIntoViewIfNeeded();
      await machineBtn.click();
    } else {
      const anyMachineBtn = page.locator('div.grid button:has-text("P07-M")').first();
      if (await anyMachineBtn.isVisible()) await anyMachineBtn.click();
    }
    await page.waitForTimeout(300);

    // Select symptom tags: Vibration and Abnormal noise
    const vibTag = page.locator('button:has-text("Vibration")').first();
    if (await vibTag.isVisible()) await vibTag.click();
    const noiseTag = page.locator('button:has-text("Abnormal noise"), button:has-text("Noise")').first();
    if (await noiseTag.isVisible()) await noiseTag.click();
    await page.waitForTimeout(300);

    // Fill typed note
    const noteArea = page.locator('textarea').first();
    await noteArea.scrollIntoViewIfNeeded();
    await noteArea.fill('Grinding noise from pump bearing, housing hot to touch since morning');
    await page.waitForTimeout(500);

    // Screenshot 1: Before submit
    await captureScreenshot(
      page,
      'docs/walkthrough/live-ai/01-live-technician-capture-before-submit.png',
      'Live AI Clip · Step 1 · Technician P07-T03 captures observation on P07-M05',
      {
        scenario: 'Live AI',
        stage: 'Capture',
        role: 'Technician',
        page: '/capture',
        action: 'Submit typed observation on P07-M05 to live Make.com webhook',
        type: 'before',
      }
    );

    // Submit and wait for live triage result (Gemini call via Make.com)
    console.log('  🚀 Submitting observation to Live AI triage via Make.com and Gemini...');
    const submitBtn = page.locator('button:has-text("Submit Observation"), button:has-text("Submit Alert")').first();
    await submitBtn.click();

    // Wait for live triage result panel (up to 45 seconds for webhook response)
    const triageResultBtn = page.locator('a[data-testid="open-created-alert-button"], a:has-text("Open alert"), a:has-text("Open Created Alert")').first();
    await triageResultBtn.waitFor({ state: 'visible', timeout: 45000 });
    await page.waitForTimeout(1000);

    // Screenshot 2: Live AI triage result
    await captureScreenshot(
      page,
      'docs/walkthrough/live-ai/02-live-ai-triage-result.png',
      'Live AI triage via Make.com and Gemini · Real webhook execution',
      {
        scenario: 'Live AI',
        stage: 'AI Triage',
        role: 'Technician',
        page: '/capture',
        action: 'Receive live deterministic AI triage plan from Gemini',
        type: 'after',
      }
    );

    // Open created alert
    await triageResultBtn.click();
    await page.waitForTimeout(1500);

    // Screenshot 3: Created Alert detail
    await captureScreenshot(
      page,
      'docs/walkthrough/live-ai/03-live-alert-detail.png',
      'Live AI Clip · Step 1 · New Alert detail generated by live Gemini triage',
      {
        scenario: 'Live AI',
        stage: 'Alert Detail',
        role: 'Technician',
        page: page.url().replace(PROD_URL, ''),
        action: 'Inspect generated alert with AI reasoning and LOTO checklist',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Step 2: Agent Console Run Log (Provider & Latency)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Agent Console Live Execution Verification ---');
    await page.goto(`${PROD_URL}/agent`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    // Screenshot 4: Agent Console
    await captureScreenshot(
      page,
      'docs/walkthrough/live-ai/04-live-agent-console-run.png',
      'Live AI Clip · Step 2 · Agent Console · Live run telemetry, provider & latency',
      {
        scenario: 'Live AI',
        stage: 'Agent Console',
        role: 'Maintenance Planner',
        page: '/agent',
        action: 'Verify Make.com / Gemini run record with real roundtrip latency',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Step 3: Plant Head asks Copilot (High risk explanation + LOTO refusal)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Plant Head Copilot Live Queries ---');
    await switchRole(page, 'Plant Head');
    await page.goto(`${PROD_URL}/control-room`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Open Copilot drawer
    const copilotToggle = page.locator('button[aria-label="Toggle Plant Copilot"]').first();
    await copilotToggle.click();
    await page.waitForTimeout(800);

    // Query 1: "Why is P07-M03 high risk?"
    console.log('  💬 Query 1: Why is P07-M03 high risk?');
    const copilotInput = page.locator('input[placeholder*="Ask"]').first();
    await copilotInput.fill('Why is P07-M03 high risk?');
    const copilotSubmit = page.locator('button[type="submit"]').first();
    if (await copilotSubmit.isVisible()) {
      await copilotSubmit.click();
    } else {
      await copilotInput.press('Enter');
    }

    // Wait for response (up to 30s for live Gemini call)
    await page.locator('div:has-text("Analyzing telemetry...")').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.locator('div:has-text("Analyzing telemetry...")').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Screenshot 5: Copilot High risk answer
    await captureScreenshot(
      page,
      'docs/walkthrough/live-ai/05-live-copilot-high-risk.png',
      'Live AI Clip · Step 3 · Plant Copilot · Explains P07-M03 high risk telemetry & cost',
      {
        scenario: 'Live AI',
        stage: 'Copilot Q&A',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Query live copilot for risk explanation and financial impact',
        type: 'after',
      }
    );

    // Query 2: "Can we skip LOTO on P07-M03?"
    console.log('  🛡 Query 2: Can we skip LOTO on P07-M03?');
    await copilotInput.fill('Can we skip LOTO on P07-M03?');
    if (await copilotSubmit.isVisible()) {
      await copilotSubmit.click();
    } else {
      await copilotInput.press('Enter');
    }

    // Wait for response (up to 30s for live Gemini call)
    await page.locator('div:has-text("Analyzing telemetry...")').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.locator('div:has-text("Analyzing telemetry...")').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Screenshot 6: Copilot LOTO refusal
    await captureScreenshot(
      page,
      'docs/walkthrough/live-ai/06-live-copilot-loto-refusal.png',
      'Live AI Clip · Step 3 · Plant Copilot · Deterministic safety refusal on LOTO bypass',
      {
        scenario: 'Live AI',
        stage: 'Copilot Refusal',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Verify strict safety refusal preventing LOTO isolation bypass',
        type: 'after',
      }
    );

    console.log('\n  🔄 Resetting demo state on production site at end...');
    await resetDemoThroughUI(page, PROD_URL);
    await page.waitForTimeout(1000);

    console.log('\n======================================================');
    console.log('  ✔ LIVE AI CLIP COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
  } finally {
    await finalizeVideo(context, videoTempDir, targetMp4);
    await browser.close();
  }
}

if (require.main === module) {
  runLiveAiClip().catch((err) => {
    console.error('Fatal in Live AI Clip:', err);
    process.exit(1);
  });
}
