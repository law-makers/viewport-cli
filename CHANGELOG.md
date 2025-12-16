# ViewPort-CLI Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-16

### Changed
- **Browser Engine Migration**: Switched from Puppeteer + Chromium to Playwright + Firefox
  - No system dependencies required (previously needed 6+ packages on Linux)
  - Works out-of-the-box in GitHub Codespaces, Google IDX, and restricted environments
  - Firefox binaries are pre-built and self-contained (~100MB, cached locally)
  - Automatic browser setup on first run, no manual configuration needed

### Improved
- **CLI Error Handling**: Enhanced error messages with diagnostics
  - Shows target URL, API server, viewports, and output directory on failure
  - Automatically stops screenshot server on error to prevent port conflicts
  - Clear error logs for troubleshooting

- **Package Size**: Reduced from 167 to 92 npm packages (-45%)
  - Simplified dependency tree
  - Faster installation times

- **Cross-Platform Support**: Works on macOS, Linux (all distros), Windows
  - Docker containers
  - CI/CD pipelines without system package installation

### Fixed
- **Port Cleanup**: Added graceful port cleanup on server shutdown
- **Browser Initialization**: Firefox initializes reliably across all environments

## [1.0.8] - 2025-12-15

### Fixed
- **Browser Init Error Handling**: Fixed undefined `browserInitError` variable reference in scan endpoint
  - Server now properly tracks and reports browser initialization errors
  - Returns 503 with detailed error message when Chromium fails to initialize
  - Prevents "browserInitError is not defined" CLI error
  - Helps users understand why browser initialization failed

## [1.0.7] - 2025-12-15

### Fixed
- **Chromium Binary Auto-Download**: Screenshot server now ensures Chromium binary is available before initializing browser
  - Prevents "Failed to launch browser process" errors when binary not yet downloaded
  - Automatically downloads Chromium on first server startup if not present
  - Better error messages when Chromium unavailable or @sparticuz/chromium not installed
  
- **Health Check Accuracy**: Server now reports browser readiness status
  - Returns HTTP 503 (degraded) if browser not yet initialized
  - Go CLI correctly handles 503 as valid response and waits for browser
  - Eliminates false positive "server ready" when browser still initializing
  - Prevents race condition where scan fails before browser is ready

### Improved
- **Server Initialization**: Clear logging of Chromium availability checks during startup
- **Reliability**: Better handling of Chromium binary lifecycle

## [1.0.6] - 2025-12-15

### Fixed
- **Health Check Logic**: Server now correctly handles browser initialization failures
  - Go CLI now accepts 503 status as valid health check (server is running but browser init failed)
  - Previously would timeout waiting for 200 when browser failed to init
  - Now provides proper error feedback with installation instructions
  
- **CLI Error Display**: Improved error reporting when screenshot capture fails
  - Parse server error responses to extract human-readable messages
  - Display error details with help text in CLI console
  - No more raw JSON error responses in terminal
  - Added JSON parsing for error responses with `error`, `message`, and `help` fields

### Improved
- **Error Messages**: Users now see helpful installation instructions when dependencies are missing
- **Server Feedback**: Better communication between server and CLI about browser readiness

## [1.0.5] - 2025-12-15

### Added
- **Automatic System Dependency Installation**: Postinstall script now automatically detects and installs missing Chromium system libraries on Linux
  - Detects Linux distribution from `/etc/os-release`
  - Ubuntu/Debian: Automatically installs libnss3, libgtk-3-0, libxss1, libgbm1, libasound2, etc.
  - Fedora/RHEL/CentOS: Automatically installs nss, libXss, libgbm, alsa-lib, etc.
  - Alpine Linux: Automatically installs chromium, nss, freetype, harfbuzz, ca-certificates
  - Uses sudo when necessary for package installation
  - Gracefully handles permission issues

### Changed
- **Installation Experience**: Zero-config installation now handles system dependencies
  - No manual `apt-get install` commands required
  - No need to debug "libnss3 not found" errors
  - Users just `npm install viewport-cli` and it works

### Improved
- **User Convenience**: Installation is now truly one-command on Linux

## [1.0.4] - 2025-12-15

### Fixed
- **Graceful Server Startup with Missing System Dependencies**: Server now starts successfully even if Chromium fails to initialize
  - Server HTTP endpoint opens immediately for health checks
  - Browser initialization happens asynchronously in background
  - Health check endpoint (`GET /`) reports browser status accurately (200 OK if ready, 503 if degraded)
  - Scan endpoint provides detailed error messages when browser init fails
  - Go CLI now successfully detects server startup and can report helpful errors
  - Includes instructions for installing missing system libraries (libnss3, libgtk-3-0, etc.)

