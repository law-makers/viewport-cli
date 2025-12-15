# ViewPort-CLI: NPM Package Publishing Plan

**Goal**: Package ViewPort-CLI as a single NPM package that installs CLI + server with one command: `npm install viewport-cli`

**End User Experience**:
```bash
npm install viewport-cli
npx viewport-cli scan --target http://localhost:3000
# ✅ Works immediately, zero manual setup needed
```

## 1. Current State Analysis

### What We Have
- ✅ Go CLI binary (13MB, compiled, working)
- ✅ Node.js screenshot server (fully functional, NPM-ready)
- ✅ Auto-start/server manager integration (complete)
- ✅ Comprehensive documentation (5+ guides)
- ✅ Test suite passing (10/10 tests)

### What's Missing
- ❌ NPM package root structure
- ❌ Binary distribution strategy (Go CLI for multiple OSes)
- ❌ Postinstall scripts to set up server
- ❌ CLI entry points in package.json
- ❌ Cross-platform binary management
- ❌ NPM registry publishing setup
- ❌ Version management strategy

## 2. NPM Package Structure Design

### Directory Layout

```
viewport-cli/ (root - becomes NPM package)
│
├── package.json                    (MAIN NPM MANIFEST - root level)
│   ├── name: "viewport-cli"
│   ├── version: "1.0.0"
│   ├── bin: { "viewport-cli": "bin/cli.js" }
│   ├── dependencies: { screenshot server deps }
│   └── postinstall: script to place binaries
│
├── bin/
│   ├── cli.js                      (SHIM - wrapper for Go binary)
│   │   └── Detects OS/arch
│   │   └── Invokes correct binary
│   │   └── Falls back gracefully
│   │
│   └── platform-binaries/
│       ├── linux-x64/
│       │   └── viewport-cli       (Go binary for Linux)
│       ├── macos-x64/
│       │   └── viewport-cli       (Go binary for macOS Intel)
│       ├── macos-arm64/
│       │   └── viewport-cli       (Go binary for macOS ARM/M1)
│       ├── windows-x64/
│       │   └── viewport-cli.exe   (Go binary for Windows)
│       └── freebsd-x64/
│           └── viewport-cli       (Go binary for FreeBSD)
│
├── screenshot-server/              (Node.js server - bundled)
│   ├── index.js
│   ├── lib/
│   │   └── launcher.js
│   ├── bin/
│   │   └── viewport-server.js
│   ├── package.json               (server's own package.json)
│   ├── node_modules/              (installed during npm postinstall)
│   └── ... (all server files)
│
├── lib/
│   ├── server-manager.js           (Node.js helper for auto-start)
│   ├── platform-detector.js        (Detect OS/arch)
│   └── binary-locator.js           (Find correct binary)
│
├── scripts/
│   ├── postinstall.js              (Runs after npm install)
│   ├── compile-binaries.sh         (Build script for CI/CD)
│   └── setup-server.js             (Install server dependencies)
│
├── cli/                            (Source - not distributed)
│   ├── main.go
│   └── ... (all CLI source)
│
├── server/                         (Source - bundled as screenshot-server/)
│   └── ... (copy of server files)
│
├── package.json                    (ROOT - this is what users install)
├── package-lock.json
├── README.md
├── LICENSE
└── .npmignore                      (Exclude source, only include binaries)
```

## 3. Binary Distribution Strategy

### 3.1 Pre-Compiled Binaries

Build Go binary for all major platforms:

```bash
# Supported Platforms (Build Matrix)
GOOS=linux GOARCH=amd64       → linux-x64/viewport-cli
GOOS=linux GOARCH=arm64       → linux-arm64/viewport-cli
GOOS=darwin GOARCH=amd64      → macos-x64/viewport-cli
GOOS=darwin GOARCH=arm64      → macos-arm64/viewport-cli
GOOS=windows GOARCH=amd64     → windows-x64/viewport-cli.exe
GOOS=freebsd GOARCH=amd64     → freebsd-x64/viewport-cli
```

### 3.2 Binary Size Optimization

Current: 13MB per binary

Options to reduce:
1. **UPX Compression**: Compress binary to ~4-5MB
   ```bash
   upx --best --lzma bin/platform-binaries/linux-x64/viewport-cli
   ```

