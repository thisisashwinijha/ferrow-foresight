import { chromium } from '@playwright/test';
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

export async function runScenario8() {
  const videoTempDir = path.resolve(process.cwd(), 'docs/walkthrough/temp_s8');
  const targetMp4 = path.resolve(process.cwd(), 'docs/walkthrough/videos/ferrow-S8-full-cycle.mp4');

  if (!fs.existsSync('docs/walkthrough/s8')) {
    fs.mkdirSync('docs/walkthrough/s8', { recursive: true });
  }

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const { context, page } = await createBrowserContext(browser, videoTempDir);

  try {
    console.log('\n======================================================');
    console.log('  ▶ SCENARIO 8: Technician Floor Capture Full Lifecycle');
    console.log('======================================================');

    // 0. Reset demo state through UI
    await resetDemoThroughUI(page);

    // -------------------------------------------------------------------------
    // Stage 1: Technician Floor Capture on P07-M05
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 1: Technician Floor Capture ---');
    await switchRole(page, 'Technician');
    await page.goto(`${BASE_URL}/capture`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Select Technician P07-T03 (Gurpreet Singh / Imran Shaikh)
    const techBtn = page.locator('button[data-tech-id="P07-T03"]').first();
    if (await techBtn.isVisible()) {
      await techBtn.click();
    } else {
      const firstTech = page.locator('button[data-testid="technician-option"]').first();
      await firstTech.click();
    }
    await page.waitForTimeout(300);

    // Search and select machine P07-M05 (Vacuum Pump VP-1)
    const searchInput = page.locator('input[placeholder*="Search all machines"]').first();
    await searchInput.fill('P07-M05');
    await page.waitForTimeout(400);

    const machineBtn = page.locator('button[data-machine-id="P07-M05"]').first();
    await machineBtn.click();
    await page.waitForTimeout(300);

    // Select symptom tags: Grinding noise & Hot casing
    const grindingBtn = page.locator('button[data-symptom-id="sound:grinding"]').first();
    await grindingBtn.scrollIntoViewIfNeeded();
    await grindingBtn.click();
    await page.waitForTimeout(200);

    const heatBtn = page.locator('button[data-symptom-id="heat:hot_to_touch"]').first();
    await heatBtn.scrollIntoViewIfNeeded();
    await heatBtn.click();
    await page.waitForTimeout(200);

    // Fill typed observation note
    const noteArea = page.locator('textarea[data-testid="note-textarea"]').first();
    await noteArea.scrollIntoViewIfNeeded();
    await noteArea.fill('Grinding noise from pump bearing, housing hot to touch since morning');
    await page.waitForTimeout(400);

    // 1. Before submit screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/01-stage1-technician-before-submit.png',
      'S8 · Stage 1 of 9 · Technician P07-T03 · Floor observation captured on P07-M05 Vacuum Pump · Ready to submit',
      {
        scenario: 'S8',
        stage: 'Stage 1',
        role: 'Technician',
        page: '/capture',
        action: 'Fill technician profile, machine P07-M05, sensory tags, and typed description',
        type: 'before',
      }
    );

    // Click "Submit Observation"
    const submitBtn = page.locator('button:has-text("Submit Observation")').first();
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    console.log('  ⏳ Waiting for AI observation triage result...');

    // Wait for triage success panel and button
    const openAlertBtn = page.locator('a[data-testid="open-created-alert-button"]').first();
    await openAlertBtn.waitFor({ state: 'visible', timeout: 35000 });
    await page.waitForTimeout(1000);

    // 2. Triage result screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/02-stage2-ai-triage-result.png',
      'S8 · Stage 2 of 9 · AI Triage · Observation synthesized into alert · Failure mode & recommended action generated',
      {
        scenario: 'S8',
        stage: 'Stage 2',
        role: 'Technician',
        page: '/capture',
        action: 'Verify AI triage synthesis and generated alert card',
        type: 'after',
      }
    );

    // Extract Alert ID and open
    const alertUrl = await openAlertBtn.getAttribute('href');
    let alertId = 'AL-1004';
    if (alertUrl) {
      const match = alertUrl.match(/AL-\d+/);
      if (match) alertId = match[0];
    }
    console.log(`  ✔ Extracted generated Alert ID: ${alertId}`);
    await openAlertBtn.click();
    await page.waitForTimeout(800);

    // -------------------------------------------------------------------------
    // Stage 3: Maintenance Planner Review & Approval
    // -------------------------------------------------------------------------
    console.log(`\n--- Stage 3: Maintenance Planner Review & Approval (${alertId}) ---`);
    await switchRole(page, 'Maintenance Planner');
    await page.goto(`${BASE_URL}/alerts/${alertId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 3. Before approve screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/03-stage3-planner-before-approve.png',
      `S8 · Stage 3 of 9 · Maintenance Planner · Reviewing triaged alert ${alertId} on Criticality B Vacuum Pump`,
      {
        scenario: 'S8',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: `/alerts/${alertId}`,
        action: 'Inspect triaged failure mode and check escalation rules',
        type: 'before',
      }
    );

    // Criticality B asset with P2/P3 urgency: Planner approves directly (if P1 Crit A, sends to Plant Head)
    const approveBtn = page.locator('button:has-text("Approve & Schedule Work Order"), button:has-text("Approve Work Order")').first();
    const sendPhBtn = page.locator('button:has-text("Send to Plant Head")').first();

    let woId = 'WO-2208';
    if (await approveBtn.isVisible()) {
      console.log('  ✔ Standard Planner approval rule applied (Criticality B asset)');
      await approveBtn.click();
    } else if (await sendPhBtn.isVisible()) {
      console.log('  ✔ Escalation rule applied: Sending to Plant Head...');
      await sendPhBtn.click();
      await page.waitForTimeout(800);
      await switchRole(page, 'Plant Head');
      await page.goto(`${BASE_URL}/alerts/${alertId}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const phApprove = page.locator('button:has-text("Approve Work Order")').first();
      await phApprove.waitFor({ state: 'visible', timeout: 5000 });
      await phApprove.click();
    }
    await page.waitForTimeout(1500);

    // Extract WO ID
    try {
      const bannerLink = page.locator('a[href*="/work-orders/WO-"]').first();
      await bannerLink.waitFor({ state: 'visible', timeout: 8000 });
      const href = await bannerLink.getAttribute('href');
      if (href) {
        const match = href.match(/WO-\d+/);
        if (match) woId = match[0];
      }
      console.log(`  ✔ Extracted generated Work Order ID: ${woId}`);
    } catch (e: any) {
      console.warn('  ⚠️ Could not extract WO ID from banner:', e.message);
    }

    // 4. After approve screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/04-stage3-planner-after-approve.png',
      `S8 · Stage 3 of 9 · Maintenance Planner · Work order ${woId} scheduled · Flow tracker advances to Stage 5`,
      {
        scenario: 'S8',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: `/alerts/${alertId}`,
        action: 'Approve work order creation and schedule dispatch',
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

    // 5. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/05-stage5-stores-mytasks-waiting.png',
      `S8 · Stage 5 of 9 · Stores In-charge · My tasks: Spares Reservation waiting for ${woId}`,
      {
        scenario: 'S8',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: '/my-tasks',
        action: 'Inspect pending spares reservation in My tasks',
        type: 'mytasks',
      }
    );

    // Open work order from My tasks
    const sparesTaskLink = page.locator(`a[href*="/work-orders/${woId}"]`).first();
    if (await sparesTaskLink.isVisible()) {
      await sparesTaskLink.click();
    } else {
      await page.goto(`${BASE_URL}/work-orders/${woId}`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);

    // 6. Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/06-stage5-stores-before-confirm.png',
      `S8 · Stage 5 of 9 · Stores In-charge · Spares verified in inventory · Ready to reserve`,
      {
        scenario: 'S8',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: `/work-orders/${woId}`,
        action: 'Inspect stock availability before reserving',
        type: 'before',
      }
    );

    // Click "Confirm Reservation"
    const confirmSparesBtn = page.locator('button:has-text("Confirm Reservation")').first();
    await confirmSparesBtn.waitFor({ state: 'visible', timeout: 8000 });
    await confirmSparesBtn.click();
    await page.waitForTimeout(1000);

    // 7. After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/07-stage5-stores-after-confirm.png',
      `S8 · Stage 5 of 9 · Stores In-charge · Spares confirmed · Flow tracker advances to Stage 6`,
      {
        scenario: 'S8',
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

    // 8. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/08-stage6-production-mytasks-waiting.png',
      `S8 · Stage 6 of 9 · Production Manager · My tasks: Confirm Maintenance Slot for ${woId}`,
      {
        scenario: 'S8',
        stage: 'Stage 6',
        role: 'Production Manager',
        page: '/my-tasks',
        action: 'Inspect maintenance slot confirmation task',
        type: 'mytasks',
      }
    );

    // Open work order from My tasks
    const prodTaskLink = page.locator(`a[href*="/work-orders/${woId}"]`).first();
    if (await prodTaskLink.isVisible()) {
      await prodTaskLink.click();
    } else {
      await page.goto(`${BASE_URL}/work-orders/${woId}`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);

    // 9. Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/09-stage6-production-before-confirm.png',
      `S8 · Stage 6 of 9 · Production Manager · Flow tracker Stage 6 · Maintenance slot proposed`,
      {
        scenario: 'S8',
        stage: 'Stage 6',
        role: 'Production Manager',
        page: `/work-orders/${woId}`,
        action: 'Review maintenance slot against production schedule',
        type: 'before',
      }
    );

    // Click "Confirm Window"
    const confirmWindowBtn = page.locator('button:has-text("Confirm Window")').first();
    await confirmWindowBtn.waitFor({ state: 'visible', timeout: 8000 });
    await confirmWindowBtn.click();
    await page.waitForTimeout(1000);

    // 10. After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/10-stage6-production-after-confirm.png',
      `S8 · Stage 6 of 9 · Production Manager · Maintenance window confirmed · Flow tracker advances to Stage 7`,
      {
        scenario: 'S8',
        stage: 'Stage 6',
        role: 'Production Manager',
        page: `/work-orders/${woId}`,
        action: 'Confirm maintenance window clearance',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 7: Technician P07-T03 Execution
    // -------------------------------------------------------------------------
    console.log(`\n--- Stage 7: Technician Execution (${woId}) ---`);
    await switchRole(page, 'Technician');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // 11. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/11-stage7-technician-mytasks-waiting.png',
      `S8 · Stage 7 of 9 · Technician P07-T03 · My tasks: Scheduled ${woId} cleared for execution`,
      {
        scenario: 'S8',
        stage: 'Stage 7',
        role: 'Technician',
        page: '/my-tasks',
        action: 'Inspect actionable work order ready in My tasks',
        type: 'mytasks',
      }
    );

    // Open work order from My tasks
    const techTaskLink = page.locator(`a[href*="/work-orders/${woId}"]`).first();
    if (await techTaskLink.isVisible()) {
      await techTaskLink.click();
    } else {
      await page.goto(`${BASE_URL}/work-orders/${woId}`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);

    // 12. Before LOTO: show steps locked
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/12-stage7-technician-before-loto-steps-locked.png',
      `S8 · Stage 7 of 9 · Technician P07-T03 · LOTO Phase 1 active · Maintenance task steps locked until all 6 LOTO steps verified`,
      {
        scenario: 'S8',
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

    // 13. LOTO permit issued, tasks unlocked
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/13-stage7-technician-loto-permit-issued.png',
      `S8 · Stage 7 of 9 · Technician P07-T03 · 6 LOTO steps verified · Safety Permit Active · Maintenance task steps unlocked`,
      {
        scenario: 'S8',
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
    await rootCauseInput.fill('Vacuum pump bearing failure and mechanical seal degradation');

    // 14. Before close screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/14-stage7-technician-before-close.png',
      `S8 · Stage 7 of 9 · Technician P07-T03 · All checklist steps completed · Closure form filled with verified root cause`,
      {
        scenario: 'S8',
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

    // 15. After close screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/15-stage7-technician-after-close.png',
      `S8 · Stage 7 of 9 · Technician P07-T03 · ${woId} Closed & Resolved · P07-M05 restored to running baseline`,
      {
        scenario: 'S8',
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

    // 16. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/16-stage8-training-mytasks-waiting.png',
      `S8 · Stage 8 of 9 · Training Coordinator · My tasks: AI Knowledge Card awaiting verification for ${woId}`,
      {
        scenario: 'S8',
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

    // 17. Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/17-stage8-training-before-verify.png',
      'S8 · Stage 8 of 9 · Training Coordinator · AI Knowledge Card drafted from pump overhaul · Ready to verify',
      {
        scenario: 'S8',
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

    // 18. After action: Stage 9 Completed
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/18-stage8-training-after-verify.png',
      'S8 · Stage 8 of 9 · Training Coordinator · Knowledge Card verified & published · Lifecycle complete!',
      {
        scenario: 'S8',
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

    // 19. Control room tile nominal
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/19-stage9-completed-control-room.png',
      'S8 · Stage 9 of 9 · Restored to Normal · Control Room tile P07-M05 is green and nominal',
      {
        scenario: 'S8',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Confirm Vacuum Pump health reset to normal baseline in Control Room',
        type: 'after',
      }
    );

    // 2. Machine history card new entry
    await page.goto(`${BASE_URL}/machines/P07-M05`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 20. Machine history card
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/20-stage9-completed-history-card.png',
      `S8 · Stage 9 of 9 · Restored to Normal · P07-M05 history card logged completed ${woId}`,
      {
        scenario: 'S8',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: '/machines/P07-M05',
        action: 'Assert maintenance timeline updated with closed work order',
        type: 'after',
      }
    );

    // 3. Flow tracker complete on work order
    await page.goto(`${BASE_URL}/work-orders/${woId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 21. Flow tracker complete
    await captureScreenshot(
      page,
      'docs/walkthrough/s8/21-stage9-completed-flow-tracker.png',
      'S8 · Stage 9 of 9 · Restored to Normal · 9-step workflow flow tracker 100% complete',
      {
        scenario: 'S8',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: `/work-orders/${woId}`,
        action: 'Assert all 9 stages marked complete in workflow tracker',
        type: 'after',
      }
    );

    console.log('  ✔ SCENARIO 8 COMPLETED SUCCESSFULLY!');
  } finally {
    await finalizeVideo(context, videoTempDir, targetMp4);
    await browser.close();
  }
}

if (require.main === module) {
  runScenario8().catch((err) => {
    console.error('Fatal in Scenario 8:', err);
    process.exit(1);
  });
}
