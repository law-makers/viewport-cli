# NPM Publishing Plan

## Overview
This document outlines the publishing strategy for `viewport-cli` on npm.

## Publishing Process

### Pre-Publication
1. **Version Management**: Use `npm version` for semantic versioning
   - Major releases: New features, breaking changes
   - Minor releases: New features, backward compatible
   - Patch releases: Bug fixes

2. **Build & Test**
   - Run `npm run build` to compile all platform binaries (5 platforms)
   - Run `npm test` to verify integration tests pass (10/10)
   - Run `npm run verify` to check all requirements (30/30)

3. **Documentation**
   - Update CHANGELOG.md with release notes
   - Update README.md if needed
   - Update INSTALL.md for any new installation requirements

### Publication
```bash
npm publish
```

This publishes the package to npm with:
- Precompiled Go binaries for all platforms
- Node.js screenshot server with dependencies
- Postinstall script for system dependency setup
- All documentation files

## Version History

### Current Release: v1.0.6
- **Status**: Published ✅
- **Features**:
  - Auto-install system dependencies for Chromium
  - Improved health check logic (accept 503 when browser init fails)
  - Better CLI error handling with human-readable messages
  - 5 platform binaries (Linux x64/arm64, macOS x64/arm64, Windows x64)
  - Zero-friction installation and setup

### Previous Releases
- v1.0.5: System dependency auto-installation
- v1.0.4: Graceful error handling
- v1.0.3: Cross-platform test fixes
- v1.0.2: Server auto-start mechanism
- v1.0.1: Initial npm publication
- v1.0.0: Initial development release

## Post-Publication
1. **Testing**: Install on fresh system to verify:
   - Correct binary platform detection
   - System dependencies auto-installed
   - Server auto-starts
   - Screenshots captured successfully

2. **Community Communication**:
   - Announce release on project channels
   - Highlight major features/fixes
   - Document migration steps if needed

3. **Issue Tracking**:
   - Monitor GitHub issues for problems
   - Respond to user feedback
   - Plan fixes for next release

## File Structure Published
```
viewport-cli/
├── bin/
│   ├── cli.js                        # CLI entry point
│   ├── viewport-server.js            # Server launcher
│   └── platform-binaries/            # Precompiled binaries
│       ├── linux-x64/viewport-cli
│       ├── linux-arm64/viewport-cli
│       ├── macos-x64/viewport-cli
│       ├── macos-arm64/viewport-cli
│       └── windows-x64/viewport-cli.exe
├── lib/                              # JavaScript utilities
├── screenshot-server/                # Node.js server code
├── scripts/                          # Build & postinstall scripts
├── package.json                      # Package metadata
├── README.md                         # Main documentation
├── INSTALL.md                        # Installation guide
├── CHANGELOG.md                      # Version history
└── LICENSE                           # MIT License
```

## Distribution Details
- **Package Size**: ~78MB tarball
- **Extracted Size**: ~300MB+ with all binaries and dependencies
- **Dependencies**:
  - puppeteer-core: Browser automation
  - @sparticuz/chromium: Pre-built browser binary
  - go-resty: HTTP client for Go
  - cobra: CLI framework for Go

## Known Limitations
- Chromium requires system libraries on Linux (auto-installed by postinstall)
- Browser initialization may fail on systems without required dependencies
- Large package size due to precompiled binaries

## Future Improvements
- Consider distributing binaries separately to reduce package size
- Add more platform-specific pre-built binaries
- Improve health check with browser readiness verification
- Add Windows/macOS system dependency checks
