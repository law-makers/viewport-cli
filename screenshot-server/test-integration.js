#!/usr/bin/env node
/**
 * Comprehensive Integration Test
 * Tests all aspects of the refactored server package
 */

const path = require('path');
const { spawn } = require('child_process');

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   ViewPort CLI Server - Integration Test Suite     ║');
console.log('╚════════════════════════════════════════════════════╝\n');

const tests = [];
let passed = 0;
let failed = 0;

function addTest(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  for (const test of tests) {
    try {
      console.log(`📋 Testing: ${test.name}...`);
      await test.fn();
      console.log(`   ✅ PASS\n`);
      passed++;
    } catch (err) {
      console.log(`   ❌ FAIL: ${err.message}\n`);
      failed++;
    }
  }

  console.log('╔════════════════════════════════════════════════════╗');
  console.log(`║ Results: ${passed} passed, ${failed} failed${' '.repeat(19 + (1 - (failed + '').length))}║`);
  console.log('╚════════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Test 1: Package.json bin entry
addTest('package.json has bin entry', async () => {
  const pkg = require('./package.json');
  if (!pkg.bin || !pkg.bin['viewport-server']) {
    throw new Error('bin entry not found');
  }
  if (pkg.bin['viewport-server'] !== 'bin/viewport-server.js') {
    throw new Error(`bin entry points to wrong file: ${pkg.bin['viewport-server']}`);
  }
});

// Test 2: index.js has port parsing
addTest('index.js has --port CLI argument support', async () => {
  const fs = require('fs');
  const content = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  if (!content.includes('parseArgs') || !content.includes('--port')) {
    throw new Error('Port argument parsing not found');
  }
});

// Test 3: bin/viewport-server.js exists
addTest('bin/viewport-server.js exists and is executable', async () => {
  const fs = require('fs');
  const binPath = path.join(__dirname, 'bin', 'viewport-server.js');
  if (!fs.existsSync(binPath)) {
    throw new Error('bin/viewport-server.js not found');
  }
  const stat = fs.statSync(binPath);
  // Check if at least owner can execute
  if (!(stat.mode & parseInt('0100', 8))) {
    throw new Error('bin/viewport-server.js is not executable');
  }
});

// Test 4: lib/launcher.js exists with exports
addTest('lib/launcher.js exports all required functions', async () => {
  const launcher = require('./lib/launcher');
  const requiredFns = [
    'isServerRunning',
    'waitForServer',
    'spawnServer',
    'ensureServerRunning',
    'killServer',
    'findAvailablePort',
  ];
  
  for (const fn of requiredFns) {
    if (typeof launcher[fn] !== 'function') {
      throw new Error(`Missing export: ${fn}`);
    }
  }
});

// Test 5: Test isServerRunning detects down server
addTest('isServerRunning correctly detects down server', async () => {
  const { isServerRunning } = require('./lib/launcher');
  const result = await isServerRunning(9999, 1000);
  if (result !== false) {
    throw new Error('Should return false for inactive port');
  }
});

// Test 6: Test server startup with port argument
addTest('Server starts with --port argument on custom port', async () => {
  const { ensureServerRunning, killServer, isServerRunning } = require('./lib/launcher');
  
  try {
    const serverUrl = await ensureServerRunning(3004, true, false);
    if (!serverUrl.includes('3004')) {
      throw new Error(`Server URL doesn't contain port 3004: ${serverUrl}`);
    }
    
    // Verify server is actually running
    const isRunning = await isServerRunning(3004, 2000);
    if (!isRunning) {
      throw new Error('Server not responding on port 3004');
    }
    
    await killServer(3004);
  } catch (err) {
    throw err;
  }
});

// Test 7: Test findAvailablePort
addTest('findAvailablePort finds available port', async () => {
  const { findAvailablePort } = require('./lib/launcher');
  
  const port = await findAvailablePort(4000, 5);
  if (typeof port !== 'number' || port < 4000) {
    throw new Error(`Invalid port returned: ${port}`);
  }
});

// Test 8: Test viewport-server command help
addTest('viewport-server --help works', async () => {
  return new Promise((resolve, reject) => {
    // Try to use viewport-server from PATH first, fall back to direct script
    let child;
    
    // First try to spawn viewport-server from PATH
    child = spawn('viewport-server', ['--help'], { stdio: 'pipe' });
    let output = '';
    let hasError = false;

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (!hasError && (code === 0 || output.length > 0)) {
        if (output.includes('Usage') || output.includes('viewport-server') || output.includes('port')) {
          resolve();
        } else {
          reject(new Error('Help output missing expected content'));
        }
      } else if (!hasError) {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
      // If viewport-server not found, try using npx or node directly on the script
      hasError = true;
      
      const fs = require('fs');
      const scriptPath = path.join(__dirname, 'bin', 'viewport-server.js');
      
      if (fs.existsSync(scriptPath)) {
        // Try node script directly
        child = spawn('node', [scriptPath, '--help'], { stdio: 'pipe' });
        output = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0 || output.length > 0) {
            if (output.includes('Usage') || output.includes('viewport-server') || output.includes('port')) {
              resolve();
            } else {
              reject(new Error('Help output missing expected content'));
            }
          } else {
            reject(new Error(`Script failed with code ${code}`));
          }
        });

        child.on('error', reject);
      } else {
        reject(new Error('viewport-server not found in PATH or as script'));
      }
    });
  });
});

// Test 9: Integration test - ensure server running detects already running
addTest('ensureServerRunning detects already-running server', async () => {
  const { ensureServerRunning, killServer, isServerRunning } = require('./lib/launcher');
  
  // Start server
  const url1 = await ensureServerRunning(3005, true, false);
  
  // Verify it's running
  const running = await isServerRunning(3005, 1000);
  if (!running) {
    throw new Error('Server not running after ensureServerRunning');
  }
  
  // Call again - should detect and not spawn another
  const url2 = await ensureServerRunning(3005, true, false);
  
  if (url1 !== url2) {
    throw new Error('URLs should be identical for same port');
  }
  
  await killServer(3005);
});

// Test 10: Examples file structure
addTest('examples/launcher-example.js exists', async () => {
  const fs = require('fs');
  const exPath = path.join(__dirname, 'examples', 'launcher-example.js');
  if (!fs.existsSync(exPath)) {
    throw new Error('examples/launcher-example.js not found');
  }
});

// Run all tests
runTests().catch(console.error);
