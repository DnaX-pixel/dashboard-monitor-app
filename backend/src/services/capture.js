const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const VIEWPORT = { width: 1280, height: 720 };
const DATA_DIR = path.join(__dirname, '../../../data');

/**
 * Navigate to a URL, screenshot the cropped area (% coords → pixels),
 * save to disk, and return the relative path (from DATA_DIR).
 */
async function captureAndCrop(jobId, targetUrl, cropX, cropY, cropWidth, cropHeight) {
  const jobDir = path.join(DATA_DIR, 'screenshots', String(jobId));
  if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  try {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(8000);

    const clip = {
      x: Math.round((cropX / 100) * VIEWPORT.width),
      y: Math.round((cropY / 100) * VIEWPORT.height),
      width: Math.round((cropWidth / 100) * VIEWPORT.width),
      height: Math.round((cropHeight / 100) * VIEWPORT.height),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}.png`;
    const absPath = path.join(jobDir, filename);

    await page.screenshot({ path: absPath, clip });

    // Return relative path stored in DB and exposed via /static
    return path.join('screenshots', String(jobId), filename).replace(/\\/g, '/');
  } finally {
    await browser.close();
  }
}

/** Full-viewport screenshot for the crop-selector preview (overwrites per user). */
async function capturePreview(userId, targetUrl) {
  const dir = path.join(DATA_DIR, 'previews', String(userId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  try {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(8000);
    const absPath = path.join(dir, 'preview.png');
    await page.screenshot({ path: absPath });
    return `previews/${userId}/preview.png`;
  } finally {
    await browser.close();
  }
}

module.exports = { captureAndCrop, capturePreview };
