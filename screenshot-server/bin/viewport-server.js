#!/usr/bin/env node
/**
 * ViewPort Screenshot Server - CLI Entry Point
 * 
 * This is the main executable for the viewport-cli-server package.
 * 
 * Usage:
 *   viewport-server [--port 3001] [--detach]
 * 
 * Examples:
 *   viewport-server                    # Start on default port 3001
 *   viewport-server --port 4000        # Start on port 4000
 *   viewport-server --port 3001 --detach  # Start detached (background)
 */

const path = require('path');
const { spawn } = require('child_process');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    port: 3001,
    detach: false,
    help: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
      parsed.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--detach') {
      parsed.detach = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      parsed.help = true;
    }
  }
  
  return parsed;
}

function showHelp() {
  console.log(`
ViewPort Screenshot Server

Usage: viewport-server [OPTIONS]

Options:
  --port <PORT>     Port to run the server on (default: 3001)
  --detach          Run server in background (detached mode)
  --help, -h        Show this help message

Examples:
  viewport-server
  viewport-server --port 4000
  viewport-server --port 3001 --detach

For more information, visit: https://github.com/law-makers/viewport-cli
  `);
}

async function main() {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const indexPath = path.join(__dirname, '..', 'index.js');
  const serverArgs = ['index.js'];
  
  if (args.port && args.port !== 3001) {
    serverArgs.push('--port', String(args.port));
  }

  if (args.detach) {
    // Spawn detached (background) process
    const child = spawn('node', serverArgs, {
      cwd: path.join(__dirname, '..'),
      detached: true,
      stdio: 'ignore',
    });
    
    child.unref();
    console.log(`[Server] ✅ Server started in background on port ${args.port}`);
    process.exit(0);
  } else {
    // Spawn attached (foreground) process
    const child = spawn('node', serverArgs, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });

    // Handle cleanup
    process.on('SIGINT', () => {
      console.log('\n[Server] Shutting down...');
      child.kill('SIGINT');
    });

    child.on('exit', (code) => {
      process.exit(code);
    });
  }
}

main().catch((err) => {
  console.error('[Error]', err.message);
  process.exit(1);
});
