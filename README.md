# ViewPort-CLI: Complete Development Roadmap

## Project Overview

ViewPort-CLI is a developer tool that bridges the gap between local development environments and the diverse reality of end-user devices. By leveraging Cloudflare Tunnels, Headless Chrome (Puppeteer), and Multimodal AI (Gemini), it provides instantaneous, "pre-commit" visual regression testing and responsive design auditing directly from the terminal.

## Current Status: Phase 3 🚀 IN PROGRESS

Preparing AI-powered analysis integration with Google Gemini.

### What Works Now

**Phase 1 (Backend)** ✅ COMPLETE
- ✅ Cloudflare Worker REST API (Hono framework)
- ✅ Puppeteer integration for localhost screenshots
- ✅ Multi-viewport capture (Mobile, Tablet, Desktop)
- ✅ Result storage system with PNG + JSON
- ✅ Cloudflare API fallback for public URLs

**Phase 2 (CLI)** ✅ COMPLETE
- ✅ Go CLI with spf13/cobra framework
- ✅ HTTP API client for backend communication
- ✅ Scan command with multi-viewport support
- ✅ PNG file binary encoding (proper screenshots)
- ✅ Cloudflare Tunnel integration (cloudflared CLI)
- ✅ Configuration system (.viewport.yaml support)
- ✅ Results listing command
- ✅ Pretty terminal output with lipgloss styling
- ✅ Config init and config show commands

**Phase 3 (AI Analysis)** 🚀 IN PROGRESS
- 🔄 Google Gemini API integration
- 🔄 Screenshot analysis
- 🔄 Issue detection and recommendations

### Quick Start

```bash
# Initialize configuration
./viewport-cli config init

# Show current configuration
./viewport-cli config show

# Run a scan
./viewport-cli scan --target https://example.com --viewports mobile,tablet,desktop

# View all scans
./viewport-cli results list

# View scan details (coming in Phase 3)
./viewport-cli results show <scan-id>
```

## Full Command Reference

### Scan Command
```bash
viewport-cli scan --target <url> [options]

Options:
  --target string       Target URL to scan (required)
  --viewports strings   Viewports to test (default: mobile,tablet,desktop)
  --output string       Output directory for results (default: ./viewport-results)
  --tunnel              Use Cloudflare Tunnel to expose localhost
  --api string          Backend API endpoint (loaded from config)
  --no-display          Suppress results display
  --port int            Alternative: specify port instead of full URL
```

### Config Commands
```bash
# Initialize configuration file
viewport-cli config init

# Display current configuration
viewport-cli config show

# Edit config directly
vi ~/.config/viewport-cli/.viewport.yaml
```

### Results Commands
```bash
# List all previous scans
viewport-cli results list

# View scan details (Phase 3)
viewport-cli results show <scan-id>

# Delete scan (Phase 3)
viewport-cli results delete <scan-id>
```

## Configuration

ViewPort-CLI uses `.viewport.yaml` for configuration:

```bash
# First time setup
viewport-cli config init
```

This creates `~/.config/viewport-cli/.viewport.yaml`:

```yaml
api:
  url: http://localhost:8787          # Backend API endpoint

scan:
  viewports: [mobile, tablet, desktop] # Default viewports
  output: ./viewport-results            # Results directory
  tunnel: false                         # Enable tunneling
  timeout: 60                           # Scan timeout (seconds)

tunnel:
  name: viewport-scan                   # Tunnel name
  auto_cleanup: true                    # Auto-cleanup on exit

display:
  verbose: false                        # Verbose output
  no_color: false                       # Disable colors
  no_table: false                       # Disable table formatting
```

**Notes**:
- CLI flags always override config file settings
- Environment variables supported with `VIEWPORT_` prefix (e.g., `VIEWPORT_API_URL`)

## Documentation

- **[PLAN.md](./PLAN.md)** - Project architecture and planning
- **[PHASE1_FINAL.md](./PHASE1_FINAL.md)** - Phase 1 backend implementation
- **[PHASE2_FINAL.md](./PHASE2_FINAL.md)** - Phase 2 CLI implementation
- **[PHASE3_PROPOSAL.md](./PHASE3_PROPOSAL.md)** - Phase 3 AI analysis specification
- **[SCREENSHOT_TESTING.md](./SCREENSHOT_TESTING.md)** - Testing and validation guide

## Architecture Overview