2. **Strip Symbols**: Remove debug symbols (~2MB savings)
   ```bash
   go build -ldflags="-s -w"
   ```

3. **Result**: Compressed + stripped = ~6-8MB per binary, ~40MB total for all platforms

### 3.3 Binary Verification

Sign binaries with checksums:

```bash
sha256sum linux-x64/viewport-cli > checksums.sha256
# Verify on install:
sha256sum -c checksums.sha256
```

## 4. Installation Flow (postinstall Script)

### 4.1 What Happens After `npm install viewport-cli`

```
┌─────────────────────────────────────┐
│ npm install viewport-cli            │
└────────────┬────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│ NPM downloads package from registry                  │
│ Extracts to node_modules/viewport-cli/              │
└────────────┬─────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│ postinstall script runs:                             │
│ node scripts/postinstall.js                          │
└────────────┬─────────────────────────────────────────┘
             │
             ├─→ 1. Detect OS/Architecture
             │      (linux-x64, macos-arm64, etc)
             │
             ├─→ 2. Make binary executable
             │      chmod +x bin/platform-binaries/*/viewport-cli
             │
             ├─→ 3. Install screenshot server deps
             │      cd screenshot-server && npm install
             │
             ├─→ 4. Create symlink (optional)
             │      ./bin/cli.js → viewport-cli command
             │
             └─→ 5. Verify installation
                   Run: ./viewport-cli --version
                   
             ▼
┌──────────────────────────────────────────────────────┐
│ ✅ Installation complete!                            │
│                                                      │
│ User can now run:                                    │
│ npx viewport-cli scan --target http://localhost:3000 │
└──────────────────────────────────────────────────────┘
```

### 4.2 postinstall.js Script

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Setting up ViewPort-CLI...\n');

// 1. Detect platform
const platform = process.platform;
const arch = process.arch;
const platformMap = {
  'linux': 'linux-x64',
  'darwin': process.arch === 'arm64' ? 'macos-arm64' : 'macos-x64',
  'win32': 'windows-x64'
};
const binName = platformMap[platform];

if (!binName) {
  console.error(`❌ ViewPort-CLI not supported on ${platform}-${arch}`);
  process.exit(1);
}

console.log(`✓ Detected platform: ${platform}-${arch}`);

// 2. Make binary executable
const binaryPath = path.join(__dirname, '..', 'bin', 'platform-binaries', binName, 
  platform === 'win32' ? 'viewport-cli.exe' : 'viewport-cli');

if (!fs.existsSync(binaryPath)) {
  console.error(`❌ Binary not found: ${binaryPath}`);
  process.exit(1);
}

if (platform !== 'win32') {
  fs.chmodSync(binaryPath, 0o755);
  console.log(`✓ Made binary executable: ${binaryPath}`);
}

// 3. Install screenshot server
console.log('\n✓ Installing screenshot server dependencies...');
try {
  const serverDir = path.join(__dirname, '..', 'screenshot-server');
  execSync('npm install', { cwd: serverDir, stdio: 'inherit' });
  console.log('✓ Screenshot server dependencies installed');
} catch (error) {
  console.error('❌ Failed to install screenshot server');
  process.exit(1);
}

console.log('\n✅ ViewPort-CLI installed successfully!');
console.log('\nUsage:');
console.log('  npx viewport-cli scan --target http://localhost:3000');
console.log('\nDocumentation: https://github.com/law-makers/viewport-cli');
```

## 5. Shim Script (bin/cli.js)

Creates a Node.js wrapper that launches the correct Go binary:

```javascript
#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Detect platform and architecture
const platform = process.platform;
const arch = process.arch;

const platformMap = {
  'linux': 'linux-x64',
  'darwin': arch === 'arm64' ? 'macos-arm64' : 'macos-x64',
  'win32': 'windows-x64'
};

const binName = platformMap[platform];
if (!binName) {
  console.error(`❌ ViewPort-CLI not supported on ${platform}-${arch}`);
  process.exit(1);
}

// Locate binary
const ext = platform === 'win32' ? '.exe' : '';
const binaryPath = path.join(
  __dirname,
  'platform-binaries',
  binName,
  `viewport-cli${ext}`
);

