# ViewPort-CLI Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