### Added
- **Comprehensive System Dependencies Documentation**
  - Added Ubuntu/Debian installation instructions
  - Added Fedora/RHEL installation instructions
  - Added Alpine Linux installation instructions
  - Troubleshooting guide for "libnss3 not found" error
  - Clear error messages guide users to solution

### Improved
- **Better Error Reporting**: Browser initialization errors are now properly captured and reported
  - Server responds with helpful error messages on scan failure
  - Health check endpoint indicates degraded state vs full outage
  - Error messages include library names and installation commands

## [1.0.3] - 2025-12-15

### Fixed
- **Test Suite Compatibility**: Fixed `viewport-server --help` test that was failing on systems where viewport-server is not in PATH
  - Test now intelligently tries multiple methods to find and execute viewport-server
  - Falls back to direct script execution if command not found
  - Handles both npm-installed and development scenarios
- **Package.json Bin Entries**: Ensured both CLI and server have proper bin entries for npm package
  - Both `viewport-cli` and `viewport-server` commands now properly exposed in PATH
  - Enables seamless inter-process communication between Go CLI and Node.js server

### Improved
- **Test Robustness**: Integration tests now handle edge cases in development and production environments

## [1.0.2] - 2025-12-15

### Fixed
- **Auto-Start Server on npm Installation**: Fixed issue where `viewport-server` command was not found in PATH
  - Added `viewport-server` bin entry to package.json
  - Created `bin/viewport-server.js` launcher script for npm-installed packages
  - Enhanced server startup logic in Go CLI with multiple fallback methods:
    - Direct `viewport-server` command (from PATH)
    - `npx viewport-server` (if viewport-server not directly available)
    - Relative path resolution for development mode
  - Now automatically starts screenshot server on `viewport-cli scan` command
  - Works correctly on fresh npm installations across all platforms

### Changed
- **Server Startup Process**: Improved resilience and compatibility
  - Go CLI now uses intelligent command resolution
  - Falls back to npx if viewport-server not in PATH
  - Better error reporting

## [1.0.1] - 2025-12-15

### Added
- **NPM Publication**: First official publish to npm registry
  - All 5 platform binaries included
  - Cross-platform support verified
  - Installation flow tested

### Fixed
- **Build System**: Enhanced cross-platform compilation
  - Platform detection for local vs CI/CD builds
  - Graceful error handling in multi-platform builds
  - BUILD_ALL_PLATFORMS environment variable for CI/CD

## [1.0.0] - 2025-12-15

### Added
- **NPM Package Distribution**: ViewPort-CLI now available as single NPM package
  - Install with: `npm install viewport-cli`
  - Use with: `npx viewport-cli scan --target http://localhost:3000`
- **Auto-Start Screenshot Server**: CLI automatically starts server if not running
  - No manual server management needed
  - Health checks ensure server readiness
- **Cross-Platform Support**: Pre-compiled binaries for multiple platforms
  - Linux (x64, arm64)
  - macOS (x64, arm64)
  - Windows (x64)
- **NPM Binary Shim**: Node.js wrapper that detects OS and launches correct binary
  - Automatic platform detection
  - Fallback error handling
  - Cross-platform compatibility
- **Postinstall Scripts**: Automatic setup on installation
  - Detects platform and architecture
  - Sets binary executable permissions
  - Installs screenshot server dependencies
  - Verifies installation
- **GitHub Actions CI/CD Pipeline**: Automated building and publishing
  - Multi-platform binary compilation
  - Checksum generation
  - Installation testing
  - Automated NPM publishing
- **Helper Libraries**: Node.js modules for integration
  - `lib/platform-detector.js`: OS/architecture detection
  - `lib/binary-locator.js`: Binary location and validation
- **Comprehensive Documentation**
  - INSTALL.md: Installation and troubleshooting guide
  - CONTRIBUTING.md: Development and build instructions
  - NPM_PUBLISH_PLAN.md: Complete publishing strategy
  - Updated README.md with NPM distribution info
- **Development Scripts**
  - `scripts/compile-binaries.sh`: Multi-platform build script
  - `scripts/postinstall.js`: Installation setup
  - `scripts/verify-install.js`: Installation verification

