import { chromium } from '@playwright/test';
import {
  createBrowserContext,
  switchRole,
  captureScreenshot,
  resetDemoThroughUI,
  BASE_URL,
} from './helpers';
import { UserRole, ROLE_LANDING_PAGES, ROLE_NAV_CONFIG } from '../../lib/roles';
import * as path from 'path';
import * as fs from 'fs';

interface RoleTourItem {
  role: UserRole;
  folder: string;
  pages: Array<{ path: string; name: string; filename: string }>;
}

const ROLE_TOURS: RoleTourItem[] = [
  {
    role: 'Technician',
    folder: 'technician',
    pages: [
      { path: '/my-tasks', name: 'My tasks (Landing)', filename: '01-landing-mytasks.png' },
      { path: '/capture', name: 'Capture', filename: '02-capture.png' },
      { path: '/work-orders', name: 'Work orders', filename: '03-work-orders.png' },
    ],
  },
  {
    role: 'Maintenance Planner',
    folder: 'maintenance-planner',
    pages: [
      { path: '/my-tasks', name: 'My tasks (Landing)', filename: '01-landing-mytasks.png' },
      { path: '/alerts', name: 'Alerts', filename: '02-alerts.png' },
      { path: '/planning', name: 'Planning', filename: '03-planning.png' },
      { path: '/work-orders', name: 'Work orders', filename: '04-work-orders.png' },
    ],
  },
  {
    role: 'Plant Head',
    folder: 'plant-head',
    pages: [
      { path: '/my-tasks', name: 'My tasks (Landing)', filename: '01-landing-mytasks.png' },
      { path: '/control-room', name: 'Control Room', filename: '02-control-room.png' },
      { path: '/alerts', name: 'Alerts', filename: '03-alerts.png' },
      { path: '/kpis', name: 'KPIs', filename: '04-kpis.png' },
    ],
  },
  {
    role: 'Production Manager',
    folder: 'production-manager',
    pages: [
      { path: '/my-tasks', name: 'My tasks (Landing)', filename: '01-landing-mytasks.png' },
      { path: '/production', name: 'Production', filename: '02-production.png' },
    ],
  },
  {
    role: 'Stores In-charge',
    folder: 'stores-in-charge',
    pages: [
      { path: '/my-tasks', name: 'My tasks (Landing)', filename: '01-landing-mytasks.png' },
      { path: '/spares', name: 'Spares', filename: '02-spares.png' },
    ],
  },
  {
    role: 'Training Coordinator',
    folder: 'training-coordinator',
    pages: [
      { path: '/my-tasks', name: 'My tasks (Landing)', filename: '01-landing-mytasks.png' },
      { path: '/people', name: 'People', filename: '02-people.png' },
    ],
  },
  {
    role: 'Head of Plant Operations',
    folder: 'head-of-plant-operations',
    pages: [
      { path: '/network', name: 'Network (Landing)', filename: '01-landing-network.png' },
      { path: '/kpis', name: 'KPIs', filename: '02-kpis.png' },
    ],
  },
];

export async function runRoleTour() {
  const browser = await chromium.launch({ headless: true, slowMo: 50 });
  const { context, page } = await createBrowserContext(browser);

  try {
    console.log('\n======================================================');
    console.log('  ▶ ROLE TOUR: 7 Roles Landing & Main Menu Pages');
    console.log('======================================================');

    for (const tour of ROLE_TOURS) {
      console.log(`\n--- Tour: ${tour.role} ---`);
      const targetDir = path.resolve(process.cwd(), 'docs/walkthrough/roles', tour.folder);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      // Reset demo before each role tour
      await resetDemoThroughUI(page);
      await switchRole(page, tour.role);

      for (const p of tour.pages) {
        console.log(`  🌐 Navigating to ${p.name} (${p.path})...`);
        await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);

        const screenshotPath = `docs/walkthrough/roles/${tour.folder}/${p.filename}`;
        const caption = `Role Tour · ${tour.role} · ${p.name}`;

        await captureScreenshot(page, screenshotPath, caption, {
          scenario: 'Role Tour',
          stage: p.name,
          role: tour.role,
          page: p.path,
          action: `Tour ${p.name} view`,
          type: 'tour',
        });
      }
    }

    console.log('\n======================================================');
    console.log('  ✔ ROLE TOUR COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
  } finally {
    await context.close();
    await browser.close();
  }
}

if (require.main === module) {
  runRoleTour().catch((err) => {
    console.error('Fatal in Role Tour:', err);
    process.exit(1);
  });
}