if (!fs.existsSync(binaryPath)) {
  console.error(`❌ Binary not found: ${binaryPath}`);
  process.exit(1);
}

// Spawn Go binary with all arguments
const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error(`❌ Error running viewport-cli: ${err.message}`);
  process.exit(1);
});
```

## 6. Root package.json Configuration

```json
{
  "name": "viewport-cli",
  "version": "1.0.0",
  "description": "Responsive design auditing tool - capture screenshots across multiple viewports",
  "keywords": ["responsive", "design", "testing", "screenshots", "cli", "puppeteer"],
  "author": "law-makers",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/law-makers/viewport-cli.git"
  },
  "homepage": "https://github.com/law-makers/viewport-cli",
  "bugs": {
    "url": "https://github.com/law-makers/viewport-cli/issues"
  },
  
  "type": "module",
  "main": "lib/index.js",
  "bin": {
    "viewport-cli": "bin/cli.js"
  },
  
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  
  "scripts": {
    "postinstall": "node scripts/postinstall.js",
    "build": "node scripts/compile-binaries.sh",
    "test": "npm test --prefix screenshot-server",
    "prepublishOnly": "npm run build && npm run test",
    "clean": "rm -rf bin/platform-binaries/* screenshot-server/node_modules"
  },
  
  "dependencies": {
    "puppeteer-core": "^24.0.0",
    "@sparticuz/chromium": "^131.0.0",
    "express": "^4.18.0"
  },
  
  "devDependencies": {
    "eslint": "^9.0.0"
  },
  
  "files": [
    "bin/",
    "lib/",
    "scripts/",
    "screenshot-server/",
    "LICENSE",
    "README.md",
    "CHANGELOG.md",
    "checksums.sha256"
  ]
}
```

## 7. .npmignore File

```
# Source code (not needed for distributed package)
cli/
server/
test-server/
PLAN.md
SETUP_GUIDE.md
PHASE3_PROPOSAL.md

# Build/dev files
*.md.bak
.git
.github
.gitignore
.eslintrc
.prettierrc
tsconfig.json
go.mod
go.sum

# Node modules (will be reinstalled)
screenshot-server/node_modules/
node_modules/

# Tests
**/*.test.js
**/*.spec.js
__tests__/
coverage/

# OS files
.DS_Store
thumbs.db
```

## 8. Building & Publishing Workflow

### 8.1 Build Matrix (GitHub Actions / CI/CD)

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'  # Only build on version tags

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            goos: linux
            goarch: amd64
            output: bin/platform-binaries/linux-x64/viewport-cli
          
          - os: ubuntu-latest
            goos: linux
            goarch: arm64
            output: bin/platform-binaries/linux-arm64/viewport-cli
          
          - os: macos-latest
            goos: darwin
            goarch: amd64
            output: bin/platform-binaries/macos-x64/viewport-cli
          
          - os: macos-latest-xlarge  # ARM runner
            goos: darwin
            goarch: arm64
            output: bin/platform-binaries/macos-arm64/viewport-cli
          
          - os: windows-latest
            goos: windows
            goarch: amd64
            output: bin/platform-binaries/windows-x64/viewport-cli.exe
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.20'
      
      - name: Build binary
        env:
          GOOS: ${{ matrix.goos }}
          GOARCH: ${{ matrix.goarch }}
        run: |
          mkdir -p $(dirname ${{ matrix.output }})
          cd cli && go build -ldflags="-s -w" -o ../${{ matrix.output }} main.go
      
      - name: Compress binary (non-Windows)
        if: matrix.goos != 'windows'
        run: |
          sudo apt-get install -y upx || brew install upx
          upx --best --lzma ${{ matrix.output }}
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: viewport-cli-${{ matrix.goos }}-${{ matrix.goarch }}
          path: ${{ matrix.output }}
  
  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Download all artifacts
        uses: actions/download-artifact@v3
      
      - name: Organize binaries
        run: |
          mkdir -p bin/platform-binaries/{linux-x64,linux-arm64,macos-x64,macos-arm64,windows-x64}
          mv viewport-cli-linux-amd64/* bin/platform-binaries/linux-x64/
          mv viewport-cli-linux-arm64/* bin/platform-binaries/linux-arm64/
          mv viewport-cli-darwin-amd64/* bin/platform-binaries/macos-x64/
          mv viewport-cli-darwin-arm64/* bin/platform-binaries/macos-arm64/
          mv viewport-cli-windows-amd64/* bin/platform-binaries/windows-x64/
      
      - name: Create checksums
        run: |
          cd bin/platform-binaries
          find . -type f -name "viewport-cli*" | xargs sha256sum > ../../checksums.sha256
      
      - name: Publish to NPM
        uses: JS-DevTools/npm-publish@v2
        with:
          token: ${{ secrets.NPM_TOKEN }}
```

