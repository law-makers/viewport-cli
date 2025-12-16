# ViewPort-CLI: Responsive Design Auditing Tool

A command-line tool for capturing screenshots of websites across multiple device viewports (mobile, tablet, desktop) to identify responsive design issues before deployment.

**✨ Now with automatic server management - zero manual setup required!**

## Problem Statement

Web developers need a quick, reliable way to test how their websites look across different device sizes during development. Manual testing in multiple browser windows is tedious and error-prone. Developers need:

- **Fast feedback loops**: Capture screenshots without leaving the terminal
- **Multiple viewports**: Test mobile (375×667), tablet (768×1024), and desktop (1920×1080) sizes simultaneously
- **Real rendering**: Use actual browser rendering (Firefox), not mocked output
- **Local development**: Work seamlessly with localhost development servers
- **Simple setup**: No complex infrastructure or external services required
- **Automatic server management**: No need to manually start/stop the screenshot server

## Solution Overview

ViewPort-CLI provides a two-component architecture:

1. **Screenshot Server** (Node.js + Playwright): Lightweight, installable as NPM package via `viewport-server` command
2. **CLI Tool** (Go): Automatically manages server lifecycle and captures screenshots

Key improvements:
- ✅ **Automatic server startup**: CLI auto-starts server if not running
- ✅ **Zero manual management**: Server automatically stops after scan
- ✅ **NPM package**: Install globally with `npm link` or `npm install -g`
- ✅ **Health checks**: Verifies server readiness before scanning
- ✅ **Smart port management**: Supports custom ports, auto-discovery
- ✅ **No cloud dependencies**: Runs entirely on your machine
- ✅ **Works offline**: No credentials or API tokens needed

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│        Your Development Server (Your Website)              │
│             http://localhost:3000                          │
└────────────────────────┬─────────────────────────────────────┘
                         │ (HTTP requests)
                         │
┌────────────────────────▼─────────────────────────────────────┐
│           ViewPort-CLI (Go Binary)                          │
│  1. Auto-start screenshot server if needed                  │
│  2. Health check until server ready                         │
│  3. Request screenshots from server                         │
│  4. Save PNG files and metadata                             │
│  5. Gracefully shutdown server                              │
└────────────────────────┬──────────────────────────────────────┘
                         │ (HTTP POST /screenshot)
                         │
┌────────────────────────▼──────────────────────────────────────┐
│    Screenshot Server (Node.js + Playwright)                 │
│    Command: viewport-server --port 3001                     │
│  ✓ Launches Firefox with Playwright                         │
│  ✓ Captures at multiple viewports                           │
│  ✓ Returns PNG as base64                                    │
│  Listening on http://localhost:3001                         │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         └─ Spawns Chrome Process
```

**Key Difference from Traditional Setup**:
- ✅ No need to manually start/stop the server
- ✅ CLI automatically manages server lifecycle
- ✅ Graceful cleanup after each scan
- ✅ Health checks ensure server readiness

## Requirements

### System Requirements
- **Node.js** 18.0 or higher (for screenshot server)
- **Go** 1.20 or higher (for CLI)
- **Operating System**: Linux, macOS, or Windows (no system dependencies needed!)

### Disk Space
- ~200MB for Node.js dependencies and Playwright (includes Firefox binary)
- ~5-10MB per website scan (PNG files + metadata)

## Getting Started

### Quick Start (30 seconds)

```bash
# 1. Install screenshot server globally
cd server && npm link

# 2. Build CLI
cd cli && go build -o viewport-cli

# 3. Run first scan (server auto-starts!)
./viewport-cli scan --target http://localhost:3000
```

That's it! The server starts automatically. No manual setup needed.

### Step-by-Step Installation

#### Step 1: Clone the Project

```bash
git clone <repository-url>
cd viewport-cli
```

#### Step 2: Install & Link Screenshot Server

```bash
cd server
npm install
npm link  # Makes 'viewport-server' command available globally
```

Verify installation:
```bash
viewport-server --help
```

You should see help text with available options.

#### Step 3: Build the Go CLI

```bash
cd cli
go build -o viewport-cli
```

Verify build:
```bash
./viewport-cli scan --help
```

You should see help text with available flags.

#### Step 4: Run Your First Scan

Make sure you have a development server running on port 3000:

```bash
# Terminal 1: Start your dev server
cd test-server
node server.js
# Output: Test server running on http://localhost:3000

# Terminal 2: Run a scan (server auto-starts automatically!)
cd cli
./viewport-cli scan --target http://localhost:3000
```

The CLI will:
1. ✅ Check if screenshot server is running
2. ✅ Auto-start server if not running
3. ✅ Wait for server health check
4. ✅ Request screenshots from all viewports
5. ✅ Save PNG files + metadata
6. ✅ Gracefully shutdown server

Results saved to `./viewport-results/`

### Alternative: Using Custom Port

```bash
# Auto-start server on custom port
./viewport-cli scan --target http://localhost:3000 --server-port 3002
```

### Alternative: Manual Server Management

If you prefer to manage the server manually:

```bash
# Terminal 1: Start server manually
viewport-server --port 3001 &

