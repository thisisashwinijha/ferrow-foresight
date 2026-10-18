import { chromium } from '@playwright/test';

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

const VIEWPORTS = [
  { name: 'mobile (375px)', width: 375, height: 667 },
  { name: 'tablet (768px)', width: 768, height: 1024 },
  { name: 'desktop (1440px)', width: 1440, height: 900 },
  { name: 'wide (1920px)', width: 1920, height: 1080 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  let totalOverflows = 0;

  for (const vp of VIEWPORTS) {
    for (const path of PAGES) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      try {
        await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(400);

        // Check if document or body horizontally overflows the viewport
        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientWidth = docEl.clientWidth;
          const delta = scrollWidth - clientWidth;
          return { delta, scrollWidth, clientWidth };
        });

        if (overflow.delta > 2) {
          console.log(`❌ [${vp.name}] ${path}: Body overflow by ${overflow.delta}px (scroll: ${overflow.scrollWidth}px vs client: ${overflow.clientWidth}px)`);
          totalOverflows++;
        }
      } catch (err: any) {
        console.error(`Error on ${path} (${vp.name}):`, err.message);
      } finally {
        await page.close();
        await context.close();
      }
    }
  }

  await browser.close();

  console.log(`\nOverflow check finished. Total overflows: ${totalOverflows}`);
  if (totalOverflows > 0) {
    process.exit(1);
  } else {
    console.log('✅ All pages fit cleanly within all viewports (375px, 768px, 1440px, 1920px)!');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
