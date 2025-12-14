import { DeviceType, DEVICE_VIEWPORTS, ViewportResult } from '../types/api';

/**
 * Screenshot Service
 * 
 * Primary Strategy: Puppeteer (for localhost development)
 * Fallback: Cloudflare Browser Rendering API (for deployed sites)
 * 
 * DESIGN DECISION:
 * ViewPort-CLI's main use case is screenshotting localhost websites during development.
 * Puppeteer is optimal for this: lightweight, fast, localhost-friendly, feature-rich.
 * Cloudflare API is kept as fallback for capturing already-deployed websites.
 */

interface ScreenshotServiceConfig {
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
  usePuppeteer?: boolean;
}

export class ScreenshotService {
  private config: ScreenshotServiceConfig;

  constructor(config: ScreenshotServiceConfig = {}) {
    this.config = config;
  }

  /**
   * Capture screenshot using Cloudflare Browser Rendering API
   */
  private async captureWithCloudflareAPI(
    targetUrl: string,
    device: DeviceType
  ): Promise<string> {
    const { cloudflareAccountId, cloudflareApiToken } = this.config;

    if (!cloudflareAccountId || !cloudflareApiToken) {
      throw new Error('Cloudflare credentials not configured');
    }

    const viewport = DEVICE_VIEWPORTS[device];
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/browser-rendering/screenshot`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetUrl,
          viewport: {
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: 1,
          },
          screenshotOptions: {
            fullPage: true,
            type: 'png',
          },
          gotoOptions: {
            waitUntil: 'networkidle0',
            timeout: 30000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Convert response to base64
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let base64 = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        base64 += String.fromCharCode(bytes[i]);
      }
      return btoa(base64);
    } catch (error) {
      console.error(`Cloudflare API error for ${device}:`, error);
      throw error;
    }
  }

  /**
   * Capture screenshot using Puppeteer (PRIMARY BACKEND)
   * Optimized for localhost development and deployed websites
   */
  private async captureWithPuppeteer(
    targetUrl: string,
    device: DeviceType
  ): Promise<string> {
    try {
      // Dynamic import to avoid issues in Cloudflare Workers environment
      const puppeteer = await import('puppeteer');
      const viewport = DEVICE_VIEWPORTS[device];

      const browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage', // Overcome limited resource problems
        ],
      });

      try {
        const page = await browser.newPage();

        await page.setViewport({
          width: viewport.width,
          height: viewport.height,
          deviceScaleFactor: 1,
        });

        // Navigate to target with network idle wait
        await page.goto(targetUrl, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        // Capture full-page screenshot as base64
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: true,
          encoding: 'base64',
        });

        await page.close();

        return typeof screenshot === 'string' ? screenshot : Buffer.from(screenshot).toString('base64');
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error(`Puppeteer error for ${device}:`, error);
      throw error;
    }
  }

  /**
   * Generate a mock screenshot for testing (when both Puppeteer and API unavailable)
   */
  private generateMockScreenshot(targetUrl: string, device: DeviceType): string {
    const viewport = DEVICE_VIEWPORTS[device];
    console.warn(`[MOCK] Generated mock screenshot for ${device} (${viewport.width}×${viewport.height})`);
    console.warn(`[MOCK] Target: ${targetUrl}`);
    console.warn(`[MOCK] For production: ensure Chrome is installed or provide Cloudflare credentials`);
    
    // Return a minimal valid PNG (1x1 transparent pixel)
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  /**
   * Capture screenshot with intelligent backend selection
   * Primary: Puppeteer (localhost)
   * Fallback: Cloudflare API (deployed sites)
   * Final fallback: Mock (testing)
   */
  async captureScreenshot(
    targetUrl: string,
    device: DeviceType
  ): Promise<ViewportResult> {
    const viewport = DEVICE_VIEWPORTS[device];
    let screenshotBase64: string;

    // PRIMARY: Try Puppeteer first (best for localhost)
    try {
      console.log(`Capturing ${device} with Puppeteer...`);
      screenshotBase64 = await this.captureWithPuppeteer(targetUrl, device);
      return {
        device,
        dimensions: {
          width: viewport.width,
          height: viewport.height,
        },
        screenshotBase64,
        issues: [],
      };
    } catch (puppeteerError) {
      console.warn(`Puppeteer failed for ${device}:`, puppeteerError);
    }

    // FALLBACK: Try Cloudflare API (for deployed sites)
    if (this.config.cloudflareAccountId && this.config.cloudflareApiToken) {
      try {
        console.log(`Falling back to Cloudflare API for ${device}...`);
        screenshotBase64 = await this.captureWithCloudflareAPI(targetUrl, device);
        return {
          device,
          dimensions: {
            width: viewport.width,
            height: viewport.height,
          },
          screenshotBase64,
          issues: [],
        };
      } catch (apiError) {
        console.warn(`Cloudflare API failed for ${device}:`, apiError);
      }
    }

    // FINAL FALLBACK: Mock (always works)
    console.warn(`Using mock screenshot for ${device} (testing mode)`);
    screenshotBase64 = this.generateMockScreenshot(targetUrl, device);
    return {
      device,
      dimensions: {
        width: viewport.width,
        height: viewport.height,
      },
      screenshotBase64,
      issues: [],
    };
  }

  /**
   * Capture all viewports
   */
  async captureAllViewports(
    targetUrl: string,
    devices: DeviceType[]
  ): Promise<ViewportResult[]> {
    const results: ViewportResult[] = [];

    for (const device of devices) {
      const result = await this.captureScreenshot(targetUrl, device);
      results.push(result);
    }

    return results;
  }
}

/**
 * Create a screenshot service instance with environment variables
 */
export function createScreenshotService(): ScreenshotService {
  return new ScreenshotService({
    cloudflareAccountId: (globalThis as any).__ENV?.CLOUDFLARE_ACCOUNT_ID,
    cloudflareApiToken: (globalThis as any).__ENV?.CLOUDFLARE_API_TOKEN,
    usePuppeteer: (globalThis as any).__ENV?.SCREENSHOT_BACKEND === 'puppeteer',
  });
}
