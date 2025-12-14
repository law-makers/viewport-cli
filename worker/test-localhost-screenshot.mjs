#!/usr/bin/env node

/**
 * LocalHost Screenshot Test
 * Demonstrates Puppeteer screenshotting of localhost websites
 * 
 * Usage:
 *   node test-localhost-screenshot.mjs [url] [viewport]
 * 
 * Examples:
 *   node test-localhost-screenshot.mjs http://localhost:3000/test.html MOBILE
 *   node test-localhost-screenshot.mjs http://localhost:3000/test.html DESKTOP
 *   node test-localhost-screenshot.mjs http://localhost:3000/test.html
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWPORTS = {
  MOBILE: { width: 375, height: 667, name: 'mobile' },
  TABLET: { width: 768, height: 1024, name: 'tablet' },
  DESKTOP: { width: 1920, height: 1080, name: 'desktop' },
};

const DEFAULT_URL = 'http://localhost:3000/test.html';
const RESULTS_DIR = path.join(__dirname, '..', '..', 'viewport-results', 'screenshots');

async function ensureResultsDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

async function screenshotUrl(url, viewportKey = 'MOBILE') {
  const viewport = VIEWPORTS[viewportKey];
  if (!viewport) {
    throw new Error(`Unknown viewport: ${viewportKey}. Available: ${Object.keys(VIEWPORTS).join(', ')}`);
  }

  console.log(`\n🎯 Screenshotting: ${url}`);
  console.log(`📱 Viewport: ${viewportKey} (${viewport.width}×${viewport.height})`);

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    console.log('✅ Browser launched');

    const page = await browser.newPage();
    console.log('✅ Page created');

    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
    });
    console.log(`✅ Viewport set to ${viewport.width}×${viewport.height}`);

    console.log(`⏳ Loading ${url}...`);
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    console.log('✅ Page loaded');

    console.log('📸 Capturing screenshot...');
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: true,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${timestamp}-${viewport.name}.png`;
    const filepath = path.join(RESULTS_DIR, filename);

    fs.writeFileSync(filepath, screenshotBuffer);
    console.log(`✅ Screenshot saved: ${filepath}`);
    console.log(`📊 File size: ${(screenshotBuffer.length / 1024).toFixed(2)} KB`);

    await page.close();
    await browser.close();

    return {
      success: true,
      filepath,
      filename,
      size: screenshotBuffer.length,
      viewport: viewportKey,
      dimensions: { width: viewport.width, height: viewport.height },
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      viewport: viewportKey,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0] || DEFAULT_URL;
  const viewport = args[1] || 'MOBILE';

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         ViewPort-CLI: Localhost Screenshot Test            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await ensureResultsDir();

    // If no specific viewport requested, screenshot all
    if (args.length < 2) {
      console.log('\n📋 Screenshotting all viewports...\n');
      const results = [];

      for (const [key] of Object.entries(VIEWPORTS)) {
        const result = await screenshotUrl(url, key);
        results.push(result);
      }

      console.log('\n✅ All screenshots captured!');
      console.log(`\n📁 Results saved to: ${RESULTS_DIR}`);

      // Show summary
      console.log('\n📊 Summary:');
      results.forEach(result => {
        if (result.success) {
          console.log(`  ✓ ${result.viewport}: ${result.filename} (${result.size / 1024} KB)`);
        } else {
          console.log(`  ✗ ${result.viewport}: ${result.error}`);
        }
      });
    } else {
      // Screenshot specific viewport
      const result = await screenshotUrl(url, viewport);

      if (result.success) {
        console.log('\n✅ Screenshot captured successfully!');
      } else {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
