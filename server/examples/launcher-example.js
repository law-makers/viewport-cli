#!/usr/bin/env node
/**
 * Example: Using the launcher in your main CLI
 * 
 * This demonstrates how to use the auto-start server launcher
 * from your main viewport-cli to spawn the server automatically.
 */

const { ensureServerRunning, killServer, findAvailablePort } = require('../lib/launcher');

async function example() {
  console.log('\n=== ViewPort Server Launcher Example ===\n');

  try {
    // Example 1: Simple auto-start on default port
    console.log('Example 1: Auto-start on default port 3001');
    const serverUrl = await ensureServerRunning(3001, true, true);
    console.log(`Server URL: ${serverUrl}\n`);

    // Example 2: Find available port
    console.log('Example 2: Find an available port starting from 3001');
    const availablePort = await findAvailablePort(3001, 10);
    console.log(`Available port: ${availablePort}\n`);

    // Example 3: Ensure server on specific port
    console.log('Example 3: Ensure server on port 3003');
    const server3003 = await ensureServerRunning(3003, true, true);
    console.log(`Server running on: ${server3003}\n`);

    // Example 4: Cleanup (would be done after scan completes)
    console.log('Example 4: Cleaning up server...');
    console.log('(Server processes would be killed here after scan completes)\n');

    console.log('✅ All examples completed successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  example().catch(console.error);
}

module.exports = { example };
