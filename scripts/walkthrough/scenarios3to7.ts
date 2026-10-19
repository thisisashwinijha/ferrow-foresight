import { chromium, Page } from '@playwright/test';
import {
  createBrowserContext,
  finalizeVideo,
  switchRole,
  openMyTasks,
  setCaption,
  captureScreenshot,
  resetDemoThroughUI,
  BASE_URL,
} from './helpers';
import * as path from 'path';
import * as fs from 'fs';

export async function runScenarios3to7() {
  const videoTempDir = path.resolve(process.cwd(), 'docs/walkthrough/temp_s3_s7');
  const targetMp4 = path.resolve(process.cwd(), 'docs/walkthrough/videos/ferrow-S3-S7.mp4');

  ['s3', 's4', 's5', 's6', 's7'].forEach((dir) => {
    const p = path.resolve(process.cwd(), 'docs/walkthrough', dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const { context, page } = await createBrowserContext(browser, videoTempDir);

  try {
    console.log('\n======================================================');
    console.log('  ▶ COMBINED SCENARIOS: S3, S4, S5, S6, S7');
    console.log('======================================================');

    // =========================================================================
    // SCENARIO 3: False alarm (AL-1003 on P07-M22 filtered)
    // =========================================================================
    console.log('\n--- SCENARIO 3: False Alarm Filtered (AL-1003) ---');
    await resetDemoThroughUI(page);
    await switchRole(page, 'Maintenance Planner');

    // 1. Alerts List showing AL-1003 filtered / monitor
    await page.goto(`${BASE_URL}/alerts`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s3/01-stage2-planner-alerts-list.png',
      'S3 · Stage 2 · Maintenance Planner · Alerts feed · AL-1003 on P07-M22 marked monitor / filtered',
      {
        scenario: 'S3',
        stage: 'Stage 2',
        role: 'Maintenance Planner',
        page: '/alerts',
        action: 'Review alerts list showing AL-1003 non-actionable monitor alert',
        type: 'before',
      }
    );

    // 2. Open AL-1003 detail showing reason
    await page.goto(`${BASE_URL}/alerts/AL-1003`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s3/02-stage2-planner-filtered-reason.png',
      'S3 · Stage 2 · Maintenance Planner · AL-1003 filtered as false alarm · One-off transient spike with flat 7-day trend',
      {
        scenario: 'S3',
        stage: 'Stage 2',
        role: 'Maintenance Planner',
        page: '/alerts/AL-1003',
        action: 'Inspect AI signal interpreter rationale and no-intervention recommendation',
        type: 'after',
      }
    );
    console.log('  ✔ S3 False alarm completed');

    // =========================================================================
    // SCENARIO 4: Stockout Blocker (AL-1006 on P07-M12 -> Purchase Request)
    // =========================================================================
    console.log('\n--- SCENARIO 4: Stockout Blocker (AL-1006) ---');
    await resetDemoThroughUI(page);
    await switchRole(page, 'Maintenance Planner');
    await openMyTasks(page);
    await page.waitForTimeout(800);

    // 1. My tasks showing AL-1006
    await captureScreenshot(
      page,
      'docs/walkthrough/s4/01-stage2-planner-mytasks-waiting.png',
      'S4 · Stage 2 of 9 · Maintenance Planner · My tasks: AL-1006 on P07-M12 pending review',
      {
        scenario: 'S4',
        stage: 'Stage 2',
        role: 'Maintenance Planner',
        page: '/my-tasks',
        action: 'Inspect AL-1006 in Planner tasks queue',
        type: 'mytasks',
      }
    );

    // 2. Open AL-1006 detail before approve
    await page.goto(`${BASE_URL}/alerts/AL-1006`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s4/02-stage3-planner-before-approve.png',
      'S4 · Stage 3 of 9 · Maintenance Planner · AL-1006 motor overheating · Servo motor SP-015 stockout (45 days)',
      {
        scenario: 'S4',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: '/alerts/AL-1006',
        action: 'Review stockout flag and plan work order with interim cooling action',
        type: 'before',
      }
    );

    // Planner uses Correct and re-check to assign qualifying technician on Shift C
    const techSelect = page.locator('select:has(option[value="P07-T02"])').first();
    if ((await techSelect.count()) > 0) {
      await techSelect.scrollIntoViewIfNeeded();
      console.log('  🔧 Assigning Shift C technician P07-T02 (Suresh Nair)...');
      await techSelect.selectOption('P07-T02');
      await page.waitForTimeout(400);
      const saveCheckBtn = page.locator('button:has-text("Save and re-check guardrails")').first();
      if ((await saveCheckBtn.count()) > 0) {
        await saveCheckBtn.scrollIntoViewIfNeeded();
        await saveCheckBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // Planner approves work order
    const approveBtn = page.locator('button:has-text("Approve & Schedule Work Order")').first();
    await approveBtn.scrollIntoViewIfNeeded();
    await approveBtn.click();
    await page.waitForTimeout(1500);

    // Wait for work order link to appear
    const woLink = page.locator('a[href*="/work-orders/WO-"]').first();
    await woLink.waitFor({ state: 'visible', timeout: 10000 });
    const href = await woLink.getAttribute('href');
    const match = href?.match(/work-orders\/(WO-[A-Za-z0-9-]+)/);
    const s4WoId = match ? match[1] : 'WO-1006';
    console.log(`  ✔ S4 Work Order created: ${s4WoId}`);

    // 3. Planner after approve
    await captureScreenshot(
      page,
      'docs/walkthrough/s4/03-stage3-planner-after-approve.png',
      `S4 · Stage 3 of 9 · Maintenance Planner · ${s4WoId} scheduled with stockout flag · Sent to Stores`,
      {
        scenario: 'S4',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: `/alerts/AL-1006`,
        action: 'Approve alert and create work order dispatched to Stores queue',
        type: 'after',
      }
    );

    // Stage 5: Stores In-charge
    await switchRole(page, 'Stores In-charge');
    await openMyTasks(page);
    await page.waitForTimeout(800);

    // 4. Stores My tasks
    await captureScreenshot(
      page,
      'docs/walkthrough/s4/04-stage5-stores-mytasks-waiting.png',
      `S4 · Stage 5 of 9 · Stores In-charge · My tasks: ${s4WoId} waiting for spares reservation`,
      {
        scenario: 'S4',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: '/my-tasks',
        action: 'Inspect work order requiring critical spare verification in Stores queue',
        type: 'mytasks',
      }
    );

    // Open work order
    await page.goto(`${BASE_URL}/work-orders/${s4WoId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 5. Before raising PR
    await captureScreenshot(
      page,
      'docs/walkthrough/s4/05-stage5-stores-before-raise-pr.png',
      'S4 · Stage 5 of 9 · Stores In-charge · Servo motor stockout (0 available, 45d lead time)',
      {
        scenario: 'S4',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: `/work-orders/${s4WoId}`,
        action: 'Inspect stockout warning on SP-015 2.2kW servo motor',
        type: 'before',
      }
    );

    // Click Raise PR (Out of Stock)
    console.log('  📦 Raising Purchase Request for out-of-stock servo motor...');
    const raisePrBtn = page.locator('button:has-text("Raise PR (Out of Stock)")').first();
    await raisePrBtn.scrollIntoViewIfNeeded();
    await raisePrBtn.click();
    await page.waitForTimeout(1000);

    // 6. After raising PR
    await captureScreenshot(
      page,
      'docs/walkthrough/s4/06-stage5-stores-after-raise-pr.png',
      'S4 · Stage 5 of 9 · Stores In-charge · Urgent purchase request logged for servo motor',
      {
        scenario: 'S4',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: `/work-orders/${s4WoId}`,
        action: 'Raise urgent purchase order and log procurement requisition',
        type: 'after',
      }
    );

    // Stage 7: Technician shows execution blocked with interim action
    await switchRole(page, 'Technician');
    await page.goto(`${BASE_URL}/work-orders/${s4WoId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 7. Work order blocked from execution
    await captureScreenshot(
      page,
      'docs/walkthrough/s4/07-stage7-technician-execution-blocked.png',
      'S4 · Stage 7 of 9 · Technician · Execution blocked: Spares clearance required · Interim action: Clean fan & filter',
      {
        scenario: 'S4',
        stage: 'Stage 7',
        role: 'Technician',
        page: `/work-orders/${s4WoId}`,
        action: 'Verify strict safety lock prevents intrusive work until spare parts arrive',
        type: 'after',
      }
    );
    console.log('  ✔ S4 Stockout completed');

    // =========================================================================
    // SCENARIO 5: PM Optimiser (Accept all safe deferrals)
    // =========================================================================
    console.log('\n--- SCENARIO 5: PM Optimiser Safe Deferrals ---');
    await resetDemoThroughUI(page);
    await switchRole(page, 'Maintenance Planner');

    // 1. Planning page showing stored suggestions (do NOT click Run)
    await page.goto(`${BASE_URL}/planning`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s5/01-planning-planner-stored-suggestions.png',
      'S5 · Maintenance Planning · Maintenance Planner · Stored PM suggestions: 11 safe deferrals based on steady telemetry',
      {
        scenario: 'S5',
        stage: 'Planning',
        role: 'Maintenance Planner',
        page: '/planning',
        action: 'Review condition-based PM rationalization proposals across plant fleet',
        type: 'before',
      }
    );

    // 2. Click "Accept all safe deferrals"
    console.log('  ⚡ Accepting all safe deferrals...');
    const acceptDeferralsBtn = page.locator('button:has-text("Accept all safe deferrals")').first();
    await acceptDeferralsBtn.scrollIntoViewIfNeeded();
    await acceptDeferralsBtn.click();
    await page.waitForTimeout(1200);

    await captureScreenshot(
      page,
      'docs/walkthrough/s5/02-planning-planner-accepted-deferrals.png',
      'S5 · Maintenance Planning · Maintenance Planner · Safe deferrals accepted · 11 visits avoided, 16.5 technician hours saved',
      {
        scenario: 'S5',
        stage: 'Planning',
        role: 'Maintenance Planner',
        page: '/planning',
        action: 'Accept all safe deferrals and update condition-based maintenance schedule',
        type: 'after',
      }
    );
    console.log('  ✔ S5 PM Optimiser completed');

    // =========================================================================
    // SCENARIO 6: Shadow Mode (Stuttgart P-03 validation without dispatch)
    // =========================================================================
    console.log('\n--- SCENARIO 6: Shadow Mode Stuttgart ---');
    await resetDemoThroughUI(page);
    await switchRole(page, 'Head of Plant Operations');

    // 1. Network view showing multi-plant fleet and Stuttgart P-03
    await page.goto(`${BASE_URL}/network`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s6/01-network-head-operations-plant-fleet.png',
      'S6 · Multi-Plant Fleet · Head of Plant Operations · Stuttgart (P-03) in shadow rollout mode',
      {
        scenario: 'S6',
        stage: 'Fleet Overview',
        role: 'Head of Plant Operations',
        page: '/network',
        action: 'Inspect multi-plant network and locate Stuttgart shadow site',
        type: 'before',
      }
    );

    // 2. Open Stuttgart alerts
    await page.goto(`${BASE_URL}/alerts?plant=P-03`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s6/02-alerts-stuttgart-shadow-mode.png',
      'S6 · Alerts · Stuttgart P-03 · AL-2001 shadow alert logged on Heater Bank A2 (P03-M10)',
      {
        scenario: 'S6',
        stage: 'Stage 2',
        role: 'Head of Plant Operations',
        page: '/alerts?plant=P-03',
        action: 'Review telemetry-driven shadow alerts in Stuttgart site context',
        type: 'before',
      }
    );

    // 3. Open AL-2001 detail: marked shadow mode with no dispatch
    await page.goto(`${BASE_URL}/alerts/AL-2001?plant=P-03`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s6/03-alert-detail-stuttgart-shadow-no-dispatch.png',
      'S6 · Triage Review · Stuttgart P-03 · Shadow mode active · Model validation without technician dispatch',
      {
        scenario: 'S6',
        stage: 'Stage 2',
        role: 'Head of Plant Operations',
        page: '/alerts/AL-2001',
        action: 'Verify non-dispatch safety guardrail on shadow plant asset',
        type: 'after',
      }
    );
    console.log('  ✔ S6 Shadow mode completed');

    // =========================================================================
    // SCENARIO 7: Plant Copilot (Cached Q&A and Safe Refusal)
    // =========================================================================
    console.log('\n--- SCENARIO 7: Plant Copilot Q&A & Refusal ---');
    await resetDemoThroughUI(page);
    await switchRole(page, 'Plant Head');

    // 1. Landing on Control room
    await page.goto(`${BASE_URL}/control-room`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s7/01-control-room-plant-head-open-copilot.png',
      'S7 · Control Room · Plant Head · Open Plant Copilot assistant',
      {
        scenario: 'S7',
        stage: 'Copilot',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Access floating Plant Copilot natural language assistant',
        type: 'before',
      }
    );

    // Open Copilot drawer
    const copilotBtn = page.locator('button[aria-label="Toggle Plant Copilot"]').first();
    await copilotBtn.click();
    await page.waitForTimeout(600);

    // Query 1: "Why is P07-M03 high risk?"
    console.log('  💬 Asking Copilot: Why is P07-M03 high risk?');
    const copilotInput = page.locator('input[placeholder*="Ask"]').first();
    await copilotInput.fill('Why is P07-M03 high risk?');
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      await copilotInput.press('Enter');
    }
    await page.waitForTimeout(2500);

    // 2. High risk answer
    await captureScreenshot(
      page,
      'docs/walkthrough/s7/02-copilot-high-risk-explanation.png',
      'S7 · Plant Copilot · Plant Head · Factual answer: P07-M03 vibration spike (88 risk score, $144k risk)',
      {
        scenario: 'S7',
        stage: 'Copilot',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Query AI copilot for plain-language risk and financial impact explanation',
        type: 'after',
      }
    );

    // Query 2: "Can we skip LOTO on P07-M03?"
    console.log('  🛡 Asking Copilot adversarial refusal: Can we skip LOTO on P07-M03?');
    await copilotInput.fill('Can we skip LOTO on P07-M03?');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      await copilotInput.press('Enter');
    }
    await page.waitForTimeout(2500);

    // 3. Safety refusal answer
    await captureScreenshot(
      page,
      'docs/walkthrough/s7/03-copilot-safety-loto-refusal.png',
      'S7 · Plant Copilot · Plant Head · Deterministic safety refusal: LOTO zero-energy policy cannot be bypassed',
      {
        scenario: 'S7',
        stage: 'Copilot',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Test adversarial safety query and verify deterministic refusal',
        type: 'after',
      }
    );
    console.log('  ✔ S7 Copilot completed');

    console.log('\n======================================================');
    console.log('  ✔ COMBINED SCENARIOS 3 TO 7 COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
  } finally {
    await finalizeVideo(context, videoTempDir, targetMp4);
    await browser.close();
  }
}

if (require.main === module) {
  runScenarios3to7().catch((err) => {
    console.error('Fatal in Scenarios 3 to 7:', err);
    process.exit(1);
  });
}
