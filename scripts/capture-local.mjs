#!/usr/bin/env node

/**
 * Capture local screenshots using Puppeteer (primary ViewPort-CLI flow).
 * - Targets localhost by default (http://localhost:3000/test.html)
 * - Saves PNGs to ./viewport-results (gitignored)
 * - Captures multiple viewports (mobile/tablet/desktop)
 *
 * Usage:
 *   # start the test server in another terminal
 *   # cd test-server && node server.js
 *
 *   # then run the capture script
 *   node scripts/capture-local.mjs
 *
 * Optional env vars:
 *   TARGET_URL=http://localhost:3000/test.html
 *   OUTPUT_DIR=./viewport-results
 *   VIEWPORTS=MOBILE,TABLET,DESKTOP
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const DEFAULT_TARGET = process.env.TARGET_URL || 'http://localhost:3000/test.html';
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.resolve('./viewport-results');
const VIEWPORT_ORDER = (process.env.VIEWPORTS || 'MOBILE,TABLET,DESKTOP')
  .split(',')
  .map(v => v.trim().toUpperCase())
  .filter(Boolean);

const VIEWPORTS = {
  MOBILE: { width: 375, height: 667, name: 'mobile' },
  TABLET: { width: 768, height: 1024, name: 'tablet' },
  DESKTOP: { width: 1920, height: 1080, name: 'desktop' },
};

async function capture(url, viewport) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
    });

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const buffer = await page.screenshot({
      type: 'png',
      fullPage: true,
    });

    await page.close();
    return buffer;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🚀 ViewPort-CLI Local Screenshot (Puppeteer)');
  console.log(`📍 Target: ${DEFAULT_TARGET}`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log(`🖼️ Viewports: ${VIEWPORT_ORDER.join(', ')}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const results = [];

  for (const key of VIEWPORT_ORDER) {
    const viewport = VIEWPORTS[key];
    if (!viewport) {
      console.warn(`⚠️  Skipping unknown viewport: ${key}`);
      continue;
    }

    try {
      console.log(`📸 Capturing ${viewport.name} (${viewport.width}x${viewport.height})...`);
      const buffer = await capture(DEFAULT_TARGET, viewport);
      const filename = `${ts}_${viewport.name}_${viewport.width}x${viewport.height}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      const sizeKB = (buffer.length / 1024).toFixed(2);
      console.log(`   ✅ Saved: ${filename} (${sizeKB} KB)`);

      results.push({
        device: key,
        width: viewport.width,
        height: viewport.height,
        file: filename,
        bytes: buffer.length,
      });
    } catch (error) {
      console.error(`   ❌ Failed ${key}: ${error.message}`);
    }
  }

  const metadata = {
    timestamp: new Date().toISOString(),
    targetUrl: DEFAULT_TARGET,
    screenshots: results,
  };

  const metaFile = path.join(OUTPUT_DIR, `${ts}_metadata.json`);
  fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
  console.log(`\n📊 Metadata: ${metaFile}`);
  console.log(`✨ Done (${results.length}/${VIEWPORT_ORDER.length} captured)\n`);
}

main().catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
