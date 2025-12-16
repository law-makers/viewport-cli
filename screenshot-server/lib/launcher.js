/**
 * ViewPort Server Launcher - Auto-start Helper
 * 
 * This module provides utilities to:
 * - Check if the screenshot server is running on a specific port
 * - Auto-spawn the server if it's not running
 * - Wait for the health check endpoint
 * - Kill the server process when done
 * - Kill any process holding a port (for cleanup)
 * 
 * Usage:
 *   const { ensureServerRunning, killServer } = require('./lib/launcher');
 *   
 *   const serverUrl = await ensureServerRunning(3001);
 *   // Use serverUrl for API calls
 *   await killServer(3001);
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');

let serverProcess = null;

/**
 * Kill any process using a specific port (cross-platform)
 * @param {number} port - Port to kill
 * @returns {Promise<void>}
 */
async function killPortProcess(port) {
  return new Promise((resolve) => {
    try {
      if (process.platform === 'win32') {
        // Windows
        execSync(`netstat -ano | findstr :${port} | findstr LISTENING | for /F "tokens=5" %a in ('findstr.exe /R /C:".*"') do taskkill /PID %a /F`, { stdio: 'ignore' });
      } else {
        // Unix/Linux/macOS
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      }
    } catch (err) {
      // Process might not exist, that's ok
    }
    resolve();
  });
}

/**
 * Check if server is running on specified port by hitting health check endpoint
 * @param {number} port - Port to check
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<boolean>}
 */
async function isServerRunning(port, timeout = 5000) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, timeout);

    const options = {
      hostname: 'localhost',
      port,
      path: '/',
      method: 'GET',
      timeout: timeout,
    };

    const req = http.request(options, (res) => {
      clearTimeout(timeoutId);
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.on('data', () => {});
      res.on('end', () => {});
    });

    req.on('error', () => {
      clearTimeout(timeoutId);
      resolve(false);
    });

    req.end();
  });
}

/**
 * Wait for server health check endpoint to be ready
 * @param {number} port - Port to check
 * @param {number} maxAttempts - Maximum attempts (default: 30)
 * @param {number} delayMs - Delay between attempts (default: 1000)
 * @returns {Promise<boolean>}
 */
async function waitForServer(port, maxAttempts = 30, delayMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    const running = await isServerRunning(port, 2000);
    if (running) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

/**
 * Spawn the screenshot server as a child process
 * @param {number} port - Port to run server on
 * @param {boolean} silent - Whether to suppress output (default: false)
 * @returns {Promise<ChildProcess>}
 */
async function spawnServer(port, silent = true) {
  return new Promise((resolve, reject) => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    const args = [];
    
    if (port && port !== 3001) {
      args.push('--port', String(port));
    }

    try {
      serverProcess = spawn('node', [indexPath, ...args], {
        cwd: path.join(__dirname, '..'),
        stdio: silent ? ['ignore', 'ignore', 'pipe'] : 'inherit',
        detached: false,
      });

      serverProcess.on('error', (err) => {
        reject(new Error(`Failed to spawn server: ${err.message}`));
      });

      // Capture stderr even in silent mode to detect errors
      if (silent && serverProcess.stderr) {
        serverProcess.stderr.on('data', (data) => {
          // Log to debug but don't reject - let health check determine if server is up
          console.error(`[Server stderr] ${data}`);
        });
      }

      // Listen for unexpected exits
      serverProcess.on('exit', (code, signal) => {
        if (code !== null && code !== 0) {
          console.error(`[Server] Process exited with code ${code}`);
        }
      });

      // Give process a moment to start
      setTimeout(() => {
        resolve(serverProcess);
      }, 100);
    } catch (err) {
      reject(new Error(`Failed to spawn server: ${err.message}`));
    }
  });
}

/**
 * Ensure the screenshot server is running on the specified port
 * 
 * If the server is not running:
 * 1. Spawn a new server process
 * 2. Wait for health check endpoint to respond
 * 3. Return the server URL
 * 
 * @param {number} port - Port to ensure server is running on (default: 3001)
 * @param {boolean} autoStart - Whether to auto-spawn if not running (default: true)
 * @param {boolean} verbose - Whether to log output (default: false)
 * @returns {Promise<string>} Server URL (e.g., 'http://localhost:3001')
 */
async function ensureServerRunning(port = 3001, autoStart = true, verbose = false) {
  const serverUrl = `http://localhost:${port}`;

  // Check if already running
  if (verbose) {
    console.log(`[Launcher] Checking if server is running on port ${port}...`);
  }

  const alreadyRunning = await isServerRunning(port, 2000);
  
  if (alreadyRunning) {
    if (verbose) {
      console.log(`[Launcher] ✅ Server already running on ${serverUrl}`);
    }
    return serverUrl;
  }

  if (!autoStart) {
    throw new Error(
      `Server is not running on port ${port}. Set autoStart=true to spawn it automatically.`
    );
  }

  if (verbose) {
    console.log(`[Launcher] ⏳ Server not running. Starting on port ${port}...`);
  }

  // Spawn server
  await spawnServer(port, !verbose);

  // Wait for server to be ready
  if (verbose) {
    console.log(`[Launcher] ⏳ Waiting for server health check...`);
  }

  const serverReady = await waitForServer(port, 60, 500);

  if (!serverReady) {
    throw new Error(
      `Server failed to start or health check timed out on port ${port}`
    );
  }

  if (verbose) {
    console.log(`[Launcher] ✅ Server is ready on ${serverUrl}`);
  }

  return serverUrl;
}

/**
 * Kill the server process and cleanup the port if needed
 * @param {number} port - Port the server is running on (for logging)
 * @returns {Promise<void>}
 */
async function killServer(port = 3001) {
  return new Promise((resolve) => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.on('exit', () => {
        // After process exits, also kill any other processes on this port
        killPortProcess(port).then(resolve);
      });
      serverProcess.kill('SIGINT');
      
      // Force kill after 2 seconds if graceful shutdown fails
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        // Also kill any other processes on this port
        killPortProcess(port).then(resolve);
      }, 2000);
    } else {
      // Even if no process tracked, kill anything listening on this port
      killPortProcess(port).then(resolve);
    }
  });
}

/**
 * Find an available port starting from the given port
 * @param {number} startPort - Starting port (default: 3001)
 * @param {number} maxAttempts - Maximum ports to check (default: 10)
 * @returns {Promise<number>} First available port
 */
async function findAvailablePort(startPort = 3001, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const isRunning = await isServerRunning(port, 500);
    if (!isRunning) {
      // Double check by trying to bind to the port
      return new Promise((resolve) => {
        const server = require('http').createServer();
        server.listen(port, 'localhost', () => {
          server.close(() => {
            resolve(port);
          });
        });
        server.on('error', () => {
          resolve(findAvailablePort(startPort + i + 1, maxAttempts - i - 1));
        });
      });
    }
  }
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts}`);
}

module.exports = {
  isServerRunning,
  waitForServer,
  spawnServer,
  ensureServerRunning,
  killServer,
  killPortProcess,
  findAvailablePort,
};
