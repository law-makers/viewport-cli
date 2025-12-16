#!/usr/bin/env node
/**
 * Local Screenshot Server
 * 
 * Runs Playwright with Firefox for local development.
 * Works out-of-box in all environments (local, Codespaces, IDX, etc.)
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
const { firefox } = require('playwright');

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
let serverInstance = null; // Track HTTP server for graceful shutdown

/**
 * Initialize browser with Playwright
 */
async function initBrowser() {
  if (browser) return browser;
  if (browserInitError) throw browserInitError;
  
  try {
    console.log('[Browser] Starting Playwright with Firefox...');
    
    browser = await firefox.launch({
      headless: true,
    });
    
    console.log('[Browser] ✅ Firefox browser initialized\n');
    return browser;
  } catch (err) {
    browserInitError = err;
    console.error('[Browser] ❌ Failed to initialize Firefox:', err.message);
    console.error('[Browser] This typically means system dependencies are missing.');
    console.error('[Browser] Solution: npx playwright install --with-deps firefox');
    throw err;
  }
}

/**
 * Capture screenshot with Playwright
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
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    // Navigate to target with timeout
    console.log(`[Screenshot] Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: 'load',
      timeout: 30000,
    });

    console.log(`[Screenshot] Taking screenshot for ${device}...`);
    // Take screenshot as base64 PNG
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
    });
    
    // Validate screenshot was actually captured
    if (!screenshotBuffer || screenshotBuffer.length === 0) {
      throw new Error(`Screenshot capture returned empty buffer for ${device} - page may not have loaded correctly`);
    }
    
    const screenshotBase64 = screenshotBuffer.toString('base64');

    // Validate base64 is not empty
    if (!screenshotBase64 || screenshotBase64.length === 0) {
      throw new Error(`Failed to encode screenshot as base64 for ${device}`);
    }

    console.log(`[Screenshot] Screenshot captured for ${device} (${screenshotBuffer.length} bytes)`);
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
            help: 'Firefox failed to initialize. This usually means the Firefox binary download failed or system is incompatible. ' +
                  'Try: npm install --force or check internet connection.',
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
        
        // Check if any results have actual screenshots
        const hasValidScreenshots = results.some(r => r.screenshotBase64 && r.screenshotBase64.length > 0);
        const hasErrors = results.some(r => r.error);
        
        // If all screenshots failed or are empty, return 500 with errors
        if (!hasValidScreenshots && hasErrors) {
          const errorMsg = results.map(r => r.error).filter(e => e).join('; ');
          res.writeHead(500);
          res.end(JSON.stringify({ 
            error: 'All screenshots failed: ' + errorMsg,
            results: results 
          }));
          return;
        }
        
        if (!hasValidScreenshots) {
          res.writeHead(500);
          res.end(JSON.stringify({ 
            error: 'No valid screenshots captured - all buffers were empty',
            results: results 
          }));
          return;
        }
        
        // Convert to CLI response format
        const response = {
          scanId: `scan-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: hasErrors ? 'partial' : 'complete',
          results: results,  // Keep all results, including errors for debugging
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
    
    // Initialize browser BEFORE starting server
    // This ensures the browser is ready when requests come in
    console.log('[Server] Attempting to initialize Firefox...');
    try {
      await initBrowser();
    } catch (err) {
      // Error is already logged and stored in browserInitError
      // Continue and start server - endpoints will report the error
      console.error('[Server] ⚠️  Browser initialization failed, server will report errors to clients');
    }
    
    // Start HTTP server (after browser init attempt)
    serverInstance = server.listen(PORT, () => {
      console.log(`[Server] ✅ Screenshot server listening on http://localhost:${PORT}`);
      console.log('[Server] Available endpoints:');
      console.log('  GET  / - Health check');
      console.log('  POST /screenshot - Single screenshot');
      console.log('  POST /screenshots - Batch screenshots');
      console.log('  POST /scan - CLI scan endpoint');
    });

    // Handle server errors
    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] ❌ Port ${PORT} is already in use`);
        console.error(`[Server] Try: lsof -ti:${PORT} | xargs kill -9 || true`);
      } else {
        console.error('[Server] ❌ Server error:', err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('[Server] ❌ Critical error during startup:', err);
    process.exit(1);
  }
}

/**
 * Cleanup on exit
 */
async function cleanup() {
  console.log('[Server] Shutting down...');
  
  if (browser) {
    try {
      await browser.close();
    } catch (err) {
      console.error('[Server] Error closing browser:', err.message);
    }
  }
  
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

start();
