import { chromium } from '@playwright/test';
import * as path from 'path';
import {
  BASE_URL,
  createBrowserContext,
  resetDemoThroughUI,
  switchRole,
  openMyTasks,
  captureScreenshot,
  finalizeVideo,
} from './helpers';

export async function runScenario1() {
  console.log('\n======================================================');
  console.log('  ▶ SCENARIO 1: Sensor P1 Full Lifecycle (Stages 1 to 9)');
  console.log('======================================================');

  const videoTempDir = path.join(process.cwd(), 'docs', 'walkthrough', 'temp_s1');
  const targetMp4 = path.join(process.cwd(), 'docs', 'walkthrough', 'videos', 'ferrow-S1-full-cycle.mp4');

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const { context, page } = await createBrowserContext(browser, videoTempDir);

  try {
    // 0. Reset Demo
    await page.goto(`${BASE_URL}/control-room`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await resetDemoThroughUI(page);
    await page.waitForTimeout(800);

    // -------------------------------------------------------------------------
    // Stage 1: Detect
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 1: Detect ---');
    await switchRole(page, 'Plant Head');
    await page.goto(`${BASE_URL}/control-room`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // 1. Control Room tile in alert
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/01-stage1-planthead-detect-tile-alert.png',
      'S1 · Stage 1 of 9 · Plant Head · Control Room tile P07-M03 in critical alarm (vibration > 4.5 mm/s)',
      {
        scenario: 'S1',
        stage: 'Stage 1',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Inspect Control Room mimic for alarm alerts',
        type: 'before',
      }
    );

    // 2. Machine history card with rising vibration chart
    const m03Tile = page.locator('a[href*="/machines/P07-M03"]').first();
    if (await m03Tile.isVisible()) {
      await m03Tile.click();
    } else {
      await page.goto(`${BASE_URL}/machines/P07-M03`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s1/02-stage1-planthead-machine-history-chart.png',
      'S1 · Stage 1 of 9 · Plant Head · P07-M03 history card displaying rising vibration trend exceeding ISO 10816 line',
      {
        scenario: 'S1',
        stage: 'Stage 1',
        role: 'Plant Head',
        page: '/machines/P07-M03',
        action: 'Review telemetry trend chart and ISO alarm threshold',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 2: AI Triage
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 2: AI Triage ---');
    await page.goto(`${BASE_URL}/alerts/AL-1001`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s1/03-stage2-ai-triage-alert-detail.png',
      'S1 · Stage 2 of 9 · AI Triage · AL-1001 detail: vibration evidence, downtime cost ($126k vs $1.8k), guardrails',
      {
        scenario: 'S1',
        stage: 'Stage 2',
        role: 'AI Agent',
        page: '/alerts/AL-1001',
        action: 'Automated triage synthesizing sensor evidence and guardrails',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 3: Maintenance Planner Review
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 3: Maintenance Planner Review ---');
    await switchRole(page, 'Maintenance Planner');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/04-stage3-planner-mytasks-waiting.png',
      'S1 · Stage 3 of 9 · Maintenance Planner · My tasks: AL-1001 waiting for dual sign-off review',
      {
        scenario: 'S1',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: '/my-tasks',
        action: 'Review pending alert waiting in My tasks queue',
        type: 'mytasks',
      }
    );

    // Open AL-1001
    const al1001Task = page.locator('a[href="/alerts/AL-1001"], a:has-text("AL-1001")').first();
    if (await al1001Task.isVisible()) {
      await al1001Task.click();
    } else {
      await page.goto(`${BASE_URL}/alerts/AL-1001`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);

    // Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/05-stage3-planner-before-send.png',
      'S1 · Stage 3 of 9 · Maintenance Planner · Flow tracker Stage 3 · Ready to forward P1 alert to Plant Head',
      {
        scenario: 'S1',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: '/alerts/AL-1001',
        action: 'Review P1 Criticality A alert before forwarding',
        type: 'before',
      }
    );

    // Click "Send to Plant Head"
    const sendBtn = page.locator('button:has-text("Send to Plant Head")').first();
    await sendBtn.waitFor({ state: 'visible', timeout: 5000 });
    await sendBtn.click();
    await page.waitForTimeout(1000);

    // After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/06-stage3-planner-after-send.png',
      'S1 · Stage 3 of 9 · Maintenance Planner · Forwarded to Plant Head · Flow tracker advances to Stage 4',
      {
        scenario: 'S1',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: '/alerts/AL-1001',
        action: 'Send P1 Criticality A alert to Plant Head',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 4: Plant Head Approval
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 4: Plant Head Approval ---');
    await switchRole(page, 'Plant Head');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/07-stage4-planthead-mytasks-waiting.png',
      'S1 · Stage 4 of 9 · Plant Head · My tasks: P1 Authorization required for P07-M03 Gearbox',
      {
        scenario: 'S1',
        stage: 'Stage 4',
        role: 'Plant Head',
        page: '/my-tasks',
        action: 'Inspect P1 authorization task in queue',
        type: 'mytasks',
      }
    );

    // Open AL-1001
    const phTask = page.locator('a[href="/alerts/AL-1001"], a:has-text("Authorize Work Order")').first();
    if (await phTask.isVisible()) {
      await phTask.click();
    } else {
      await page.goto(`${BASE_URL}/alerts/AL-1001`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);

    // Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/08-stage4-planthead-before-approve.png',
      'S1 · Stage 4 of 9 · Plant Head · Flow tracker Stage 4 · Ready to approve P1 work order authorization',
      {
        scenario: 'S1',
        stage: 'Stage 4',
        role: 'Plant Head',
        page: '/alerts/AL-1001',
        action: 'Review authorization summary before approval',
        type: 'before',
      }
    );

    // Click "Approve Work Order"
    const approveBtn = page.locator('button:has-text("Approve Work Order")').first();
    await approveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await approveBtn.click();
    await page.waitForTimeout(1500);

    // Extract created work order ID
    let woId = 'WO-2203';
    try {
      const bannerLink = page.locator('a[href*="/work-orders/WO-"]').first();
      await bannerLink.waitFor({ state: 'visible', timeout: 10000 });
      const href = await bannerLink.getAttribute('href');
      if (href) {
        const match = href.match(/WO-\d+/);
        if (match) woId = match[0];
      }
      console.log(`  ✔ Extracted generated Work Order ID: ${woId}`);
    } catch (e: any) {
      console.warn('  ⚠️ Could not extract WO ID from banner:', e.message);
    }

    // After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/09-stage4-planthead-after-approve.png',
      `S1 · Stage 4 of 9 · Plant Head · Work order ${woId} scheduled · Flow tracker advances to Stage 5`,
      {
        scenario: 'S1',
        stage: 'Stage 4',
        role: 'Plant Head',
        page: '/alerts/AL-1001',
        action: 'Approve P1 Criticality A alert work order',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 5: Stores In-charge Spares Readiness
    // -------------------------------------------------------------------------
    console.log(`\n--- Stage 5: Stores In-charge Spares Readiness (${woId}) ---`);
    await switchRole(page, 'Stores In-charge');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/10-stage5-stores-mytasks-waiting.png',
      `S1 · Stage 5 of 9 · Stores In-charge · My tasks: Spares Reservation waiting for ${woId}`,
      {
        scenario: 'S1',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: '/my-tasks',
        action: 'Inspect pending spares reservation in My tasks',
        type: 'mytasks',
      }
    );

    // Open work order from My tasks
    const sparesTaskLink = page.locator(`a[href*="/work-orders/${woId}"], a:has-text("Confirm Spares Reservation")`).first();
    await sparesTaskLink.waitFor({ state: 'visible', timeout: 8000 });
    await sparesTaskLink.click();
    await page.waitForTimeout(800);

    // Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/11-stage5-stores-before-confirm.png',
      `S1 · Stage 5 of 9 · Stores In-charge · Bearing SP-003 below minimum threshold (1 in stock vs min 2) · Reorder flagged`,
      {
        scenario: 'S1',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: `/work-orders/${woId}`,
        action: 'Inspect stock level vs min threshold before reserving',
        type: 'before',
      }
    );

    // Click "Confirm Reservation"
    const confirmSparesBtn = page.locator('button:has-text("Confirm Reservation")').first();
    await confirmSparesBtn.waitFor({ state: 'visible', timeout: 8000 });
    await confirmSparesBtn.click();
    await page.waitForTimeout(1000);

    // After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/12-stage5-stores-after-confirm.png',
      `S1 · Stage 5 of 9 · Stores In-charge · Spares confirmed · Flow tracker advances to Stage 6`,
      {
        scenario: 'S1',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: `/work-orders/${woId}`,
        action: 'Confirm spare parts reservation',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 6: Production Manager Window Confirmation
    // -------------------------------------------------------------------------
    console.log(`\n--- Stage 6: Production Manager Window Confirmation (${woId}) ---`);
    await switchRole(page, 'Production Manager');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/13-stage6-production-mytasks-waiting.png',
      `S1 · Stage 6 of 9 · Production Manager · My tasks: Confirm Maintenance Slot for ${woId}`,
      {
        scenario: 'S1',
        stage: 'Stage 6',
        role: 'Production Manager',
        page: '/my-tasks',
        action: 'Inspect maintenance slot confirmation task',
        type: 'mytasks',
      }
    );

    // Open work order from My tasks
    const prodTaskLink = page.locator(`a[href*="/work-orders/${woId}"], a:has-text("Confirm Window in Schedule")`).first();
    await prodTaskLink.waitFor({ state: 'visible', timeout: 8000 });
    await prodTaskLink.click();
    await page.waitForTimeout(800);

    // Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/14-stage6-production-before-confirm.png',
      `S1 · Stage 6 of 9 · Production Manager · Flow tracker Stage 6 · Sunday planned shutdown window proposed`,
      {
        scenario: 'S1',
        stage: 'Stage 6',
        role: 'Production Manager',
        page: `/work-orders/${woId}`,
        action: 'Review scheduled window against production schedule',
        type: 'before',
      }
    );

    // Click "Confirm Window"
    const confirmWindowBtn = page.locator('button:has-text("Confirm Window")').first();
    await confirmWindowBtn.waitFor({ state: 'visible', timeout: 8000 });
    await confirmWindowBtn.click();
    await page.waitForTimeout(1000);

    // After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/15-stage6-production-after-confirm.png',
      `S1 · Stage 6 of 9 · Production Manager · Sunday shutdown window confirmed · Flow tracker advances to Stage 7`,
      {
        scenario: 'S1',
        stage: 'Stage 6',
        role: 'Production Manager',
        page: `/work-orders/${woId}`,
        action: 'Confirm maintenance window clearance',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 7: Technician P07-T01 Execution
    // -------------------------------------------------------------------------
    console.log(`\n--- Stage 7: Technician Execution (${woId}) ---`);
    await switchRole(page, 'Technician');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/16-stage7-technician-mytasks-waiting.png',
      `S1 · Stage 7 of 9 · Technician · My tasks: Scheduled ${woId} cleared for execution`,
      {
        scenario: 'S1',
        stage: 'Stage 7',
        role: 'Technician',
        page: '/my-tasks',
        action: 'Inspect actionable work order ready in My tasks',
        type: 'mytasks',
      }
    );

    // Open work order from My tasks
    const techTaskLink = page.locator(`a[href*="/work-orders/${woId}"], a:has-text("Apply LOTO & Execute")`).first();
    await techTaskLink.waitFor({ state: 'visible', timeout: 8000 });
    await techTaskLink.click();
    await page.waitForTimeout(800);

    // Before LOTO: show steps locked
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/17-stage7-technician-before-loto-steps-locked.png',
      `S1 · Stage 7 of 9 · Technician · LOTO Phase 1 active · Maintenance task steps locked until all 6 LOTO steps verified`,
      {
        scenario: 'S1',
        stage: 'Stage 7',
        role: 'Technician',
        page: `/work-orders/${woId}`,
        action: 'Verify strict safety isolation lock before execution',
        type: 'before',
      }
    );

    // Sequentially tick LOTO steps 1 to 6
    console.log('  🔒 Ticking LOTO steps 1 through 6...');
    const lotoCard = page.locator('div.rounded-card:has(h2:has-text("Phase 1: LOTO Safety Isolation Procedure"))').first();
    await lotoCard.scrollIntoViewIfNeeded();
    const lotoRows = lotoCard.locator('div.space-y-2 > div.rounded-btn');
    const lotoCount = await lotoRows.count();
    console.log(`  Found ${lotoCount} LOTO steps`);

    for (let step = 0; step < lotoCount; step++) {
      const row = lotoRows.nth(step);
      await row.scrollIntoViewIfNeeded();
      const checkBtn = row.locator('button').first();
      await checkBtn.waitFor({ state: 'visible', timeout: 5000 });
      await checkBtn.click();
      await row.locator('text=Verified').waitFor({ state: 'visible', timeout: 8000 });
      console.log(`  ✔ LOTO Step ${step + 1} verified`);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(600);

    // LOTO permit issued, tasks unlocked
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/18-stage7-technician-loto-permit-issued.png',
      `S1 · Stage 7 of 9 · Technician · 6 LOTO steps verified · Safety Permit Active · Maintenance task steps unlocked`,
      {
        scenario: 'S1',
        stage: 'Stage 7',
        role: 'Technician',
        page: `/work-orders/${woId}`,
        action: 'Complete 6-step LOTO zero energy verification and obtain permit',
        type: 'after',
      }
    );

    // Tick all maintenance task steps (steps 7+)
    console.log('  🔧 Ticking maintenance task steps...');
    const taskCard = page.locator('div.rounded-card:has(h2:has-text("Phase 2: Maintenance Task Steps"))').first();
    await taskCard.scrollIntoViewIfNeeded();
    const taskRows = taskCard.locator('div.space-y-2 > div.rounded-btn');
    const taskCount = await taskRows.count();
    console.log(`  Found ${taskCount} maintenance task steps`);
    for (let i = 0; i < taskCount; i++) {
      const row = taskRows.nth(i);
      await row.scrollIntoViewIfNeeded();
      const btn = row.locator('button').first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      await row.locator('text=Completed').waitFor({ state: 'visible', timeout: 8000 });
      console.log(`  ✔ Task Step ${i + 1} completed`);
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(600);

    // Fill closure form
    console.log('  ✍ Filling closure form...');
    const rootCauseInput = page.locator('form input[type="text"]').first();
    await rootCauseInput.waitFor({ state: 'visible', timeout: 5000 });
    await rootCauseInput.fill('Spherical roller bearing spalling and lubrication starvation');

    // Before close screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/19-stage7-technician-before-close.png',
      `S1 · Stage 7 of 9 · Technician · All checklist steps completed · Closure form filled with verified root cause`,
      {
        scenario: 'S1',
        stage: 'Stage 7',
        role: 'Technician',
        page: `/work-orders/${woId}`,
        action: 'Record root cause and post-maintenance verification',
        type: 'before',
      }
    );

    // Click "Complete & Close Work Order"
    const closeBtn = page.locator('button:has-text("Complete & Close Work Order")').first();
    await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(1200);

    // After close screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/20-stage7-technician-after-close.png',
      `S1 · Stage 7 of 9 · Technician · ${woId} Closed & Resolved · Machine restored to running baseline`,
      {
        scenario: 'S1',
        stage: 'Stage 7',
        role: 'Technician',
        page: `/work-orders/${woId}`,
        action: 'Close work order and restore machine to running',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 8: Training Coordinator Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 8: Training Coordinator Verification ---');
    await switchRole(page, 'Training Coordinator');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/21-stage8-training-mytasks-waiting.png',
      `S1 · Stage 8 of 9 · Training Coordinator · My tasks: AI Knowledge Card awaiting verification for ${woId}`,
      {
        scenario: 'S1',
        stage: 'Stage 8',
        role: 'Training Coordinator',
        page: '/my-tasks',
        action: 'Inspect pending AI knowledge card in queue',
        type: 'mytasks',
      }
    );

    // Open work order from My tasks
    const trainTaskLink = page.locator(`a[href*="/work-orders/${woId}"], a:has-text("Verify & Publish Card")`).first();
    await trainTaskLink.waitFor({ state: 'visible', timeout: 8000 });
    await trainTaskLink.click();
    await page.waitForTimeout(800);

    // Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/22-stage8-training-before-verify.png',
      'S1 · Stage 8 of 9 · Training Coordinator · AI Knowledge Card drafted from closure notes · Ready to verify',
      {
        scenario: 'S1',
        stage: 'Stage 8',
        role: 'Training Coordinator',
        page: `/work-orders/${woId}`,
        action: 'Review synthesized veteran failure signature',
        type: 'before',
      }
    );

    // Click "Verify & Publish Knowledge Card"
    const verifyCardBtn = page.locator('button:has-text("Verify & Publish Knowledge Card")').first();
    await verifyCardBtn.waitFor({ state: 'visible', timeout: 8000 });
    await verifyCardBtn.click();
    await page.waitForTimeout(1000);

    // After action: Stage 9 Completed
    await captureScreenshot(
      page,
      'docs/walkthrough/s1/23-stage8-training-after-verify.png',
      'S1 · Stage 8 of 9 · Training Coordinator · Knowledge Card verified & published · Lifecycle complete!',
      {
        scenario: 'S1',
        stage: 'Stage 8',
        role: 'Training Coordinator',
        page: `/work-orders/${woId}`,
        action: 'Publish verified card to Training Library',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 9: Completed End State Assertions
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 9: Completed End State Assertions ---');
    // 1. Control Room tile normal
    await page.goto(`${BASE_URL}/control-room`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s1/24-stage9-completed-control-room.png',
      'S1 · Stage 9 of 9 · Restored to Normal · Control Room tile P07-M03 is green and nominal',
      {
        scenario: 'S1',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Confirm asset health reset to normal baseline in Control Room',
        type: 'after',
      }
    );

    // 2. Machine history card new entry
    await page.goto(`${BASE_URL}/machines/P07-M03`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s1/25-stage9-completed-history-card.png',
      `S1 · Stage 9 of 9 · Restored to Normal · P07-M03 history card logged completed ${woId} and baseline reset`,
      {
        scenario: 'S1',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: '/machines/P07-M03',
        action: 'Assert maintenance timeline updated with closed work order',
        type: 'after',
      }
    );

    // 3. Flow tracker complete on work order
    await page.goto(`${BASE_URL}/work-orders/${woId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    await captureScreenshot(
      page,
      'docs/walkthrough/s1/26-stage9-completed-flow-tracker.png',
      'S1 · Stage 9 of 9 · Restored to Normal · 9-step workflow flow tracker 100% complete',
      {
        scenario: 'S1',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: `/work-orders/${woId}`,
        action: 'Assert all 9 stages marked complete in workflow tracker',
        type: 'after',
      }
    );

    console.log('  ✔ SCENARIO 1 COMPLETED SUCCESSFULLY!');
  } finally {
    await finalizeVideo(context, videoTempDir, targetMp4);
    await browser.close();
  }
}

if (require.main === module) {
  runScenario1().catch((err) => {
    console.error('Fatal in Scenario 1:', err);
    process.exit(1);
  });
}
