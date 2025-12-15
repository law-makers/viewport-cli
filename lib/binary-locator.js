/**
 * Binary Locator Module
 * 
 * Locates and validates the correct pre-compiled binary for the current platform
 */

const path = require('path');
const fs = require('fs');
const platformDetector = require('./platform-detector');

/**
 * Get the path to the binary for the current platform
 * @returns {string} Absolute path to the binary
 */
function locateBinary() {
  const platformId = platformDetector.getPlatformIdentifier();
  
  if (!platformId) {
    throw new Error(
      `Unsupported platform: ${platformDetector.getReadablePlatformName()} ` +
      `(${platformDetector.getArchitecture()})`
    );
  }

  const isMsWindows = platformDetector.getPlatform() === 'win32';
  const ext = isMsWindows ? '.exe' : '';
  const binaryPath = path.join(
    __dirname,
    '..',
    'bin',
    'platform-binaries',
    platformId,
    `viewport-cli${ext}`
  );

  return binaryPath;
}

/**
 * Check if binary exists and is executable
 * @returns {boolean}
 */
function binaryExists() {
  try {
    const binaryPath = locateBinary();
    return fs.existsSync(binaryPath);
  } catch {
    return false;
  }
}

/**
 * Validate binary and get its properties
 * @returns {object} Binary properties and status
 */
function validateBinary() {
  try {
    const binaryPath = locateBinary();
    const platformId = platformDetector.getPlatformIdentifier();
    
    if (!fs.existsSync(binaryPath)) {
      return {
        valid: false,
        path: binaryPath,
        error: 'Binary file not found',
        platformId
      };
    }

    const stats = fs.statSync(binaryPath);
    
    // Check if executable (Unix-like systems)
    const isExecutable = (stats.mode & 0o111) !== 0 || 
                        platformDetector.getPlatform() === 'win32';

    return {
      valid: isExecutable && stats.isFile(),
      path: binaryPath,
      platformId,
      size: stats.size,
      mode: stats.mode,
      isExecutable,
      isFile: stats.isFile(),
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Get all available binaries (for debugging/info)
 * @returns {array} List of available binary platforms
 */
function listAvailableBinaries() {
  const binDir = path.join(__dirname, '..', 'bin', 'platform-binaries');
  
  if (!fs.existsSync(binDir)) {
    return [];
  }

  try {
    return fs.readdirSync(binDir).filter(dir => {
      const fullPath = path.join(binDir, dir);
      return fs.statSync(fullPath).isDirectory();
    });
  } catch {
    return [];
  }
}

module.exports = {
  locateBinary,
  binaryExists,
  validateBinary,
  listAvailableBinaries
};