### 8.2 Manual Publishing Steps

```bash
# 1. Prepare version
npm version patch  # or minor, major
# Updates package.json, creates tag

# 2. Build binaries
npm run build
# Compiles Go CLI for all platforms

# 3. Verify installation
npm pack  # Creates tarball locally
npm install ./viewport-cli-1.0.0.tgz
npx viewport-cli scan --help

# 4. Publish to NPM
npm publish

# 5. Verify publication
npm info viewport-cli
npm view viewport-cli dist-tags
```

## 9. Installation & Usage Experience

### User Journey (After Publishing)

**Step 1: Install**
```bash
npm install viewport-cli
# Output:
# npm notice created a lockfile as package-lock.json
# added 156 packages, removed 72 packages in 3s
# 
# > viewport-cli@1.0.0 postinstall /node_modules/viewport-cli
# 📦 Setting up ViewPort-CLI...
# ✓ Detected platform: darwin-arm64
# ✓ Made binary executable
# ✓ Installing screenshot server dependencies...
# ✓ Screenshot server dependencies installed
# ✅ ViewPort-CLI installed successfully!
```

**Step 2: Use**
```bash
npx viewport-cli scan --target http://localhost:3000
# ✅ Automatic server startup
# 📸 Screenshots captured
# ✅ Results saved!
```

**Step 3: Global Install (Optional)**
```bash
npm install -g viewport-cli
viewport-cli scan --target http://localhost:3000
```

### No Manual Steps Required
✅ Binary selection automatic  
✅ Server dependencies auto-installed  
✅ Binary permissions auto-set  
✅ Server auto-starts on first scan  
✅ Everything works immediately

## 10. Testing & Validation Strategy

### 10.1 Pre-Release Testing

```bash
# 1. Local tarball test
npm pack
npm install /path/to/viewport-cli-1.0.0.tgz

# 2. Verify all platforms
# Test on:
# - Linux (Ubuntu, Debian)
# - macOS (Intel, ARM)
# - Windows (WSL, native)

# 3. Test scenarios
npx viewport-cli scan --help
npx viewport-cli scan --target http://localhost:3000
npx viewport-cli results list
npx viewport-cli config show
```

### 10.2 GitHub Actions CI/CD

Runs on every commit:
```yaml
- Lint (eslint, go fmt)
- Unit tests (server)
- Build (Go binaries for all platforms)
- Integration test (npm install + npx command)
- Security scan (SNYK)
```

## 11. Versioning Strategy

### Semantic Versioning

```
1.0.0
│ │ └─ Patch: Bug fixes
│ └─── Minor: New features (backward compatible)
└───── Major: Breaking changes
```

**Release Schedule**:
- 1.0.0 - Initial NPM release
- 1.0.x - Bug fixes only
- 1.1.0 - Minor features (viewport presets, config options)
- 2.0.0 - Major refactor (AI analysis, Phase 3)

### Changelog Management

```
CHANGELOG.md
├── [1.0.0] - 2025-12-15
│   ├── Added: NPM package distribution
│   ├── Added: Auto-start server
│   ├── Fixed: Port conflict handling
│   └── Changed: Binary distribution strategy
└── [0.1.0] - 2025-11-01
    └── Initial release (source only)
```

## 12. Dependency Management

### Root Dependencies (viewport-cli package)

**Only runtime dependencies needed**:
- puppeteer-core: ~2MB
- @sparticuz/chromium: Auto-installs on first use
- express: ~50KB

All other deps handled by screenshot-server's own package.json

### Size Analysis