### Changed
- **Package Structure**: Reorganized for NPM distribution
  - Root package.json as main entry point
  - screenshot-server/ for Node.js components
  - bin/ for executables and shims
  - lib/ for helper modules
  - scripts/ for build and installation
- **Installation Experience**: Simplified from manual steps to single command
  - Before: `cd server && npm install && npm link` + build CLI
  - After: `npm install viewport-cli` (fully automated)

### Dependencies
- Added: puppeteer-core, @sparticuz/chromium, express
- Removed: (all handled in screenshot-server/)
- Updated: All to latest compatible versions

### Under the Hood
- Server Manager: Go package for lifecycle management
  - Auto-detection of running servers
  - Health checks with timeout protection
  - Graceful shutdown with SIGTERM fallback
- CLI Integration: Automatic server setup before scanning
  - Signal handling for Ctrl+C
  - Error recovery with fallback modes
- Process Management: Improved cleanup and resource handling

## [0.2.0] - 2025-11-15

### Added
- **Server Auto-Start Functionality**
  - Auto-detect running server
  - Spawn server if needed with health checks
  - Graceful cleanup after scan
  - Custom port support
- **Go CLI Server Manager**
  - New `pkg/server/manager.go` package
  - Server lifecycle methods (Start, Stop, IsRunning)
  - Health check polling with timeout
- **New CLI Flags**
  - `--server-port`: Custom screenshot server port
  - `--no-auto-start`: Skip automatic server startup

### Changed
- **Scan Command**: Updated `cmd/scan.go` with server integration
  - Auto-starts server before scanning
  - Health checks before proceeding
  - Signal handling for graceful shutdown
  - Improved error messages

### Fixed
- Port conflict handling with automatic detection
- Server readiness verification before scanning

## [0.1.0] - 2025-10-01

### Added
- **Initial Release** (Source code only)
  - Go CLI with Cobra framework
  - Node.js screenshot server with Puppeteer
  - Multiple viewport support (mobile, tablet, desktop)
  - Local configuration file management
  - Results listing and viewing
  - Test website for development

### Features
- Capture screenshots at multiple viewports
- Real Chrome rendering with Puppeteer
- localhost development server support
- Metadata and PNG output
- Configuration file management
- Results history tracking

### Architecture
- Modular design: Separate CLI and server
- HTTP API for communication
- Graceful error handling
- Terminal UI with colored output

---

## Roadmap

### Phase 2 (v1.1.0) - Planned
- [ ] Viewport preset configurations
- [ ] Custom viewport sizes
- [ ] Configuration per-project
- [ ] Results comparison between scans
- [ ] Viewport-specific CSS analysis
- [ ] Performance metrics

### Phase 3 (v2.0.0) - Planned
- [ ] AI-powered analysis with Google Gemini
- [ ] Automated responsive design issue detection
- [ ] Smart recommendations for fixes
- [ ] Visual diff comparison
- [ ] CI/CD pipeline integration
- [ ] GitHub Actions integration
- [ ] GitLab CI integration
- [ ] Jenkins plugin

### Future Enhancements
- [ ] Binary caching across projects
- [ ] Offline mode with pre-cached Chrome
- [ ] Auto-update mechanism
- [ ] Plugin system for custom analyzers
- [ ] REST API server mode
- [ ] Docker image distribution
- [ ] Snap package (Linux)
- [ ] Homebrew formula (macOS)
- [ ] Chocolatey package (Windows)

---

## Migration Guides

### From 0.2.0 to 1.0.0 (NPM Distribution)

**Old Way**:
```bash
# Clone repo
git clone https://github.com/law-makers/viewport-cli.git
cd viewport-cli

# Manual setup
cd server && npm install && npm link
cd ../cli && go build -o viewport-cli main.go

# Run
./viewport-cli scan --target http://localhost:3000
```

**New Way**:
```bash
# Single installation
npm install viewport-cli

# Run immediately
npx viewport-cli scan --target http://localhost:3000
```

### Uninstalling Previous Installation

```bash
# If you had the npm linked version
npm uninstall -g viewport-server

# Remove local installation
rm -rf ~/path/to/viewport-cli
```

---

## Support

For questions or issues:
- 🐛 [Report bugs](https://github.com/law-makers/viewport-cli/issues)
- 💬 [Ask questions](https://github.com/law-makers/viewport-cli/discussions)
- 📖 [Read documentation](https://github.com/law-makers/viewport-cli)

---

**Last Updated**: December 15, 2025
