import { Browser, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

const ffmpegStatic = require('ffmpeg-static');

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
export const PROD_URL = 'https://ferrow-foresight.vercel.app';

export interface ScreenshotRecord {
  scenario: string;
  stage: string;
  role: string;
  page: string;
  action: string;
  filename: string;
  relativePath: string;
  type: 'mytasks' | 'before' | 'after' | 'tour';
}

export const capturedRecords: ScreenshotRecord[] = [];

export async function createBrowserContext(
  browser: Browser,
  videoTempDir?: string
): Promise<{ context: BrowserContext; page: Page }> {
  if (videoTempDir && !fs.existsSync(videoTempDir)) {
    fs.mkdirSync(videoTempDir, { recursive: true });
  }

  const contextOptions: any = {
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  };

  if (videoTempDir) {
    contextOptions.recordVideo = {
      dir: videoTempDir,
      size: { width: 1440, height: 900 },
    };
  }

  const context = await browser.newContext(contextOptions);

  // Inject caption bar into every page
  await context.addInitScript(() => {
    document.cookie = 'demo=1; path=/';
    document.cookie = 'demo_caption=1; path=/';

    const injectOverlay = () => {
      let overlay = document.getElementById('demo-caption-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'demo-caption-overlay';
        overlay.style.cssText = `
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 38px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(8px);
          color: #FFFFFF;
          border-top: 1px solid rgba(255, 255, 255, 0.18);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.01em;
          box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
          pointer-events: none;
        `;
        overlay.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; flex-shrink: 0;"></span>
            <span id="demo-caption-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
          </div>
        `;
        document.body.appendChild(overlay);
      }
    };

    if (document.body) {
      injectOverlay();
    } else {
      window.addEventListener('DOMContentLoaded', injectOverlay);
    }

    (window as any).__setCaption = (text: string) => {
      injectOverlay();
      const overlay = document.getElementById('demo-caption-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
        const txtEl = overlay.querySelector('#demo-caption-text');
        if (txtEl) txtEl.textContent = text;
      }
    };
  });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(45000);
  page.setDefaultTimeout(30000);

  return { context, page };
}

export async function setCaption(page: Page, text: string, pauseMs = 2500) {
  try {
    await page.evaluate((captionText) => {
      if ((window as any).__setCaption) {
        (window as any).__setCaption(captionText);
      }
    }, text);
  } catch {}
  if (pauseMs > 0) {
    await page.waitForTimeout(pauseMs);
  }
}

export async function captureScreenshot(
  page: Page,
  relPath: string,
  captionText: string,
  meta?: {
    scenario: string;
    stage: string;
    role: string;
    page: string;
    action: string;
    type: 'mytasks' | 'before' | 'after' | 'tour';
  }
) {
  if (captionText) {
    await setCaption(page, captionText, 2500);
  } else {
    await page.waitForTimeout(400);
  }

  const fullPath = path.join(process.cwd(), relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await page.screenshot({ path: fullPath, fullPage: false });
  console.log(`  📸 Screenshot: ${relPath}`);

  if (meta) {
    capturedRecords.push({
      scenario: meta.scenario,
      stage: meta.stage,
      role: meta.role,
      page: meta.page,
      action: meta.action,
      filename: path.basename(relPath),
      relativePath: relPath,
      type: meta.type,
    });
  }
}

export async function resetDemoThroughUI(page: Page, baseUrl = BASE_URL) {
  console.log('  🔄 Resetting demo state through UI...');
  // Ensure we are on an app page
  if (!page.url() || page.url() === 'about:blank') {
    await page.goto(`${baseUrl}/control-room`, { waitUntil: 'domcontentloaded' });
  }

  try {
    const resetBtn = page.locator('button[data-testid="reset-demo-button"], button[title="Reset demo baseline"]').first();
    await resetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await resetBtn.click();
    await page.waitForTimeout(1000);
  } catch (err: any) {
    console.warn('  ⚠️ Top bar reset button click fallback to About page reset:', err.message);
    await page.goto(`${baseUrl}/about`, { waitUntil: 'domcontentloaded' });
    const aboutReset = page.locator('button:has-text("Reset demo baseline"), button:has-text("Start S1")').first();
    if (await aboutReset.isVisible()) {
      await aboutReset.click();
      await page.waitForTimeout(1000);
    }
  }
}

export async function switchRole(page: Page, targetRole: string) {
  console.log(`  👤 Switching role to: ${targetRole}`);
  const roleBtn = page.locator('button[data-testid="role-switcher-button"], header button:has(svg.lucide-user-check)').first();
  await roleBtn.waitFor({ state: 'visible', timeout: 8000 });
  const currentText = await roleBtn.innerText().catch(() => '');
  if (currentText.includes(targetRole)) {
    console.log(`  Role is already ${targetRole}`);
    return;
  }

  await roleBtn.click();
  await page.waitForTimeout(400);

  const roleId = targetRole.toLowerCase().replace(/\s+/g, '-');
  const option = page.locator(`button[data-testid="role-option-${roleId}"]`).first();
  if (await option.isVisible()) {
    await option.click();
  } else {
    const dropdown = page.locator('div[class*="z-50"]');
    const fallbackOption = dropdown.locator(`button:has-text("${targetRole}")`).first();
    await fallbackOption.waitFor({ state: 'visible', timeout: 5000 });
    await fallbackOption.click();
  }
  await page.waitForTimeout(800);
}

export async function openMyTasks(page: Page, baseUrl = BASE_URL) {
  console.log('  📋 Opening My tasks...');
  try {
    const myTasksLink = page.locator('nav a:has-text("My tasks")').first();
    if (await myTasksLink.isVisible()) {
      await myTasksLink.click();
      await page.waitForTimeout(600);
    } else {
      await page.goto(`${baseUrl}/my-tasks`, { waitUntil: 'domcontentloaded' });
    }
  } catch {
    await page.goto(`${baseUrl}/my-tasks`, { waitUntil: 'domcontentloaded' });
  }
}

export async function finalizeVideo(
  context: BrowserContext,
  tempDir: string,
  targetMp4Path: string
) {
  console.log(`  🎬 Finalizing video to: ${targetMp4Path}...`);
  await context.close();

  const outDir = path.dirname(targetMp4Path);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  if (!fs.existsSync(tempDir)) {
    console.warn('  ⚠️ Temp dir does not exist:', tempDir);
    return;
  }

  const webmFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith('.webm'));
  if (webmFiles.length === 0) {
    console.warn('  ⚠️ No .webm video found in temp dir:', tempDir);
    return;
  }

  const webmPath = path.join(tempDir, webmFiles[0]);
  execSync(
    `"${ffmpegStatic}" -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -y "${targetMp4Path}"`
  );

  const stats = fs.statSync(targetMp4Path);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`  ✔ MP4 created: ${targetMp4Path} (${sizeMb} MB)`);

  // Clean up webm files
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
}