```
npm install viewport-cli total size:

Binaries (all platforms):          ~40MB
├── linux-x64:                     ~8MB
├── linux-arm64:                   ~8MB
├── macos-x64:                     ~8MB
├── macos-arm64:                   ~8MB
└── windows-x64:                   ~8MB

Node modules (runtime):            ~150MB
├── puppeteer-core:                ~2MB
├── @sparticuz/chromium:           ~120MB (first install)
└── express + deps:                ~30MB

Total: ~190MB (first install, includes Chrome)
Note: Chrome only downloads once, then cached
```

## 13. Error Handling & Fallbacks

### Graceful Degradation

```javascript
// If binary not found
❌ ViewPort-CLI not supported on this platform
✓ Please check: https://github.com/law-makers/viewport-cli/issues

// If screenshot server fails to start
⚠️  Screenshot server failed to start
✓ Try manual: npm install -g viewport-server && viewport-server
✓ Then: npx viewport-cli scan --target http://localhost:3000 --no-auto-start

// If Chrome not available
⚠️  Chrome not found, downloading...
✓ First install may take 2-3 minutes
✓ Subsequent installs use cache

// If postinstall fails
ℹ️  Manual setup:
cd node_modules/viewport-cli/screenshot-server && npm install
```

## 14. Documentation Updates

### What Changes

```
README.md
└── Installation section:
    OLD: "cd server && npm install && npm link"
    NEW: "npm install viewport-cli"

INSTALL.md (NEW)
└── Troubleshooting NPM install issues

CONTRIBUTING.md (NEW)
└── Building from source for developers
```

## 15. Post-Publish Monitoring

### Metrics to Track

- **NPM Downloads**: Track weekly/monthly
- **Installation Success**: Monitor postinstall failures
- **Platform Coverage**: Track which platforms are used
- **Error Reports**: GitHub issues from installation problems

### Rollback Plan

```bash
# If critical issue discovered:
npm unpublish viewport-cli@1.0.0
# Publish fix as 1.0.1
npm publish

# Users will see warning but can force:
npm install viewport-cli@1.0.1
```

## 16. Implementation Timeline

### Phase 1: Preparation (Week 1)
- [x] Create package structure
- [x] Build CI/CD pipeline
- [x] Set up GitHub Actions
- [ ] Create checksums
- [ ] Write documentation

### Phase 2: Testing (Week 2)
- [ ] Test local tarball install
- [ ] Test on all platforms
- [ ] Test upgrade scenarios
- [ ] Performance benchmarks

### Phase 3: Publishing (Week 3)
- [ ] Reserve NPM package name
- [ ] Create NPM account
- [ ] Set up auth tokens
- [ ] Publish to NPM registry
- [ ] Verify installation

### Phase 4: Promotion (Week 4)
- [ ] Update GitHub README
- [ ] Create release notes
- [ ] Social media announcement
- [ ] Monitor feedback

## 17. Success Criteria

✅ **Users can install with**: `npm install viewport-cli`  
✅ **Users can use immediately**: `npx viewport-cli scan --target http://localhost:3000`  
✅ **No manual steps required**: Everything works after install  
✅ **Cross-platform support**: Works on Linux, macOS, Windows  
✅ **< 5 minute installation**: Including Chrome download on first run  
✅ **< 1% postinstall failure rate**: Robust error handling  
✅ **< 2MB per platform**: Optimized binary distribution  
✅ **100% test coverage**: All scenarios verified  

## 18. Future Enhancements

1. **Binary caching**: Share binaries across projects
2. **Offline mode**: Pre-cache Chrome installation
3. **Auto-update**: Automatic CLI updates
4. **Plugin system**: Custom viewport definitions
5. **CI/CD templates**: GitHub Actions, GitLab CI, Jenkins

---

## Quick Reference

| Component | Technology | Size | Auto-Installs |
|-----------|-----------|------|---|
| CLI Binary | Go (compiled) | 8MB each | ✅ |
| Screenshot Server | Node.js | 30MB deps | ✅ |
| Chrome | Puppeteer managed | 120MB | ✅ |
| Root Dependencies | NPM packages | ~2MB | ✅ |
| **Total (first install)** | | **~190MB** | ✅ |
| **Total (subsequent)** | | **~70MB** | ✅ |

**Status**: 📋 READY FOR IMPLEMENTATION

---

**Created**: December 15, 2025  
**Version**: 1.0  
**Next Step**: Execute Phase 1 - Preparation
