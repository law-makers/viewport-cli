#!/usr/bin/env node
/**
 * Local Screenshot Server
 * 
 * Runs Puppeteer directly with Chrome for local development.
 * 
 * Listens on port 3001 by default
 * 
 * Usage:
 *   node index.js [--port 3001]
 * 
 * Then configure CLI to use: http://localhost:3001
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
      parsed.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--detach') {
      parsed.detach = true;
    }
  }
  
  return parsed;
}

const cliArgs = parseArgs();
const PORT = cliArgs.port || process.env.PORT || 3001;

// Device viewport configurations
const DEVICE_VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'MOBILE' },
  tablet: { width: 768, height: 1024, name: 'TABLET' },
  desktop: { width: 1920, height: 1080, name: 'DESKTOP' },
};

let browser = null;
let concurrentPages = 0;
const MAX_CONCURRENT_PAGES = 3;
let browserInitError = null; // Track browser init errors

/**
 * Ensure Chromium is downloaded
 */
async function ensureChromium() {
  try {
    console.log('[Chromium] Checking if Chromium is available...');
    const execPath = await chromium.executablePath();
    
    if (!execPath) {
      throw new Error('Chromium executable path not found');
    }
    
    // Check if file exists
    if (!fs.existsSync(execPath)) {
      console.log('[Chromium] Downloading Chromium binary...');
      // The next call will trigger download if needed
      await chromium.executablePath();
    }
    
    console.log('[Chromium] ✅ Chromium is ready at:', execPath);
    return true;
  } catch (err) {
    console.error('[Chromium] ❌ Failed to ensure Chromium:', err.message);
    console.error('[Chromium] Make sure @sparticuz/chromium is installed: npm install @sparticuz/chromium');
    throw err;
  }
}

/**
 * Initialize browser
 */
async function initBrowser() {
  if (browser) return browser;
  if (browserInitError) throw browserInitError;
  
  try {
    // Ensure Chromium is available first
    await ensureChromium();
    
    const launchOptions = {
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
      executablePath: await chromium.executablePath(),
    };

    browser = await puppeteer.launch(launchOptions);
    console.log('[Browser] ✅ Browser initialized\n');
    return browser;
  } catch (err) {
    browserInitError = err;
    console.error('[Browser] ❌ Failed to initialize:', err.message);
    throw err;
  }
}

/**
 * Capture screenshot
 */
