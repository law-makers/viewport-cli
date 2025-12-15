#!/usr/bin/env node

/**
 * ViewPort-CLI Shim
 * 
 * This script detects the current OS and architecture, then launches
 * the appropriate pre-compiled Go binary with all arguments forwarded.
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Color codes for output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

/**
 * Detect platform and architecture
 */
function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  const platformMap = {
    'linux': {
      'x64': 'linux-x64',
      'arm64': 'linux-arm64'
    },
    'darwin': {
      'x64': 'macos-x64',
      'arm64': 'macos-arm64'
    },
    'win32': {
      'x64': 'windows-x64'
    }
  };

  if (!platformMap[platform] || !platformMap[platform][arch]) {
    console.error(
      `${colors.red}✗${colors.reset} ViewPort-CLI is not supported on ${platform}-${arch}\n` +
      `\nSupported platforms:\n` +
      `  • Linux (x64, arm64)\n` +
      `  • macOS (x64, arm64)\n` +
      `  • Windows (x64)\n\n` +
      `For issues: https://github.com/law-makers/viewport-cli/issues`
    );
    process.exit(1);
  }

  return {
    platform,
    arch,
    binName: platformMap[platform][arch]
  };
}

/**
 * Find and validate binary path
 */
function locateBinary(binName, platform) {
  const ext = platform === 'win32' ? '.exe' : '';
  const binaryPath = path.join(
    __dirname,
    'platform-binaries',
    binName,
    `viewport-cli${ext}`
  );

  if (!fs.existsSync(binaryPath)) {
    console.error(
      `${colors.red}✗${colors.reset} ViewPort-CLI binary not found for ${binName}\n\n` +
      `Expected location: ${binaryPath}\n\n` +
      `This may happen if:\n` +
      `  1. Installation was incomplete\n` +
      `  2. You're using an unsupported platform\n` +
      `  3. There was an error during npm install\n\n` +
      `Try reinstalling: npm install viewport-cli\n` +
      `For help: https://github.com/law-makers/viewport-cli/issues`
    );
    process.exit(1);
  }

  return binaryPath;
}

/**
 * Launch the Go binary with all arguments
 */
function launchBinary(binaryPath) {
  // Forward all command-line arguments to the binary
  const args = process.argv.slice(2);

  // Spawn the binary with inherited stdio (shows output directly)
  const child = spawn(binaryPath, args, {
    stdio: 'inherit',
    shell: true // Windows compatibility
  });

  // Handle exit
  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle errors
  child.on('error', (err) => {
    console.error(
      `${colors.red}✗${colors.reset} Failed to run viewport-cli: ${err.message}`
    );
    process.exit(1);
  });
}

/**
 * Main entry point
 */
function main() {
  try {
    const { platform, arch, binName } = detectPlatform();
    const binaryPath = locateBinary(binName, platform);
    launchBinary(binaryPath);
  } catch (error) {
    console.error(
      `${colors.red}✗${colors.reset} ViewPort-CLI initialization failed: ${error.message}`
    );
    process.exit(1);
  }
}

main();
