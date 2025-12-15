#!/usr/bin/env node

/**
 * System Dependencies Checker and Installer
 * 
 * Checks for missing system libraries required by Chromium
 * and attempts to install them automatically using sudo
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const symbols = {
  success: `${colors.green}✓${colors.reset}`,
  error: `${colors.red}✗${colors.reset}`,
  info: `${colors.cyan}ℹ${colors.reset}`,
  warn: `${colors.yellow}⚠${colors.reset}`
};

function log(msg, color = colors.reset) {
  console.log(color + msg + colors.reset);
}

function logInfo(msg) {
  console.log(`${symbols.info} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${symbols.success} ${msg}`);
}

function logWarn(msg) {
  console.log(`${symbols.warn} ${msg}`);
}

function logError(msg) {
  console.error(`${symbols.error} ${msg}`);
}

/**
 * Detect Linux distribution
 */
function detectDistro() {
  try {
    if (fs.existsSync('/etc/os-release')) {
      const content = fs.readFileSync('/etc/os-release', 'utf8');
      if (content.includes('ID=ubuntu') || content.includes('ID=debian')) {
        return 'debian';
      }
      if (content.includes('ID=fedora') || content.includes('ID=rhel') || content.includes('ID=centos')) {
        return 'fedora';
      }
      if (content.includes('ID=alpine')) {
        return 'alpine';
      }
    }
  } catch (err) {
    // Ignore
  }
  
  // Try lsb_release
  try {
    const output = execSync('lsb_release -si', { encoding: 'utf8', stdio: 'pipe' });
    if (output.includes('Ubuntu') || output.includes('Debian')) {
      return 'debian';
    }
  } catch (err) {
    // Ignore
  }

  return null;
}

/**
 * Check if a library is installed
 */
function isLibraryInstalled(libName) {
  try {
    execSync(`ldconfig -p | grep ${libName}`, { stdio: 'pipe' });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Install dependencies for Debian/Ubuntu
 */
function installDebianDeps() {
  const packages = [
    'libnss3',
    'libgdk-pixbuf2.0-0',
    'libgtk-3-0',
    'libxss1',
    'libgbm1',
    'libasound2',
    'libatk1.0-0',
    'libatk-bridge2.0-0'
  ];

  logInfo('Checking for required system libraries...');
  const missing = [];

  for (const pkg of packages) {
    if (!isLibraryInstalled(pkg.split('-')[0])) {
      missing.push(pkg);
    }
  }

  if (missing.length === 0) {
    logSuccess('All required system libraries are installed');
    return true;
  }

  logWarn(`Missing ${missing.length} system library(ies): ${missing.join(', ')}`);
  logInfo('Attempting to install missing dependencies...\n');

  try {
    const cmd = `sudo apt-get update && sudo apt-get install -y ${missing.join(' ')}`;
    execSync(cmd, { stdio: 'inherit', timeout: 5 * 60 * 1000 });
    logSuccess('System dependencies installed successfully');
    return true;
  } catch (err) {
    logError('Failed to install system dependencies automatically');
    logInfo('Please run this command manually:');
    console.log(`  sudo apt-get update`);
    console.log(`  sudo apt-get install -y ${missing.join(' ')}`);
    return false;
  }
}

/**
 * Install dependencies for Fedora/RHEL
 */
function installFedoraDeps() {
  const packages = [
    'nss',
    'libXss',
    'libgbm',
    'alsa-lib',
    'at-spi2-atk',
    'at-spi2-core'
  ];

  logInfo('Checking for required system libraries...');
  const missing = [];

  for (const pkg of packages) {
    if (!isLibraryInstalled(pkg.split('-')[0])) {
      missing.push(pkg);
    }
  }

  if (missing.length === 0) {
    logSuccess('All required system libraries are installed');
    return true;
  }

  logWarn(`Missing ${missing.length} system library(ies): ${missing.join(', ')}`);
  logInfo('Attempting to install missing dependencies...\n');

  try {
    const cmd = `sudo dnf install -y ${missing.join(' ')}`;
    execSync(cmd, { stdio: 'inherit', timeout: 5 * 60 * 1000 });
    logSuccess('System dependencies installed successfully');
    return true;
  } catch (err) {
    logError('Failed to install system dependencies automatically');
    logInfo('Please run this command manually:');
    console.log(`  sudo dnf install -y ${missing.join(' ')}`);
    return false;
  }
}

/**
 * Install dependencies for Alpine
 */
function installAlpineDeps() {
  const packages = [
    'chromium',
    'nss',
    'freetype',
    'harfbuzz',
    'ca-certificates'
  ];

  logInfo('Checking for required system packages...');
  try {
    const cmd = `apk add --no-cache ${packages.join(' ')}`;
    execSync(cmd, { stdio: 'inherit', timeout: 5 * 60 * 1000 });
    logSuccess('System dependencies installed successfully');
    return true;
  } catch (err) {
    logError('Failed to install system dependencies automatically');
    logInfo('Please run this command manually:');
    console.log(`  apk add --no-cache ${packages.join(' ')}`);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  // Skip if not on Linux
  if (process.platform !== 'linux') {
    // Skip on macOS and Windows - they have dependencies built in
    return;
  }

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   System Dependencies Check (ViewPort-CLI)         ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const distro = detectDistro();

  if (!distro) {
    logWarn('Could not detect Linux distribution');
    logInfo('If you encounter browser initialization errors, please install:');
    console.log('  - libnss3, libgtk-3-0, libxss1, libgbm1, libasound2');
    return;
  }

  logInfo(`Detected Linux distribution: ${distro}`);

  try {
    let success = false;

    switch (distro) {
      case 'debian':
        success = installDebianDeps();
        break;
      case 'fedora':
        success = installFedoraDeps();
        break;
      case 'alpine':
        success = installAlpineDeps();
        break;
      default:
        logWarn(`Unsupported distribution: ${distro}`);
        return;
    }

    if (success) {
      logSuccess('System dependencies are ready!');
      console.log('');
    } else {
      logError('Some dependencies could not be installed');
      console.log('');
    }
  } catch (err) {
    logError(`Error during dependency check: ${err.message}`);
    console.log('');
  }
}

// Only run if this is the postinstall phase and we're on Linux
if (process.argv[2] === '--silent') {
  // Silent mode - don't show output
  return;
}

main();
