#!/usr/bin/env node
/**
 * Node.js Wrapper for ViewPort CLI Server Integration
 * 
 * This example shows how to integrate the auto-start server
 * into your main viewport-cli CLI tool.
 * 
 * This could be invoked from your Go CLI or run directly.
 */

const { ensureServerRunning, killServer, findAvailablePort } = require('../lib/launcher');
const http = require('http');

/**
 * Perform a full scan with auto-managed server
 * @param {string} targetUrl - URL to scan (e.g., http://localhost:3000)
 * @param {Object} options - Configuration options
 * @param {number} options.port - Server port (default: 3001)
 * @param {boolean} options.verbose - Log output (default: true)
 * @param {string[]} options.viewports - Viewports to test
 * @returns {Promise<Object>} Scan results
 */
async function performScan(targetUrl, options = {}) {
  const {
    port = 3001,
    verbose = true,
    viewports = ['mobile', 'tablet', 'desktop'],
  } = options;

  let serverUrl;
  
  try {
    // Step 1: Ensure server is running
    if (verbose) console.log(`\n🎯 Starting scan for: ${targetUrl}`);
    if (verbose) console.log(`📡 Ensuring server on port ${port}...\n`);
    
    serverUrl = await ensureServerRunning(port, true, verbose);
    
    if (verbose) console.log(`✅ Server ready: ${serverUrl}\n`);

    // Step 2: Perform the scan
    if (verbose) console.log(`📸 Capturing screenshots: ${viewports.join(', ')}...`);
    
    const response = await fetch(`${serverUrl}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl,
        viewports,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const results = await response.json();
    
    if (verbose) {
      console.log(`✅ Scan complete!\n`);
      console.log(`📊 Results:`);
      console.log(`  - Scan ID: ${results.scanId}`);
      console.log(`  - Status: ${results.status}`);
      console.log(`  - Devices: ${results.results.length}`);
      
      results.results.forEach(r => {
        if (!r.error) {
          console.log(`    - ${r.device}: ${r.dimensions.width}x${r.dimensions.height}`);
        }
      });
    }

    return results;

  } catch (err) {
    console.error(`\n❌ Scan failed: ${err.message}`);
    throw err;
  } finally {
    // Step 3: Always cleanup
    if (serverUrl && verbose) {
      console.log(`\n🧹 Cleaning up server...`);
    }
    
    try {
      await killServer(port);
      if (verbose) console.log(`✅ Server stopped\n`);
    } catch (killErr) {
      console.warn(`⚠️ Warning: Failed to stop server: ${killErr.message}`);
    }
  }
}

/**
 * Scan multiple URLs in parallel
 * @param {string[]} urls - URLs to scan
 * @param {Object} options - Options (see performScan)
 * @returns {Promise<Object[]>} Array of results
 */
async function parallelScans(urls, options = {}) {
  const { verbose = true } = options;
  
  if (verbose) {
    console.log(`\n🔀 Scanning ${urls.length} URLs in parallel...`);
  }

  const portStart = options.portStart || 3001;
  const ports = [];
  
  // Allocate a port for each URL
  for (let i = 0; i < urls.length; i++) {
    ports.push(portStart + i);
  }

  try {
    // Start all servers
    const serverUrls = await Promise.all(
      ports.map(port => ensureServerRunning(port, true, false))
    );

    // Perform all scans
    const results = await Promise.all(
      urls.map((url, i) => {
        const serverUrl = serverUrls[i];
        return performScanWithUrl(url, serverUrl, options.viewports || ['mobile', 'tablet', 'desktop']);
      })
    );

    return results;
  } finally {
    // Cleanup all servers
    await Promise.all(ports.map(port => killServer(port)));
  }
}

async function performScanWithUrl(url, serverUrl, viewports) {
  const response = await fetch(`${serverUrl}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUrl: url, viewports }),
  });

  if (!response.ok) {
    throw new Error(`Scan failed for ${url}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Find and use an available port automatically
 */
async function scanWithAutoPort(targetUrl, options = {}) {
  const { verbose = true } = options;
  
  if (verbose) console.log(`\n🔍 Finding available port...`);
  
  const port = await findAvailablePort(3001, 10);
  
  if (verbose) console.log(`✅ Using port ${port}\n`);
  
  return performScan(targetUrl, { ...options, port, verbose });
}

// Example usage
async function main() {
  // Example 1: Single URL scan
  console.log('='.repeat(60));
  console.log('Example 1: Single URL Scan');
  console.log('='.repeat(60));
  
  try {
    await performScan('http://google.com', {
      port: 3001,
      verbose: true,
      viewports: ['mobile', 'desktop'],
    });
  } catch (err) {
    console.error('Scan error:', err.message);
  }
}

// Export for use in other modules
module.exports = {
  performScan,
  parallelScans,
  scanWithAutoPort,
};

// Run examples if executed directly
if (require.main === module) {
  main().catch(console.error);
}
