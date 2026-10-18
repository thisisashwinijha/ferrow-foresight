import { chromium, Page } from '@playwright/test';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), 'docs', 'screenshots');

interface ScreenshotItem {
  filename: string;
  category: string;
  viewport: string;
  caption: string;
}

const capturedItems: ScreenshotItem[] = [];

async function resetDemo() {
  try {
    const res = await fetch(`${BASE_URL}/api/demo/reset`, { method: 'POST' });
    if (!res.ok) console.warn('Warning: resetDemo returned non-ok status');
  } catch (err: any) {
    console.warn('Warning: resetDemo fetch failed:', err.message);
  }
}

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function safeGoto(page: Page, url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      return;
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await page.waitForTimeout(1500);
    }
  }
}

async function capture(page: Page, filename: string, category: string, viewport: string, caption: string) {
  const filePath = path.join(OUT_DIR, filename);
  await page.waitForTimeout(500);
  await page.screenshot({ path: filePath, fullPage: false });
  capturedItems.push({ filename, category, viewport, caption });
  console.log(`  📸 [${viewport}] ${filename}: ${caption}`);
}

async function main() {
  console.log('=== Ferrow Foresight Screenshot Capture Suite ===');
  process.env.AGENT_PROVIDER = 'cached';
  await ensureDir(OUT_DIR);

  const isHealthy = await fetch(`${BASE_URL}/api/health`).then((r) => r.ok).catch(() => false);
  if (!isHealthy) {
    console.log('Starting local dev server on port 3000 for screenshot suite...');
    const serverProcess = spawn('npx', ['next', 'dev', '-p', '3000'], {
      detached: true,
      stdio: 'ignore',
    });
    serverProcess.unref();
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const ok = await fetch(`${BASE_URL}/api/health`).then((r) => r.ok).catch(() => false);
      if (ok) {
        console.log('Dev server ready.');
        break;
      }
    }
  }

  const browser = await chromium.launch({ headless: true });

  // -------------------------------------------------------------
  // 1. Page Overview Shots (Desktop 1440x900)
  // -------------------------------------------------------------
  console.log('\n--- Section 1: Page Overview Shots (Desktop 1440x900) ---');
  await resetDemo();
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  });
  const page = await desktopContext.newPage();
  page.setDefaultNavigationTimeout(45000);
  page.setDefaultTimeout(45000);

  // 01 Network
  await safeGoto(page, `${BASE_URL}/network?plant=all`);
  await page.waitForTimeout(600);
  await capture(page, '01-network-overview.png', 'Page Overview', '1440x900', 'Multi-plant network topology across Pune (P-07) and Stuttgart (P-03).');

  // 02 Control Room
  await safeGoto(page, `${BASE_URL}/control-room`);
  await page.waitForTimeout(600);
  await capture(page, '02-control-room-plant-head.png', 'Page Overview', '1440x900', 'Control room mimic, hero KPI strip, line machine topology, and recent alert stream.');

  // 03 Alerts List
  await safeGoto(page, `${BASE_URL}/alerts`);
  await page.waitForTimeout(600);
  await capture(page, '03-alerts-list.png', 'Page Overview', '1440x900', 'Alerts management queue with priority badges, risk scores, and failure taxonomy.');

  // 04 Alert Detail with Flow Tracker
  await safeGoto(page, `${BASE_URL}/alerts/AL-1001`);
  await page.waitForTimeout(600);
  await capture(page, '04-alert-detail-flow-tracker.png', 'Page Overview', '1440x900', 'Alert detail view featuring 8-step WorkflowFlowTracker, sensor evidence, and guardrail validations.');

  // 05 Machine History Card Sensor
  await safeGoto(page, `${BASE_URL}/machines/P07-M03`);
  await page.waitForTimeout(600);
  await capture(page, '05-machine-history-sensor-p07-m03.png', 'Page Overview', '1440x900', 'IoT sensor machine history card displaying continuous vibration trends and ISO 10816 thresholds.');

  // 06 Machine History Card Legacy
  await safeGoto(page, `${BASE_URL}/machines/P07-M05`);
  await page.waitForTimeout(600);
  await capture(page, '06-machine-history-legacy-p07-m05.png', 'Page Overview', '1440x900', 'Unmonitored brownfield machine history card showing technician observation log and PM history.');

  // 07 Work Orders Kanban
  await safeGoto(page, `${BASE_URL}/work-orders`);
  await page.waitForTimeout(600);
  await capture(page, '07-work-orders-kanban.png', 'Page Overview', '1440x900', 'Work order execution board with scheduled, in-progress, and closed columns.');

  // 08 Work Order Mid-LOTO
  await safeGoto(page, `${BASE_URL}/work-orders/WO-2202`);
  await page.waitForTimeout(600);
  await capture(page, '08-work-order-mid-loto-wo-2202.png', 'Page Overview', '1440x900', 'Work order execution sheet mid-task with zero-energy LOTO verification checklist.');

  // 09 Technician Capture
  await safeGoto(page, `${BASE_URL}/capture`);
  await page.waitForTimeout(600);
  await capture(page, '09-technician-capture-flow.png', 'Page Overview', '1440x900', 'Technician frontline capture view with structured 5-step reporting wizard.');

  // 10 Maintenance Planning
  await safeGoto(page, `${BASE_URL}/planning`);
  await page.waitForTimeout(600);
  await capture(page, '10-maintenance-planning.png', 'Page Overview', '1440x900', 'Maintenance planning view with PM Optimiser deferral recommendations and hours saved.');

  // 11 Production Coordination
  await safeGoto(page, `${BASE_URL}/production`);
  await page.waitForTimeout(600);
  await capture(page, '11-production-coordination.png', 'Page Overview', '1440x900', 'Production coordination view with maintenance window approval actions.');

  // 12 Spares Readiness
  await safeGoto(page, `${BASE_URL}/spares`);
  await page.waitForTimeout(600);
  await capture(page, '12-spares-readiness.png', 'Page Overview', '1440x900', 'Spare parts inventory readiness, safety stock threshold alerts, and purchase orders.');

  // 13 KPIs Dashboard
  await safeGoto(page, `${BASE_URL}/kpis`);
  await page.waitForTimeout(600);
  await capture(page, '13-kpis-dashboard.png', 'Page Overview', '1440x900', 'Executive reliability KPIs dashboard tracking MTBF, MTTR, PM compliance, and AI triage precision.');

  // 14 People Development
  await safeGoto(page, `${BASE_URL}/people`);
  await page.waitForTimeout(600);
  await capture(page, '14-people-development.png', 'Page Overview', '1440x900', 'People and competency development matrix tracking certifications, shifts, and shadow assignments.');

  // 15 Agent Console
  await safeGoto(page, `${BASE_URL}/agent`);
  await page.waitForTimeout(600);
  await capture(page, '15-agent-console-observability.png', 'Page Overview', '1440x900', 'Agent observability console showing token consumption, cache hits, provider waterfall, and latency.');

  // 16 Plant Copilot Panel
  await safeGoto(page, `${BASE_URL}/control-room`);
  await page.waitForTimeout(500);
  const copilotBtn = await page.$('button[aria-label="Toggle Plant Copilot"]');
  if (copilotBtn) {
    await copilotBtn.click();
    await page.waitForTimeout(500);
  }
  await capture(page, '16-plant-copilot-panel.png', 'Page Overview', '1440x900', 'Plant Copilot drawer open with interactive plant query interface.');

  // 17 Status
  await safeGoto(page, `${BASE_URL}/status`);
  await page.waitForTimeout(600);
  await capture(page, '17-system-status.png', 'Page Overview', '1440x900', 'Live system health status dashboard for database connection, fallback state, and model latency.');

  // 18 About
  await safeGoto(page, `${BASE_URL}/about`);
  await page.waitForTimeout(600);
  await capture(page, '18-about-system-architecture.png', 'Page Overview', '1440x900', 'About page with architecture, 8 scenario launchers, evaluation rubric, and install hints.');

  await page.close();
  await desktopContext.close();

  // -------------------------------------------------------------
  // 2. Mobile Responsive Shots (Mobile 390x844)
  // -------------------------------------------------------------
  console.log('\n--- Section 2: Mobile Responsive Shots (Mobile 390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
  });
  const mPage = await mobileContext.newPage();
  mPage.setDefaultNavigationTimeout(45000);
  mPage.setDefaultTimeout(45000);

  // Mobile My Tasks
  await safeGoto(mPage, `${BASE_URL}/my-tasks`);
  await mPage.waitForTimeout(600);
  await capture(mPage, 'mobile-01-my-tasks-technician.png', 'Mobile (390x844)', '390x844', 'Mobile technician view for field execution and checklist item checkoff.');

  // Mobile Capture
  await safeGoto(mPage, `${BASE_URL}/capture`);
  await mPage.waitForTimeout(600);
  await capture(mPage, 'mobile-02-technician-capture.png', 'Mobile (390x844)', '390x844', 'Mobile-responsive frontline observation capture wizard on factory floor.');

  // Mobile Production
  await safeGoto(mPage, `${BASE_URL}/production`);
  await mPage.waitForTimeout(600);
  await capture(mPage, 'mobile-03-production-coordination.png', 'Mobile (390x844)', '390x844', 'Mobile view for production manager window confirmation and line scheduling.');

  await mPage.close();
  await mobileContext.close();

  // -------------------------------------------------------------
  // 3. Scenario Flow Shots (S1 to S8)
  // -------------------------------------------------------------
  console.log('\n--- Section 3: Scenario Flow Shots (S1 to S8) ---');
  const flowContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  });
  const fPage = await flowContext.newPage();
  fPage.setDefaultNavigationTimeout(45000);
  fPage.setDefaultTimeout(45000);

  // S1: Sensor P1 Bearing Wear
  await resetDemo();
  await safeGoto(fPage, `${BASE_URL}/control-room`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's1-01-sensor-p1-control-room.png', 'Scenario S1', '1440x900', 'S1 Step 1: Control room alerts Plant Manager of high-risk sensor anomaly on P07-M03.');

  await safeGoto(fPage, `${BASE_URL}/alerts/AL-1001`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's1-02-alert-planner-review-flow-tracker.png', 'Scenario S1', '1440x900', 'S1 Step 2: Maintenance Planner reviews bearing wear triage and Flow Tracker status.');

  await safeGoto(fPage, `${BASE_URL}/planning`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's1-03-pm-window-coordination.png', 'Scenario S1', '1440x900', 'S1 Step 3: Planned shutdown window aligned with Sunday production changeover.');

  await safeGoto(fPage, `${BASE_URL}/work-orders`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's1-04-work-order-assigned-rahul.png', 'Scenario S1', '1440x900', 'S1 Step 4: Approved work order scheduled with qualified technician Rahul Sharma.');

  // S2: Hinglish voice observation & HT certification gate
  await resetDemo();
  await safeGoto(fPage, `${BASE_URL}/alerts`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's2-01-hinglish-observation-alert.png', 'Scenario S2', '1440x900', 'S2 Step 1: Alert generated from Hinglish technician voice note on MCC panel P07-M30.');

  await safeGoto(fPage, `${BASE_URL}/people`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's2-02-ht-electrician-competency-gate.png', 'Scenario S2', '1440x900', 'S2 Step 2: HT Electrician certification enforcement ensures only certified tech assigned.');

  // S3: False alarm filter
  await resetDemo();
  await safeGoto(fPage, `${BASE_URL}/alerts`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's3-01-suppressed-transient-spike.png', 'Scenario S3', '1440x900', 'S3 Step 1: Transient electrical spike on P07-M22 evaluated against 7-day trend and suppressed.');

  // S4: Stockout blocker
  await resetDemo();
  await safeGoto(fPage, `${BASE_URL}/spares`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's4-01-stockout-servo-purchase-request.png', 'Scenario S4', '1440x900', 'S4 Step 1: SP-015 servo motor stockout flags work order blocked and triggers purchase request.');

  // S5: PM Optimiser safe deferrals
  await resetDemo();
  await safeGoto(fPage, `${BASE_URL}/planning`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's5-01-pm-optimiser-safe-deferrals.png', 'Scenario S5', '1440x900', 'S5 Step 1: PM Optimiser suggests 3 safe calendar deferrals saving 18 technician hours.');

  // S6: Shadow plant Stuttgart
  await resetDemo();
  await safeGoto(fPage, `${BASE_URL}/alerts?plant=P-03`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's6-01-stuttgart-shadow-mode-validation.png', 'Scenario S6', '1440x900', 'S6 Step 1: Stuttgart (P-03) shadow rollout mode processing telemetry without physical dispatch.');

  // S7: Copilot Q&A & safe refusal
  await resetDemo();
  await safeGoto(fPage, `${BASE_URL}/control-room`);
  await fPage.waitForTimeout(500);
  const cpBtn = await fPage.$('button[aria-label="Toggle Plant Copilot"]');
  if (cpBtn) {
    await cpBtn.click();
    await fPage.waitForTimeout(500);
  }
  await capture(fPage, 's7-01-copilot-qa-operational-context.png', 'Scenario S7', '1440x900', 'S7 Step 1: Plant Copilot provides concise, accurate operational insights on equipment health.');

  // S8: 5-step Technician capture flow
  await resetDemo();
  await safeGoto(fPage, `${BASE_URL}/capture`);
  await fPage.waitForTimeout(600);
  await capture(fPage, 's8-01-capture-step1-who.png', 'Scenario S8', '1440x900', 'S8 Step 1: Frontline technician authentication and shift identification.');

  await fPage.close();
  await flowContext.close();
  await browser.close();

  // Reset demo state at the very end
  await resetDemo();

  // -------------------------------------------------------------
  // 4. Generate docs/screenshots/README.md
  // -------------------------------------------------------------
  console.log('\n--- Section 4: Generating docs/screenshots/README.md ---');
  let md = '# Ferrow Foresight Screenshot Pack\n\n';
  md += 'This directory contains the production screenshot documentation for **Ferrow Foresight** (Industrial AI Maintenance OS).\n\n';
  md += 'All captures are in high-contrast light mode with crisp typography, standardized shift designations, and clean layout geometry.\n\n';
  md += '## Screenshot Index\n\n';
  md += '| # | Category | Viewport | Filename | Description |\n';
  md += '|---|---|---|---|---|\n';

  capturedItems.forEach((item, index) => {
    md += `| ${index + 1} | ${item.category} | \`${item.viewport}\` | [${item.filename}](./${item.filename}) | ${item.caption} |\n`;
  });

  md += '\n## Reproduction\n\n';
  md += 'To regenerate this full screenshot pack locally:\n\n';
  md += '```bash\nnpm run screenshots\n```\n';

  const readmePath = path.join(OUT_DIR, 'README.md');
  fs.writeFileSync(readmePath, md, 'utf-8');
  console.log(`✅ Generated ${readmePath} with ${capturedItems.length} screenshots cataloged.`);
  console.log('Demo state successfully reset to live baseline.');
}

main().catch((err) => {
  console.error('Fatal error running screenshot pack:', err);
  process.exit(1);
});
