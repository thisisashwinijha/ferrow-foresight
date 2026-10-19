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

export async function runScenario2() {
  const videoTempDir = path.resolve(process.cwd(), 'docs/walkthrough/temp_s2');
  const targetMp4 = path.resolve(process.cwd(), 'docs/walkthrough/videos/ferrow-S2-full-cycle.mp4');

  if (!fs.existsSync('docs/walkthrough/s2')) {
    fs.mkdirSync('docs/walkthrough/s2', { recursive: true });
  }

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const { context, page } = await createBrowserContext(browser, videoTempDir);

  try {
    console.log('\n======================================================');
    console.log('  ▶ SCENARIO 2: Legacy Hinglish Full Lifecycle (S2)');
    console.log('======================================================');

    // 0. Reset demo state through UI
    await resetDemoThroughUI(page);

    // -------------------------------------------------------------------------
    // Stage 2: Triage Review (Planner sees Hinglish note with qualification conflict)
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 2: Maintenance Planner Triage Review (AL-1002) ---');
    await switchRole(page, 'Maintenance Planner');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // 1. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/01-stage2-planner-mytasks-waiting.png',
      'S2 · Stage 2 of 9 · Maintenance Planner · My tasks: AL-1002 needs review on P07-M30 Motor Control Centre',
      {
        scenario: 'S2',
        stage: 'Stage 2',
        role: 'Maintenance Planner',
        page: '/my-tasks',
        action: 'Inspect AL-1002 pending review item in My tasks queue',
        type: 'mytasks',
      }
    );

    // Open AL-1002 from My tasks
    const taskLink = page.locator('a[href="/alerts/AL-1002"], a:has-text("Review & Approve"), a:has-text("Forward to Plant Head")').first();
    if (await taskLink.isVisible()) {
      await taskLink.click();
    } else {
      await page.goto(`${BASE_URL}/alerts/AL-1002`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);

    // 2. Before correction: Hinglish evidence & guardrail conflict shown
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/02-stage2-planner-before-correct.png',
      'S2 · Stage 2 of 9 · Maintenance Planner · Hinglish technician note parsed · Guardrails fail on Shift A electrical cert',
      {
        scenario: 'S2',
        stage: 'Stage 2',
        role: 'Maintenance Planner',
        page: '/alerts/AL-1002',
        action: 'Review parsed Hinglish observation and failed qualification guardrail',
        type: 'before',
      }
    );

    // Planner uses "Correct and re-check" to assign P07-T02 on Shift C
    console.log('  🔧 Applying Correct and re-check for P07-T02 on Shift C...');
    const shiftCBtn = page.locator('button:has-text("Assign & Move to Shift C")').first();
    const saveCheckBtn = page.locator('button:has-text("Save and re-check guardrails")').first();

    if (await shiftCBtn.isVisible()) {
      await shiftCBtn.scrollIntoViewIfNeeded();
      await shiftCBtn.click();
    } else {
      await saveCheckBtn.scrollIntoViewIfNeeded();
      const techSelect = page.locator('select:has(option[value="P07-T02"])').first();
      if (await techSelect.isVisible()) {
        await techSelect.selectOption('P07-T02');
        await page.waitForTimeout(300);
      }
      if (await saveCheckBtn.isVisible()) {
        await saveCheckBtn.click();
      }
    }
    await page.waitForTimeout(1200);

    // 3. After correction: guardrails passed
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/03-stage2-planner-after-correct.png',
      'S2 · Stage 2 of 9 · Maintenance Planner · Assigned to P07-T02 on Shift C · All safety guardrails passed',
      {
        scenario: 'S2',
        stage: 'Stage 2',
        role: 'Maintenance Planner',
        page: '/alerts/AL-1002',
        action: 'Apply technician reassignment to Shift C via Correct and re-check',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 3: Send to Plant Head (P1 on Criticality A asset)
    // -------------------------------------------------------------------------
    console.log('\n--- Stage 3: Maintenance Planner Sends to Plant Head ---');
    const sendBtn = page.locator('button:has-text("Send to Plant Head")').first();
    await sendBtn.scrollIntoViewIfNeeded();

    // 4. Before send
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/04-stage3-planner-before-send.png',
      'S2 · Stage 3 of 9 · Maintenance Planner · P07-M30 is Criticality A · P1 work order requires Plant Head authorization',
      {
        scenario: 'S2',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: '/alerts/AL-1002',
        action: 'Verify Criticality A escalation rule before sending to Plant Head',
        type: 'before',
      }
    );

    await sendBtn.click();
    await page.waitForTimeout(1200);

    // 5. After send
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/05-stage3-planner-after-send.png',
      'S2 · Stage 3 of 9 · Maintenance Planner · Forwarded to Plant Head · Flow tracker advances to Stage 4',
      {
        scenario: 'S2',
        stage: 'Stage 3',
        role: 'Maintenance Planner',
        page: '/alerts/AL-1002',
        action: 'Forward P1 Criticality A alert to Plant Head',
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

    // 6. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/06-stage4-planthead-mytasks-waiting.png',
      'S2 · Stage 4 of 9 · Plant Head · My tasks: P1 Authorization required for P07-M30 MCC',
      {
        scenario: 'S2',
        stage: 'Stage 4',
        role: 'Plant Head',
        page: '/my-tasks',
        action: 'Inspect P1 authorization task in queue',
        type: 'mytasks',
      }
    );

    // Open AL-1002
    const phTask = page.locator('a[href="/alerts/AL-1002"], a:has-text("Authorize Work Order")').first();
    if (await phTask.isVisible()) {
      await phTask.click();
    } else {
      await page.goto(`${BASE_URL}/alerts/AL-1002`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(800);

    // 7. Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/07-stage4-planthead-before-approve.png',
      'S2 · Stage 4 of 9 · Plant Head · Flow tracker Stage 4 · Ready to approve P1 work order authorization',
      {
        scenario: 'S2',
        stage: 'Stage 4',
        role: 'Plant Head',
        page: '/alerts/AL-1002',
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
    let woId = 'WO-2204';
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

    // 8. After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/08-stage4-planthead-after-approve.png',
      `S2 · Stage 4 of 9 · Plant Head · Work order ${woId} scheduled · Flow tracker advances to Stage 5`,
      {
        scenario: 'S2',
        stage: 'Stage 4',
        role: 'Plant Head',
        page: '/alerts/AL-1002',
        action: 'Approve P1 Criticality A alert work order',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 5: Stores In-charge Spares Readiness (Contactor)
    // -------------------------------------------------------------------------
    console.log(`\n--- Stage 5: Stores In-charge Spares Readiness (${woId}) ---`);
    await switchRole(page, 'Stores In-charge');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // 9. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/09-stage5-stores-mytasks-waiting.png',
      `S2 · Stage 5 of 9 · Stores In-charge · My tasks: Spares Reservation waiting for ${woId}`,
      {
        scenario: 'S2',
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

    // 10. Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/10-stage5-stores-before-confirm.png',
      `S2 · Stage 5 of 9 · Stores In-charge · Contactor 3TF44 verified in inventory · Ready to reserve`,
      {
        scenario: 'S2',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: `/work-orders/${woId}`,
        action: 'Inspect stock availability of contactor before reservation',
        type: 'before',
      }
    );

    // Click "Confirm Reservation"
    const confirmSparesBtn = page.locator('button:has-text("Confirm Reservation")').first();
    await confirmSparesBtn.waitFor({ state: 'visible', timeout: 8000 });
    await confirmSparesBtn.click();
    await page.waitForTimeout(1000);

    // 11. After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/11-stage5-stores-after-confirm.png',
      `S2 · Stage 5 of 9 · Stores In-charge · Contactor reserved · Flow tracker advances to Stage 6`,
      {
        scenario: 'S2',
        stage: 'Stage 5',
        role: 'Stores In-charge',
        page: `/work-orders/${woId}`,
        action: 'Confirm spare contactor reservation',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 6: Production Manager Shift C Window Confirmation
    // -------------------------------------------------------------------------
    console.log(`\n--- Stage 6: Production Manager Shift C Window Confirmation (${woId}) ---`);
    await switchRole(page, 'Production Manager');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // 12. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/12-stage6-production-mytasks-waiting.png',
      `S2 · Stage 6 of 9 · Production Manager · My tasks: Confirm Maintenance Slot for ${woId}`,
      {
        scenario: 'S2',
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

    // 13. Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/13-stage6-production-before-confirm.png',
      `S2 · Stage 6 of 9 · Production Manager · Flow tracker Stage 6 · Shift C maintenance slot proposed`,
      {
        scenario: 'S2',
        stage: 'Stage 6',
        role: 'Production Manager',
        page: `/work-orders/${woId}`,
        action: 'Review Shift C slot against production schedule',
        type: 'before',
      }
    );

    // Click "Confirm Window"
    const confirmWindowBtn = page.locator('button:has-text("Confirm Window")').first();
    await confirmWindowBtn.waitFor({ state: 'visible', timeout: 8000 });
    await confirmWindowBtn.click();
    await page.waitForTimeout(1000);

    // 14. After action
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/14-stage6-production-after-confirm.png',
      `S2 · Stage 6 of 9 · Production Manager · Shift C window confirmed · Flow tracker advances to Stage 7`,
      {
        scenario: 'S2',
        stage: 'Stage 6',
        role: 'Production Manager',
        page: `/work-orders/${woId}`,
        action: 'Confirm maintenance window clearance for Shift C',
        type: 'after',
      }
    );

    // -------------------------------------------------------------------------
    // Stage 7: Technician P07-T02 Execution
    // -------------------------------------------------------------------------
    console.log(`\n--- Stage 7: Technician Execution (${woId}) ---`);
    await switchRole(page, 'Technician');
    await openMyTasks(page);
    await page.waitForTimeout(600);

    // 15. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/15-stage7-technician-mytasks-waiting.png',
      `S2 · Stage 7 of 9 · Technician P07-T02 · My tasks: Scheduled ${woId} cleared for Shift C execution`,
      {
        scenario: 'S2',
        stage: 'Stage 7',
        role: 'Technician',
        page: '/my-tasks',
        action: 'Inspect actionable work order ready in My tasks',
        type: 'mytasks',
      }
    );

    // Open work order from My tasks
    const techTaskLink = page.locator(`a[href*="/work-orders/${woId}"], a:has-text("Apply LOTO & Execute"), a:has-text("Continue Task Execution")`).first();
    await techTaskLink.waitFor({ state: 'visible', timeout: 8000 });
    await techTaskLink.click();
    await page.waitForTimeout(800);

    // 16. Before LOTO: show steps locked
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/16-stage7-technician-before-loto-steps-locked.png',
      `S2 · Stage 7 of 9 · Technician P07-T02 · LOTO Phase 1 active · Electrical isolation steps locked until sequential verification`,
      {
        scenario: 'S2',
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

    // 17. LOTO permit issued, tasks unlocked
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/17-stage7-technician-loto-permit-issued.png',
      `S2 · Stage 7 of 9 · Technician P07-T02 · 6 LOTO steps verified · Electrical Safety Permit Active · Tasks unlocked`,
      {
        scenario: 'S2',
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
    await rootCauseInput.fill('Contactor 3TF44 coil insulation breakdown and pitting of main power contacts');

    // 18. Before close screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/18-stage7-technician-before-close.png',
      `S2 · Stage 7 of 9 · Technician P07-T02 · All checklist steps completed · Closure form filled with verified root cause`,
      {
        scenario: 'S2',
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

    // 19. After close screenshot
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/19-stage7-technician-after-close.png',
      `S2 · Stage 7 of 9 · Technician P07-T02 · ${woId} Closed & Resolved · P07-M30 restored to running baseline`,
      {
        scenario: 'S2',
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

    // 20. My tasks waiting item
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/20-stage8-training-mytasks-waiting.png',
      `S2 · Stage 8 of 9 · Training Coordinator · My tasks: AI Knowledge Card awaiting verification for ${woId}`,
      {
        scenario: 'S2',
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

    // 21. Before action
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/21-stage8-training-before-verify.png',
      'S2 · Stage 8 of 9 · Training Coordinator · AI Knowledge Card drafted from contactor replacement · Ready to verify',
      {
        scenario: 'S2',
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

    // 22. After action: Stage 9 Completed
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/22-stage8-training-after-verify.png',
      'S2 · Stage 8 of 9 · Training Coordinator · Knowledge Card verified & published · Lifecycle complete!',
      {
        scenario: 'S2',
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

    // 23. Control room tile nominal
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/23-stage9-completed-control-room.png',
      'S2 · Stage 9 of 9 · Restored to Normal · Control Room tile P07-M30 is green and nominal',
      {
        scenario: 'S2',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: '/control-room',
        action: 'Confirm MCC health reset to normal baseline in Control Room',
        type: 'after',
      }
    );

    // 2. Machine history card new entry
    await page.goto(`${BASE_URL}/machines/P07-M30`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 24. Machine history card
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/24-stage9-completed-history-card.png',
      `S2 · Stage 9 of 9 · Restored to Normal · P07-M30 history card logged completed ${woId}`,
      {
        scenario: 'S2',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: '/machines/P07-M30',
        action: 'Assert maintenance timeline updated with closed work order',
        type: 'after',
      }
    );

    // 3. Flow tracker complete on work order
    await page.goto(`${BASE_URL}/work-orders/${woId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 25. Flow tracker complete
    await captureScreenshot(
      page,
      'docs/walkthrough/s2/25-stage9-completed-flow-tracker.png',
      'S2 · Stage 9 of 9 · Restored to Normal · 9-step workflow flow tracker 100% complete',
      {
        scenario: 'S2',
        stage: 'Stage 9',
        role: 'Plant Head',
        page: `/work-orders/${woId}`,
        action: 'Assert all 9 stages marked complete in workflow tracker',
        type: 'after',
      }
    );

    console.log('  ✔ SCENARIO 2 COMPLETED SUCCESSFULLY!');
  } finally {
    await finalizeVideo(context, videoTempDir, targetMp4);
    await browser.close();
  }
}

if (require.main === module) {
  runScenario2().catch((err) => {
    console.error('Fatal in Scenario 2:', err);
    process.exit(1);
  });
}
