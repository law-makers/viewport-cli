import * as fs from 'fs';
import * as path from 'path';

/**
 * Screenshot Storage Utility
 * Handles saving captured screenshots and generating reports
 */

const RESULTS_DIR = path.join(process.cwd(), '..', 'viewport-results');
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, 'screenshots');
const REPORTS_DIR = path.join(RESULTS_DIR, 'reports');

/**
 * Initialize result directories
 */
export function initializeResultsDir(): void {
  try {
    if (!fs.existsSync(RESULTS_DIR)) {
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to initialize results directories:', error);
  }
}

/**
 * Save a screenshot to disk
 * @param screenshotBase64 Base64 encoded PNG data
 * @param filename Filename without extension (e.g., 'mobile-2025-12-14')
 * @returns Full path to saved file
 */
export function saveScreenshot(screenshotBase64: string, filename: string): string {
  try {
    initializeResultsDir();

    const filepath = path.join(SCREENSHOTS_DIR, `${filename}.png`);
    const buffer = Buffer.from(screenshotBase64, 'base64');
    fs.writeFileSync(filepath, buffer);

    return filepath;
  } catch (error) {
    console.error('Failed to save screenshot:', error);
    throw error;
  }
}

/**
 * Save scan report (JSON)
 * @param report Report data
 * @param filename Filename without extension
 * @returns Full path to saved file
 */
export function saveReport(report: any, filename: string): string {
  try {
    initializeResultsDir();

    const filepath = path.join(REPORTS_DIR, `${filename}.json`);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    return filepath;
  } catch (error) {
    console.error('Failed to save report:', error);
    throw error;
  }
}

/**
 * Generate a unique filename with timestamp
 * @param prefix Prefix (e.g., 'scan')
 * @returns Filename without extension
 */
export function generateFilename(prefix: string = 'scan'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}-${timestamp}`;
}

/**
 * List all saved screenshots
 */
export function listScreenshots(): string[] {
  try {
    initializeResultsDir();
    return fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  } catch (error) {
    console.error('Failed to list screenshots:', error);
    return [];
  }
}

/**
 * Get screenshot directory path
 */
export function getScreenshotsDir(): string {
  return SCREENSHOTS_DIR;
}

/**
 * Get reports directory path
 */
export function getReportsDir(): string {
  return REPORTS_DIR;
}
