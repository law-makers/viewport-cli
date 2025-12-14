#!/usr/bin/env node

/**
 * Test script to screenshot localhost test page using Puppeteer
 * Saves results to viewport-results/ folder
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = {
  MOBILE: { width: 375, height: 667, name: 'mobile' },
  TABLET: { width: 768, height: 1024, name: 'tablet' },
  DESKTOP: { width: 1920, height: 1080, name: 'desktop' },
};

const TARGET_URL = 'http://localhost:3000/test.html';
const OUTPUT_DIR = './viewport-results';

async function screenshot(url, viewport) {
  console.log(`📸 Capturing ${viewport.name} (${viewport.width}×${viewport.height})...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
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
      timeout: 30000 
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
  console.log('🚀 ViewPort-CLI Screenshot Test\n');
  console.log(`📍 Target: ${TARGET_URL}`);
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const results = [];

  for (const [deviceType, viewport] of Object.entries(VIEWPORTS)) {
    try {
      const buffer = await screenshot(TARGET_URL, viewport);
      const filename = `${timestamp}_${viewport.name}_${viewport.width}x${viewport.height}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      fs.writeFileSync(filepath, buffer);
      
      const sizeKB = (buffer.length / 1024).toFixed(2);
      console.log(`   ✅ Saved: ${filename} (${sizeKB} KB)`);
      
      results.push({
        device: deviceType,
        viewport: viewport,
        filename: filename,
        size: buffer.length,
        path: filepath,
      });
    } catch (error) {
      console.error(`   ❌ Failed ${deviceType}:`, error.message);
    }
  }

  // Save metadata
  const metadataFile = path.join(OUTPUT_DIR, `${timestamp}_metadata.json`);
  fs.writeFileSync(metadataFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    targetUrl: TARGET_URL,
    screenshots: results,
  }, null, 2));

  console.log(`\n📊 Metadata: ${metadataFile}`);
  console.log(`\n✨ Complete! ${results.length}/${Object.keys(VIEWPORTS).length} screenshots captured.\n`);
}

main().catch(console.error);