async function captureScreenshot(targetUrl, device) {
  // Rate limiting: wait if too many concurrent pages
  while (concurrentPages >= MAX_CONCURRENT_PAGES) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  concurrentPages++;
  
  try {
    if (!browser) {
      throw new Error('Browser not initialized');
    }

    const viewport = DEVICE_VIEWPORTS[device];
    if (!viewport) {
      throw new Error(`Unknown device: ${device}`);
    }

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
    });

    // Navigate to target with timeout (use 'load' instead of 'networkidle2' for faster response)
    console.log(`[Screenshot] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: 'load',
      timeout: 30000,
    });

    console.log(`[Screenshot] Taking screenshot for ${device}...`);
    // Take screenshot as base64 PNG
    const screenshotBase64 = await page.screenshot({
      type: 'png',
      fullPage: true,
      encoding: 'base64',
    });

    console.log(`[Screenshot] Screenshot captured for ${device} (${screenshotBase64.length} bytes)`);
    await page.close();

    concurrentPages--;
    return screenshotBase64;
  } catch (err) {
    concurrentPages--;
    console.error(`[Screenshot] Error capturing ${device}:`, err.message);
    throw err;
  }
}

/**
 * HTTP request handler
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (pathname === '/' && req.method === 'GET') {
    const healthStatus = {
      status: browser ? 'ok' : 'degraded',
      service: 'local-screenshot-server',
      devices: Object.keys(DEVICE_VIEWPORTS),
      browserReady: !!browser,
    };
    
    // Return 200 if browser is ready, 503 if not (but server is running)
    const statusCode = browser ? 200 : 503;
    res.writeHead(statusCode);
    res.end(JSON.stringify(healthStatus));
    return;
  }

  // Scan endpoint - bridges CLI API format to screenshots endpoint
  if (pathname === '/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        // Check if browser failed to initialize
        if (browserInitError) {
          res.writeHead(503);
          res.end(JSON.stringify({
            error: 'Browser initialization failed',
            message: browserInitError.message,
            help: 'The Chromium browser failed to initialize. This usually means system dependencies are missing. ' +
                  'Install dependencies: sudo apt-get install -y libnss3 libgdk-pixbuf2.0-0 libgtk-3-0 libxss1 libgbm1 libasound2',
            details: browserInitError.toString()
          }));
          return;
        }

        const { targetUrl, viewports } = JSON.parse(body);
        
        if (!targetUrl) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'targetUrl required' }));
          return;
        }

        // Use viewports as-is (lowercase) or default
        const devices = viewports || ['mobile', 'tablet', 'desktop'];
        
        console.log(`[Request /scan] Capturing ${devices.join(', ')} for ${targetUrl}`);
        
        // Capture all viewports in parallel
        const results = await Promise.all(
          devices.map(async (device) => {
            try {
              const screenshotBase64 = await captureScreenshot(targetUrl, device);
              const viewport = DEVICE_VIEWPORTS[device];
              return {
                device: device.toLowerCase(),
                dimensions: {
                  width: viewport?.width || 0,
                  height: viewport?.height || 0,
                },
                screenshotBase64,
                issues: []
              };
            } catch (err) {
              console.error(`[Error] Failed to capture ${device}:`, err);
              const viewport = DEVICE_VIEWPORTS[device];
              return {
                device: device.toLowerCase(),
                dimensions: {
                  width: viewport?.width || 0,
                  height: viewport?.height || 0,
                },
                screenshotBase64: '',
                issues: [],
                error: err.message
              };
            }
          })
        );
        
        // Convert to CLI response format
        const response = {
          scanId: `scan-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'complete',
          results: results.filter(r => !r.error),
          globalAnalysis: ''
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (err) {
        console.error('[Error] /scan endpoint:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Screenshot endpoint
  if (pathname === '/screenshot' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { targetUrl, device } = JSON.parse(body);
        
        if (!targetUrl) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'targetUrl required' }));
          return;
        }

        if (!device) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'device required' }));
          return;
        }

        console.log(`[Request] Capturing ${device} for ${targetUrl}`);
        const screenshotBase64 = await captureScreenshot(targetUrl, device);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          device,
          screenshot: screenshotBase64,
          dimensions: {
            width: DEVICE_VIEWPORTS[device].width,
            height: DEVICE_VIEWPORTS[device].height,
          },
        }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({
          error: err.message,
          device: query.device,
        }));
      }
    });
    return;
  }

  // Batch screenshot endpoint
  if (pathname === '/screenshots' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { targetUrl, devices } = JSON.parse(body);
        
        if (!targetUrl) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'targetUrl required' }));
          return;
        }

        if (!Array.isArray(devices)) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'devices must be an array' }));
          return;
        }

        console.log(`[Request] Capturing ${devices.join(', ')} for ${targetUrl}`);
        
        const results = await Promise.all(
          devices.map(async (device) => {
            try {
              const screenshot = await captureScreenshot(targetUrl, device);
              return {
                device,
                success: true,
                screenshot,
                dimensions: {
                  width: DEVICE_VIEWPORTS[device].width,
                  height: DEVICE_VIEWPORTS[device].height,
                },
              };
            } catch (err) {
              return {
                device,
                success: false,
                error: err.message,
              };
            }
          })
        );

        res.writeHead(200);
        res.end(JSON.stringify({
          targetUrl,
          results,
        }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

/**
 * Start server
 */
async function start() {
  try {
    console.log('[Server] Starting screenshot server...');
    
    // Try to initialize browser, but don't fail if it does
    // The health check and scan endpoints will report the error
    console.log('[Server] Attempting to initialize browser...');
    initBrowser().catch(err => {
      // Silently catch - error is already logged above and stored in browserInitError
      // The health endpoint will report it as 'degraded'
    });
    
    // Start HTTP server immediately (don't wait for browser)
    server.listen(PORT, () => {
      console.log(`[Server] ✅ Screenshot server listening on http://localhost:${PORT}`);
      console.log('[Server] Available endpoints:');
      console.log('  GET  / - Health check');
      console.log('  POST /screenshot - Single screenshot');
      console.log('  POST /screenshots - Batch screenshots');
      console.log('  POST /scan - CLI scan endpoint');
    });
  } catch (err) {
    console.error('[Server] ❌ Critical error during startup:', err);
    process.exit(1);
  }
}

/**
 * Cleanup on exit
 */
process.on('SIGINT', async () => {
  console.log('[Server] Shutting down...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

start();
