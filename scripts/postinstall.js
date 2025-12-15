#!/usr/bin/env node

/**
 * PostInstall Script for ViewPort-CLI
 * 
 * Runs automatically after npm install to:
 * 1. Detect platform and architecture
 * 2. Make the binary executable (Unix-like systems)
 * 3. Install screenshot server dependencies
 * 4. Verify installation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
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

/**
 * Log message with color
 */
function log(msg, color = colors.reset) {
  console.log(color + msg + colors.reset);
}

/**
 * Log info message
 */
function logInfo(msg) {
  console.log(`${symbols.info} ${msg}`);
}

/**
 * Log success message
 */
function logSuccess(msg) {
  console.log(`${symbols.success} ${msg}`);
}

/**
 * Log warning message
 */
function logWarn(msg) {
  console.log(`${symbols.warn} ${msg}`);
}

/**
 * Log error message
 */
function logError(msg) {
  console.error(`${symbols.error} ${msg}`);
}

/**
 * Detect platform
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

  if (!platformMap[platform]) {
    return null;
  }

  return platformMap[platform][arch] || null;
}

/**
 * Make binary executable
 */
function makeBinaryExecutable(platformId) {
  const platform = process.platform;
  
  // Windows doesn't need chmod
  if (platform === 'win32') {
    return true;
  }

  try {
    const binaryPath = path.join(
      __dirname,
      '..',
      'bin',
      'platform-binaries',
      platformId,
      'viewport-cli'
    );

    if (!fs.existsSync(binaryPath)) {
      logWarn(`Binary not found: ${binaryPath}`);
      return false;
    }

    fs.chmodSync(binaryPath, 0o755);
    logSuccess(`Made binary executable: bin/platform-binaries/${platformId}/viewport-cli`);
    return true;
  } catch (error) {
    logError(`Failed to make binary executable: ${error.message}`);
    return false;
  }
}

/**
 * Install screenshot server dependencies
 */
function installServerDependencies() {
  try {
    const serverDir = path.join(__dirname, '..', 'screenshot-server');
    
    if (!fs.existsSync(serverDir)) {
      logWarn('Screenshot server directory not found');
      return false;
    }

    logInfo('Installing screenshot server dependencies...');
    
    // Use npm ci if package-lock exists, otherwise npm install
    const packageLock = path.join(serverDir, 'package-lock.json');
    const command = fs.existsSync(packageLock) ? 'npm ci' : 'npm install';
    
    execSync(command, {
      cwd: serverDir,
      stdio: 'inherit',
      timeout: 5 * 60 * 1000 // 5 minute timeout
    });

    logSuccess('Screenshot server dependencies installed');
    return true;
  } catch (error) {
    logError(`Failed to install screenshot server dependencies: ${error.message}`);
    return false;
  }
}

/**
 * Verify installation
 */