# Terminal 2: Run scan without auto-start
./viewport-cli scan --target http://localhost:3000 --no-auto-start
```

## Usage

### Basic Commands

```bash
# Run a scan with automatic server management
./viewport-cli scan --target http://localhost:3000

# Custom port
./viewport-cli scan --target http://localhost:3000 --server-port 3002

# Skip auto-start (server already running)
./viewport-cli scan --target http://localhost:3000 --no-auto-start

# Custom output directory
./viewport-cli scan --target http://localhost:3000 --output ./my-results

# List all previous scans
./viewport-cli results list

# Show results from a specific scan
./viewport-cli results show <scan-id>

# Show current configuration
./viewport-cli config show

# Initialize configuration
./viewport-cli config init
```

### Command Options

```bash
./viewport-cli scan --help

Usage:
  viewport-cli scan [flags]

Flags:
  --target <url>          Target URL to scan (e.g., http://localhost:3000) [REQUIRED]
  --port <number>         Local port (shorthand for --target http://localhost:<port>)
  --output <dir>          Output directory for results (default: ./viewport-results)
  --api <url>             Screenshot server endpoint (default: http://localhost:3001)
  --viewports <list>      Comma-separated viewport names (default: mobile,tablet,desktop)
  --server-port <port>    Screenshot server port (default: 3001) [AUTO-START]
  --no-auto-start         Skip auto-start, assume server is running
  --no-display            Save results without displaying summary
```

### Screenshot Server Manual Commands

If you need to manually manage the server:

```bash
# Start server on default port (3001)
viewport-server

# Start on custom port
viewport-server --port 3002

# Run as daemon (background process)
viewport-server --port 3001 --detach

# Show help
viewport-server --help
```

### Configuration File

Create `~/.config/viewport-cli/.viewport.yaml`:

```yaml
api:
  url: http://localhost:3001          # Screenshot server endpoint

scan:
  viewports:                           # Default viewports to test
    - mobile
    - tablet
    - desktop
  output: ./viewport-results           # Default output directory
  timeout: 60                          # Timeout in seconds

display:
  verbose: false                       # Show detailed output
  no_color: false                      # Disable colored output
  no_table: false                      # Disable table formatting
```

## Screenshot Server Details

### Installation

The screenshot server is now available as an NPM package with a global CLI command:

```bash
# Install from local directory (with npm link)
cd server
npm install
npm link

# Now available globally
viewport-server
```

### Features

The screenshot server (`server/index.js`) is a lightweight Node.js application that:

- **Listens on**: `http://localhost:3001` (or custom port via --port)
- **Dependencies**: Node.js 18+, Playwright 1.40+ (lightweight, pre-built Firefox binaries)
- **Browser Management**: Playwright automatically manages Firefox installation and updates
- **Auto-start Helper**: Ships with launcher.js for integration (used by CLI)

### Server API

#### Health Check
```bash
GET http://localhost:3001/
```

Returns server status and available devices.

#### Single Screenshot
```bash
POST http://localhost:3001/screenshot
Content-Type: application/json

{
  "url": "http://localhost:3000",
  "viewport": "MOBILE",
  "fullPage": true
}
```

#### Batch Screenshots
```bash
POST http://localhost:3001/screenshots
Content-Type: application/json

{
  "url": "http://localhost:3000",
  "viewports": ["MOBILE", "TABLET", "DESKTOP"],
  "fullPage": true
}
```

## Troubleshooting

### Issue: `viewport-server: command not found`

**Cause**: Screenshot server not linked to global PATH

**Solution**:
```bash
cd server
npm link
```

Then verify: `viewport-server --help`

### Issue: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solutions**:
```bash
# Use different port
./viewport-cli scan --target http://localhost:3000 --server-port 3002

# Or find and kill process using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows
```

### Issue: CLI Can't Connect to Screenshot Server

**Error**: `scan failed: connection refused`

**Solutions**:
1. Verify server is running: `curl http://localhost:3001`
2. Check if port is in use: `lsof -i :3001`
3. Ensure server started successfully: `viewport-server --port 3001`
4. Try with explicit --no-auto-start and verify server is running

### Issue: Browser Won't Install

**Error**: `ERROR: Failed to download Firefox binaries`

**Solutions**:
```bash
# Manually install Firefox binaries
npx playwright install firefox

# Or force reinstall everything
npm install --force
```

### Issue: Scan Fails with Network Error

**Error**: `scan failed: Get "http://localhost:3000": dial tcp`

**Solutions**:
1. Verify your development server is running
2. Use IP address instead: `--target http://127.0.0.1:3000`
3. Check firewall isn't blocking localhost connections

### Issue: Screenshots Are Blank or Incorrect

**Causes**:
- Development server not responding
- Page takes time to load
- JavaScript rendering issues

**Solutions**:
1. Test your server directly: `curl -s http://localhost:3000 | head -100`
2. Check browser console for JavaScript errors
3. Try a simpler page first (static HTML)
4. Increase timeout: Check configuration

### Issue: Auto-Start Not Working

**Symptom**: Server not starting automatically, manual start works fine

**Solutions**:
1. Verify `viewport-server` command is available: `which viewport-server`
2. Check PATH includes npm global bin directory
3. Try with explicit --no-auto-start to test manual mode
4. Check file permissions: `chmod +x server/bin/viewport-server.js`

## Output Format

Each scan creates a directory with:

### Directory Structure
```
viewport-results/
├── scan-1765807565866/
│   ├── metadata.json      # Scan details and results
│   ├── mobile.png         # Mobile viewport screenshot (375×667)
│   ├── tablet.png         # Tablet viewport screenshot (768×1024)
│   └── desktop.png        # Desktop viewport screenshot (1920×1080)
```

### metadata.json
```json
{
  "scan_id": "scan-1765807565866",
  "timestamp": "2025-12-15T10:30:45Z",
  "target": "http://localhost:3000",
  "status": "complete",
  "duration_ms": 1590,
  "viewports": [
    {
      "device": "mobile",
      "dimensions": {
        "width": 375,
        "height": 667
      },
      "screenshot": "base64-encoded-png",
      "issues": []
    },
    {
      "device": "tablet",
      "dimensions": {
        "width": 768,
        "height": 1024
      },
      "screenshot": "base64-encoded-png",
      "issues": []
    },
    {
      "device": "desktop",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "screenshot": "base64-encoded-png",
      "issues": []
    }
  ]
}
```

### PNG Files
Raw PNG screenshot files that can be opened in any image viewer or shared with team members.

## Performance Characteristics

- **Cold startup** (first scan): ~6-8 seconds
  - Server startup: 2-3 seconds
  - Chrome launch: 1-2 seconds
  - Screenshot capture: 1-3 seconds per viewport

- **Warm startup** (server already running): ~3-5 seconds
  - Health check: <500ms
  - Screenshot capture: 1-3 seconds per viewport

- **Concurrent pages**: Max 3 (configurable in server/index.js)
- **Screenshot size**: 100-300KB per viewport (PNG)
- **Metadata storage**: ~500KB-1MB per scan (base64 encoded)

## Development

### Building from Source

```bash
# Screenshot Server (Node.js)
cd server
npm install
npm link  # Global command

# CLI (Go)
cd cli
go build -o viewport-cli main.go
go test ./...      # Run tests
go fmt ./...       # Format code
```

### Developer Workflow

1. **Modify server code** (`server/index.js` or `server/lib/launcher.js`)
   ```bash
   cd server
   npm link
   # Changes take effect immediately when viewport-server runs
   ```

2. **Modify CLI code** (`cli/cmd/scan.go` or `cli/pkg/server/manager.go`)
   ```bash
   cd cli
   go build -o viewport-cli main.go
   # Test with: ./viewport-cli scan --help
   ```

3. **Test end-to-end**
   ```bash
   # Terminal 1: Start dev server
   cd test-server && node server.js &
   
   # Terminal 2: Run scan
   cd cli && ./viewport-cli scan --target http://localhost:3000
   ```

## Project Structure

```
viewport-cli/
│
├── server/                           # Screenshot Server (Node.js)
│   ├── bin/
│   │   └── viewport-server.js        # CLI executable entry point
│   ├── lib/
│   │   └── launcher.js               # Auto-start helper module
│   ├── examples/
│   │   ├── launcher-example.js       # Launcher API usage
│   │   └── cli-integration.js        # Integration patterns
│   ├── index.js                      # Main server implementation
│   ├── package.json
│   ├── INTEGRATION_GUIDE.md           # Server integration documentation
│   ├── REFACTORING_SUMMARY.md         # Technical details
│   ├── REFACTORED_README.md           # Package README
│   ├── COMPLETION_CHECKLIST.md        # Feature checklist
│   ├── test-integration.js            # Test suite (10 tests)
│   └── README.md
│
├── cli/                              # Go CLI
│   ├── cmd/
│   │   ├── root.go                   # Root command setup
│   │   ├── scan.go                   # Scan command (with auto-start)
│   │   ├── config.go                 # Configuration commands
│   │   └── results.go                # Results listing
│   ├── pkg/
│   │   ├── api/
│   │   │   └── client.go             # Screenshot API client
│   │   ├── config/
│   │   │   └── config.go             # Configuration management
│   │   ├── server/
│   │   │   └── manager.go            # Server lifecycle manager
│   │   ├── results/
│   │   │   └── results.go
│   │   └── tunnel/
│   │       └── tunnel.go
│   ├── main.go
│   ├── go.mod
│   ├── viewport-cli                  # Built binary
│   ├── INTEGRATION_GUIDE.md           # CLI integration documentation
│   └── README.md
│
├── test-server/                      # Test Website
│   ├── server.js                     # Simple test HTTP server
│   └── test.html                     # Test webpage
│
├── viewport-results/                 # Scan Output (Generated)
│   ├── scan-XXXX/
│   │   ├── metadata.json
│   │   ├── mobile.png
│   │   ├── tablet.png
│   │   └── desktop.png
│   └── ...
│
├── INTEGRATION_COMPLETE.md           # Complete integration summary
├── PLAN.md                           # Project plan
├── PHASE3_PROPOSAL.md                # Phase 3 proposal (AI analysis)
├── SETUP_GUIDE.md                    # Setup instructions
├── README.md                         # This file
└── .gitignore
```

## Dependencies

### Screenshot Server (Node.js)
- **Playwright + Firefox**: Browser automation with pre-built binaries (zero system dependencies)
- **Express**: HTTP server framework
- Built-in Node.js modules: http, fs, stream, path

### CLI (Go)
- **github.com/spf13/cobra**: Command-line framework
- **github.com/charmbracelet/lipgloss**: Terminal styling
- **github.com/go-resty/resty/v2**: HTTP client
- **github.com/spf13/viper**: Configuration management

## Documentation

The project includes comprehensive documentation for all components:

### Main Documentation
- **INTEGRATION_COMPLETE.md** - Complete integration summary with diagrams and all features
- **README.md** - This file, quick start and usage guide
- **PLAN.md** - Project planning and roadmap
- **SETUP_GUIDE.md** - Detailed setup instructions

### Component Documentation
- **server/INTEGRATION_GUIDE.md** - Server integration guide with examples
- **server/REFACTORING_SUMMARY.md** - Technical summary of changes
- **server/REFACTORED_README.md** - NPM package README
- **server/COMPLETION_CHECKLIST.md** - Features and completion checklist
- **cli/INTEGRATION_GUIDE.md** - CLI integration guide with API reference

## Testing

The project includes comprehensive test suite:

```bash
# Run server integration tests
cd server
npm test

# Build CLI
cd cli
go build -o viewport-cli main.go

# Test CLI
./viewport-cli scan --help
./viewport-cli results list
```

**Test Results**: ✅ All 10 server integration tests passing
**Build Status**: ✅ CLI builds successfully (13MB binary)
**End-to-End**: ✅ Verified with real test website

## Future Enhancements (Phase 3)

The project roadmap includes:

- ✅ **Auto-start screenshot server** (COMPLETE)
- ✅ **NPM package distribution** (COMPLETE)
- ✅ **Health check and readiness validation** (COMPLETE)
- ✅ **Custom port support** (COMPLETE)
- ✅ **Graceful process management** (COMPLETE)
- 🔄 **AI-powered analysis using Google Gemini** (Planned)
- 🔄 **Automated issue detection** (Planned)
- 🔄 **Visual diff comparison** (Planned)
- 🔄 **CI/CD pipeline integration** (Planned)

See [PHASE3_PROPOSAL.md](./PHASE3_PROPOSAL.md) for detailed plans.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with:
   - Description of changes
   - Testing steps
   - Updated documentation

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [comprehensive documentation](#documentation)
3. Check existing GitHub issues
4. Create a new issue with:
   - OS and Go/Node.js versions
   - Error messages and logs
   - Steps to reproduce
   - Expected vs actual behavior

## Quick Reference

```bash
# Quick Start
cd server && npm link
cd cli && go build -o viewport-cli
./viewport-cli scan --target http://localhost:3000

# Server Commands
viewport-server                    # Start on port 3001
viewport-server --port 3002        # Custom port
viewport-server --help             # Show help

# CLI Commands
./viewport-cli scan --help         # Show scan options
./viewport-cli results list        # List all scans
./viewport-cli config show         # Show config

# Troubleshooting
which viewport-server              # Check PATH
curl http://localhost:3001         # Test server
lsof -i :3001                      # Check port usage
```

## Acknowledgments

- [Playwright](https://playwright.dev/) for browser automation
- [Cobra](https://cobra.dev/) for CLI framework
- [Lipgloss](https://github.com/charmbracelet/lipgloss) for terminal styling
- [Firefox](https://www.mozilla.org/firefox/) browser engine

---

**Current Version**: 1.0.0  
**Last Updated**: December 15, 2025  
**Status**: ✅ Production Ready


