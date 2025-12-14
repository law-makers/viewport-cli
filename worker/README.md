# ViewPort-CLI Backend Worker

Cloudflare Worker for responsive design auditing and visual regression testing.

## Architecture

- **Framework**: Hono (Web Standard)
- **Runtime**: Cloudflare Workers
- **Browser**: Cloudflare Browser Rendering API
- **Language**: TypeScript (Strict Mode)

## Features Implemented (Phase 1)

### Endpoints

- `GET /` - Health check
- `POST /scan` - Capture screenshots for multiple viewports

### Types

- `ScanRequest` - Client request with target URL and viewport list
- `ScanResponse` - Server response with capture results
- `ViewportResult` - Screenshot data and metadata per device

### Viewport Support

- **MOBILE**: 375×667 (iPhone SE)
- **TABLET**: 768×1024 (iPad)
- **DESKTOP**: 1920×1080 (Standard desktop)

## Development

### Setup

```bash
# Install dependencies
npm install

# Generate Cloudflare types
npm run cf-typegen
```

### Environment Variables

For local development, create a `.dev.vars` file in the worker directory (optional):

```bash
# Copy the example
cp .dev.vars.example .dev.vars

# Edit as needed (e.g., for Phase 4 Gemini API key)
```

### Running

```bash
# Start dev server (local testing on http://localhost:8787)
npm run dev

# Deploy to Cloudflare
npm run deploy
```

### Testing

```bash
# Test the health endpoint
curl http://localhost:8787

# Test the scan endpoint
curl -X POST http://localhost:8787/scan \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://example.com",
    "viewports": ["MOBILE", "TABLET", "DESKTOP"],
    "options": {"fullPage": true}
  }' | jq
```

## API Usage

```bash
curl -X POST http://localhost:8787/scan \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://example.com",
    "viewports": ["MOBILE", "TABLET", "DESKTOP"],
    "options": {
      "fullPage": true
    }
  }'
```

## Response Format

```json
{
  "scanId": "uuid",
  "timestamp": "2025-12-14T15:00:00Z",
  "status": "SUCCESS",
  "results": [
    {
      "device": "MOBILE",
      "dimensions": { "width": 375, "height": 667 },
      "screenshotBase64": "...",
      "issues": []
    }
  ],
  "globalAnalysis": "Screenshots captured. AI analysis coming in Phase 4."
}
```

## Next Phases

- **Phase 2**: CLI Client (Go) with tunnel integration
- **Phase 3**: Cloudflare Tunneling integration
- **Phase 4**: Gemini AI analysis for layout issues
- **Phase 5**: TUI reporting and result visualization
