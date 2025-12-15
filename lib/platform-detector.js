/**
 * Platform Detection Module
 * 
 * Detects the current operating system and architecture
 */

const os = require('os');

/**
 * Get current platform name
 * @returns {string} 'linux', 'darwin' (macOS), 'win32' (Windows), etc.
 */
function getPlatform() {
  return process.platform;
}

/**
 * Get current architecture
 * @returns {string} 'x64', 'arm64', 'x86', etc.
 */
function getArchitecture() {
  return process.arch;
}

/**
 * Get platform and architecture as a combined string
 * @returns {string} e.g., 'linux-x64', 'macos-arm64', 'windows-x64'
 */
function getPlatformIdentifier() {
  const platform = getPlatform();
  const arch = getArchitecture();

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
    return null;
  }

  return platformMap[platform][arch];
}

/**
 * Check if platform is supported
 * @returns {boolean}
 */
function isSupported() {
  return getPlatformIdentifier() !== null;
}

/**
 * Get human-readable platform name
 * @returns {string} e.g., 'Linux', 'macOS', 'Windows'
 */
function getReadablePlatformName() {
  const platform = getPlatform();
  const nameMap = {
    'linux': 'Linux',
    'darwin': 'macOS',
    'win32': 'Windows',
    'freebsd': 'FreeBSD'
  };
  return nameMap[platform] || platform;
}

/**
 * Get system information for debugging
 * @returns {object}
 */
function getSystemInfo() {
  return {
    platform: getPlatform(),
    architecture: getArchitecture(),
    platformIdentifier: getPlatformIdentifier(),
    readableName: getReadablePlatformName(),
    nodeVersion: process.version,
    isSupported: isSupported(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem()
  };
}

module.exports = {
  getPlatform,
  getArchitecture,
  getPlatformIdentifier,
  isSupported,
  getReadablePlatformName,
  getSystemInfo
};