### Phase 1: Backend (Complete) ✅
- **Framework**: Hono (TypeScript) on Cloudflare Workers
- **Screenshotting**: Puppeteer + Cloudflare Browser Rendering API
- **Output**: PNG images + JSON metadata
- **Endpoints**: POST /scan

### Phase 2: CLI Client (Complete) ✅
- **Language**: Go 1.25.4
- **Framework**: spf13/cobra for command structure
- **Features**: Scan, config management, results listing
- **Output**: Beautiful terminal UI with lipgloss
- **Binary**: 13MB self-contained executable

### Phase 3: AI Analysis (In Progress) 🚀
- **AI Provider**: Google Gemini API
- **Analysis**: Screenshot evaluation, issue detection
- **Output**: Recommendations and best practices

### Phase 4+: Reporting & IDE Integration (Planned)
- **Reporting**: HTML, PDF, JSON exports
- **IDE**: VS Code extension
- **Comparison**: Historical scan comparison

## Project Structure

```
viewport-cli/
├── README.md                    # This file
├── PHASE1_FINAL.md              # Phase 1 documentation
├── PHASE2_FINAL.md              # Phase 2 documentation
├── PHASE3_PROPOSAL.md           # Phase 3 specification
├── SCREENSHOT_TESTING.md        # Testing guide
├── PLAN.md                      # Architecture
│
├── viewport-results/            # Screenshots (gitignored)
├── worker/                      # Phase 1: Backend API
│   ├── src/
│   │   ├── index.ts            # Hono API
│   │   ├── types/              # API types
│   │   └── services/           # Services
│   └── wrangler.jsonc
│
├── test-server/                 # Test infrastructure
│   ├── server.js               # Node test server
│   └── test.html               # Test page
│
└── cli/                         # Phase 2: CLI Client
    ├── main.go                 # Entry point
    ├── cmd/                    # Commands
    │   ├── root.go
    │   ├── scan.go
    │   └── config.go
    ├── pkg/                    # Packages
    │   ├── api/               # Backend API client
    │   ├── config/            # Configuration
    │   ├── tunnel/            # Tunnel management
    │   └── results/           # Results parsing
    ├── go.mod                 # Go modules
    └── viewport-cli           # Compiled binary
```

## Status

| Phase | Component | Status | Completion |
|-------|-----------|--------|-----------|
| 1 | Backend API | ✅ Complete | 100% |
| 1 | Screenshot Engine | ✅ Complete | 100% |
| 1 | Test Infrastructure | ✅ Complete | 100% |
| 2 | CLI Foundation | ✅ Complete | 100% |
| 2 | Configuration System | ✅ Complete | 100% |
| 2 | Tunnel Integration | ✅ Complete | 100% |
| 2 | Results Listing | ✅ Complete | 100% |
| 3 | Gemini Integration | 🚀 In Progress | 0% |
| 3 | Analysis Display | 🚀 Planned | 0% |
| 4 | HTML Reports | 🚧 Planned | 0% |
| 4 | VS Code Extension | 🚧 Planned | 0% |

## Performance Metrics

### Phase 1 Backend
- Response time: 1-3 seconds per scan
- Supports: Multi-viewport, parallel requests
- Output: PNG (binary) + JSON metadata

### Phase 2 CLI
- Binary size: 13MB
- Startup time: <100ms
- Scan execution: 0.5-3 seconds (depending on viewports)
- Memory: ~50MB during operation

## Getting Started

### Prerequisites
- Go 1.25.4+ (for building from source)
- Running Phase 1 backend (http://localhost:8787)
- Optional: cloudflared for tunnel support

### Installation from Source
```bash
cd cli
go build -o viewport-cli main.go
./viewport-cli --version
```

### First Run
```bash
# Create config
./viewport-cli config init

# View config
./viewport-cli config show

# Run a scan
./viewport-cli scan --target http://localhost:3000
```

## Development Roadmap

### Phase 3 (Current)
- [ ] Google Gemini API integration
- [ ] Screenshot analysis
- [ ] Issue detection
- [ ] Recommendation generation
- [ ] Results enhancement

### Phase 4 (Future)
- [ ] HTML report generation
- [ ] PDF export
- [ ] JSON export
- [ ] Scan comparison
- [ ] VS Code extension

### Future Ideas
- [ ] CI/CD integration
- [ ] GitHub Actions support
- [ ] Slack integration
- [ ] Email reports
- [ ] Performance metrics
- [ ] Accessibility analysis

## Contributing

This project is in active development. See individual phase documentation for implementation details.

## License

[To be determined]


