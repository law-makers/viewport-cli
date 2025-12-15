#!/usr/bin/env node

/**
 * ViewPort Server Launcher
 * 
 * This script is called by the Go CLI to start the screenshot server.
 * It resolves the actual server path and launches it with the provided arguments.
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Get the screenshot server directory (should be in the installed npm package)
const serverDir = path.join(__dirname, '..', 'screenshot-server');
const serverIndexPath = path.join(serverDir, 'index.js');

// Check if server directory exists
if (!fs.existsSync(serverDir)) {
  console.error('Error: Screenshot server not found');
  console.error(`Expected directory: ${serverDir}`);
  process.exit(1);
}

// Check if index.js exists
if (!fs.existsSync(serverIndexPath)) {
  console.error('Error: Screenshot server index.js not found');
  console.error(`Expected file: ${serverIndexPath}`);
  process.exit(1);
}

// Forward all arguments to the server
const args = process.argv.slice(2);

try {
  // Spawn node process with the server
  const server = spawn('node', [serverIndexPath, ...args], {
    stdio: 'inherit',
    cwd: serverDir
  });

  // Handle process signals
  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    server.kill('SIGINT');
    process.exit(0);
  });

  // Exit when child process exits
  server.on('exit', (code) => {
    process.exit(code);
  });

  // Handle errors
  server.on('error', (err) => {
    console.error('Failed to start screenshot server:', err);
    process.exit(1);
  });
} catch (error) {
  console.error('Error launching screenshot server:', error);
  process.exit(1);
}
