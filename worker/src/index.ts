/**
 * ViewPort-CLI Backend Worker
 * Handles screenshot capture and analysis for responsive design auditing
 * 
 * ARCHITECTURE:
 * - Hono framework for HTTP handling
 * - ScreenshotService with Puppeteer as primary backend
 * - TypeScript strict mode for type safety
 * - Cloudflare Workers compatible (with nodejs_compat)
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { ScanRequest, ScanResponse } from './types/api';
import { ScreenshotService } from './services/screenshot';

const app = new Hono<{ Bindings: CloudflareBindings }>();

interface CloudflareBindings {
  BROWSER?: any;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  SCREENSHOT_BACKEND?: string;
}

// Health check endpoint
app.get('/', (c: Context) => {
  return c.json({
    status: 'ok',
    service: 'viewport-cli-worker',
    version: '0.1.0',
  });
});

// Main scan endpoint
app.post('/scan', async (c: Context<{ Bindings: CloudflareBindings }>) => {
  try {
    const body = await c.req.json() as ScanRequest;

    // Validate request
    if (!body.targetUrl || !body.viewports || body.viewports.length === 0) {
      return c.json(
        {
          error: 'Invalid request. Required fields: targetUrl, viewports[]',
        },
        { status: 400 }
      );
    }

    const scanId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Create screenshot service with environment variables
    const screenshotService = new ScreenshotService({
      cloudflareAccountId: c.env.CLOUDFLARE_ACCOUNT_ID,
      cloudflareApiToken: c.env.CLOUDFLARE_API_TOKEN,
      usePuppeteer: c.env.SCREENSHOT_BACKEND === 'puppeteer',
    });

    // Capture screenshots for all viewports
    const results = await screenshotService.captureAllViewports(
      body.targetUrl,
      body.viewports
    );

    const response: ScanResponse = {
      scanId,
      timestamp,
      status: 'SUCCESS',
      results,
      globalAnalysis: 'Screenshots captured successfully. AI analysis coming in Phase 4.',
    };

    return c.json(response);
  } catch (error) {
    console.error('Scan error:', error);
    return c.json(
      {
        error: 'Failed to process scan request',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});

// Handle 404s
app.notFound((c: Context) => {
  return c.json({ error: 'Not found' }, { status: 404 });
});

// Error handler
app.onError((err, c: Context) => {
  console.error('Worker error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
    },
    { status: 500 }
  );
});

export default app;