function verifyInstallation(platformId) {
  try {
    const binaryPath = path.join(
      __dirname,
      '..',
      'bin',
      'platform-binaries',
      platformId,
      process.platform === 'win32' ? 'viewport-cli.exe' : 'viewport-cli'
    );

    if (!fs.existsSync(binaryPath)) {
      logError('Binary not found after installation');
      return false;
    }

    const serverDir = path.join(__dirname, '..', 'screenshot-server');
    const indexJs = path.join(serverDir, 'index.js');
    
    if (!fs.existsSync(indexJs)) {
      logError('Screenshot server not found');
      return false;
    }

    logSuccess('Installation verified successfully!');
    return true;
  } catch (error) {
    logError(`Verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Check and install system dependencies for Chromium
 */
function installSystemDependencies() {
  // Detect Linux distribution
  const osRelease = getOsRelease();
  
  if (!osRelease) {
    logWarn('Could not detect Linux distribution');
    return;
  }

  const packages = getRequiredPackages(osRelease.id);
  
  if (!packages) {
    logInfo(`Distribution ${osRelease.id} not directly supported for automatic dependency installation`);
    return;
  }

  // Check if sudo is available
  try {
    execSync('which sudo', { stdio: 'ignore' });
  } catch (e) {
    logWarn('sudo not found - cannot automatically install system dependencies');
    return;
  }

  // Try to install dependencies
  try {
    logInfo(`Installing system dependencies for ${osRelease.name}...`);
    
    if (osRelease.id === 'ubuntu' || osRelease.id === 'debian') {
      execSync('sudo apt-get update -qq', { stdio: 'pipe' });
      execSync(`sudo apt-get install -y -qq ${packages.join(' ')}`, { stdio: 'pipe' });
      logSuccess('System dependencies installed successfully');
    } else if (osRelease.id === 'fedora' || osRelease.id === 'rhel' || osRelease.id === 'centos') {
      execSync(`sudo yum install -y -q ${packages.join(' ')}`, { stdio: 'pipe' });
      logSuccess('System dependencies installed successfully');
    } else if (osRelease.id === 'alpine') {
      execSync(`sudo apk add --no-cache -q ${packages.join(' ')}`, { stdio: 'pipe' });
      logSuccess('System dependencies installed successfully');
    }
  } catch (error) {
    logWarn(`Could not automatically install system dependencies: ${error.message}`);
    logInfo('You can install them manually. See INSTALL.md for instructions.');
  }
}

/**
 * Parse /etc/os-release to detect Linux distribution
 */
function getOsRelease() {
  try {
    const content = fs.readFileSync('/etc/os-release', 'utf-8');
    const lines = content.split('\n');
    const data = {};
    
    for (const line of lines) {
      const [key, value] = line.split('=');
      if (key && value) {
        data[key.toLowerCase()] = value.replace(/"/g, '');
      }
    }
    
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Get required packages for specific Linux distribution
 */
function getRequiredPackages(distro) {
  const packages = {
    ubuntu: [
      'libnss3',
      'libgdk-pixbuf2.0-0',
      'libgtk-3-0',
      'libxss1',
      'libgbm1',
      'libasound2',
      'libatk1.0-0',
      'libatk-bridge2.0-0',
      'libgconf-2-4'
    ],
    debian: [
      'libnss3',
      'libgdk-pixbuf2.0-0',
      'libgtk-3-0',
      'libxss1',
      'libgbm1',
      'libasound2',
      'libatk1.0-0',
      'libatk-bridge2.0-0',
      'libgconf-2-4'
    ],
    fedora: [
      'nss',
      'libXss',
      'libgbm',
      'alsa-lib',
      'at-spi2-atk',
      'at-spi2-core',
      'libgconf-2'
    ],
    rhel: [
      'nss',
      'libXss',
      'libgbm',
      'alsa-lib',
      'at-spi2-atk',
      'at-spi2-core',
      'libgconf-2'
    ],
    centos: [
      'nss',
      'libXss',
      'libgbm',
      'alsa-lib',
      'at-spi2-atk',
      'at-spi2-core',
      'libgconf-2'
    ],
    alpine: [
      'chromium',
      'nss',
      'freetype',
      'harfbuzz',
      'ca-certificates'
    ]
  };
  
  return packages[distro] || null;
}

/**
 * Main installation flow
 */
function main() {
  try {
    console.log('');
    log('📦 ViewPort-CLI Installation', colors.cyan + colors.dim);
    console.log('');

    // 1. Detect platform
    const platformId = detectPlatform();
    
    if (!platformId) {
      logError(
        `Unsupported platform: ${process.platform}-${process.arch}\n\n` +
        'Supported platforms:\n' +
        '  • Linux x64/arm64\n' +
        '  • macOS x64/arm64\n' +
        '  • Windows x64\n'
      );
      process.exit(1);
    }

    logSuccess(`Platform detected: ${process.platform}-${process.arch} (${platformId})`);

    // 2. Make binary executable
    if (!makeBinaryExecutable(platformId)) {
      logWarn('Could not set binary executable - continuing anyway');
    }

    // 3. Install server dependencies
    if (!installServerDependencies()) {
      logWarn('Could not install screenshot server dependencies - you may need to install manually later');
    }

    // 3b. Install system dependencies for Chromium (Linux only)
    if (process.platform === 'linux') {
      logInfo('Checking for system dependencies...');
      installSystemDependencies();
    }

    // 4. Verify installation
    if (!verifyInstallation(platformId)) {
      logWarn('Installation verification failed');
    }

    console.log('');
    log('✨ Setup complete!', colors.green);
    console.log('');
    logInfo('You can now use viewport-cli:');
    console.log(colors.dim + '  npx viewport-cli scan --target http://localhost:3000' + colors.reset);
    console.log('');
    logInfo('For more information:');
    console.log(colors.dim + '  npx viewport-cli scan --help' + colors.reset);
    console.log('');

  } catch (error) {
    logError(`Installation failed: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run installation
main();
