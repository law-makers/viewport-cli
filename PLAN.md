# ViewPort-CLI: Implementation Plan

## 1. Executive Summary

**ViewPort-CLI** is a developer tool designed to bridge the gap between local development environments and the diverse reality of end-user devices. By leveraging Cloudflare Tunnels, Headless Chrome (Puppeteer), and Multimodal AI (Gemini), it provides instantaneous, "pre-commit" visual regression testing and responsive design auditing directly from the terminal.

## 2. Problem & Solution

### The Problem: Localhost Myopia
Developers build on high-end devices, missing issues that appear on mobile or different viewports. Manual resizing is tedious, and existing visual testing tools are CI-centric, not dev-loop centric.

### The Solution: AI-Powered Responsive Design Auditor
A single command (`viewport-cli scan`) that:
1.  **Exposes** local port via a secure tunnel.
2.  **Renders** the page on remote headless browsers.
3.  **Analyzes** viewports using AI for layout shifts, overflows, and regressions.
4.  **Reports** results back to the CLI.

## 3. Architecture

The system employs a **Hybrid Architecture**:
-   **Client**: Go-based CLI (Native performance, single binary).
-   **Backend**: Cloudflare Workers (Serverless, Low-latency, Scalable).

```mermaid
graph TD
    subgraph Client ["Client (Local Machine)"]
        CLI[ViewPort CLI (Go)]
        TUI[Bubbletea Interface]
        Tunnel[Cloudflare Tunnel]
        Report[Report Generator]
    end

    subgraph Edge ["Edge (Cloudflare Network)"]
        Worker[Edge Worker (TS)]
        Puppeteer[Browser Rendering API]
        Gemini[Google Gemini 1.5 Flash]
    end

    CLI -->|Starts| Tunnel
    CLI -->|POST /scan| Worker
    Worker -->|Control| Puppeteer
    Puppeteer -->|Visit URL| Tunnel
    Puppeteer -->|Screenshots| Worker
    Worker -->|Images| Gemini
    Gemini -->|Analysis| Worker
    Worker -->|JSON Result| CLI
    CLI -->|Render| Report
```

## 4. Tech Stack & Standards

### Client (CLI)
-   **Language**: Go 1.21+
-   **Framework**: `spf13/cobra` (CLI structure)
-   **UI**: `charmbracelet/bubbletea` (TUI)
-   **Network**: `go-resty/resty` (HTTP Client)
-   **Tunneling**: Encapsulated `cloudflared` or similar tunnel logic.

### Backend (Edge)
-   **Runtime**: Cloudflare Workers
-   **Language**: TypeScript (Strict Mode)
-   **Framework**: `Hono` (Web Standard based)
-   **Services**:
    -   Browser Rendering API (Puppeteer)
    -   Workers AI (Gemini 1.5 Flash)

## 5. Data Structures (Strict Types)

We strictly define the API contract to ensure type safety between the Go client and TypeScript backend.

### 5.1 Shared Types (Conceptual)

#### Scan Request
```json
{
  "targetUrl": "https://random-tunnel-id.trycloudflare.com",
  "viewports": ["MOBILE", "TABLET", "DESKTOP"],
  "options": {
    "fullPage": true
  }
}
```

#### Scan Result
```json
{
  "status": "SUCCESS",
  "viewports": [
    {
      "device": "MOBILE",
      "width": 375,
      "height": 667,
      "screenshotUrl": "...",
      "issues": [
        {
          "severity": "HIGH",
          "type": "OVERFLOW",
          "description": "Horizontal scroll detected on body",
          "suggestion": "Check width: 100vw vs 100%"
        }
      ]
    }
  ],
  "summary": "2 Critical Issues Found"
}
```

### 5.2 TypeScript Interfaces (Backend)

```typescript
// types/api.ts

export type DeviceType = 'MOBILE' | 'TABLET' | 'DESKTOP';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueType = 'OVERFLOW' | 'LAYOUT_SHIFT' | 'TRUNCATION' | 'CONTRAST' | 'OTHER';

export interface ScanRequest {
  targetUrl: string;
  viewports: DeviceType[];
  options?: {
    fullPage?: boolean;
    authHeader?: string;
  };
}

export interface DetectedIssue {
  severity: Severity;
  type: IssueType;
  description: string;
  suggestion: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ViewportResult {
  device: DeviceType;
  dimensions: {
    width: number;
    height: number;
  };
  screenshotBase64: string; // Or URL if stored in R2
  issues: DetectedIssue[];
}

export interface ScanResponse {
  scanId: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  results: ViewportResult[];
  globalAnalysis?: string;
}
```

### 5.3 Go Structs (Client)

```go
// pkg/models/types.go

type DeviceType string
type Severity string

const (
	DeviceMobile  DeviceType = "MOBILE"
	DeviceTablet  DeviceType = "TABLET"
	DeviceDesktop DeviceType = "DESKTOP"
)

type ScanRequest struct {
	TargetURL string       `json:"targetUrl"`
	Viewports []DeviceType `json:"viewports"`
	Options   ScanOptions  `json:"options,omitempty"`
}

type ScanOptions struct {
	FullPage   bool   `json:"fullPage,omitempty"`
	AuthHeader string `json:"authHeader,omitempty"`
}

type ScanResponse struct {
	ScanID    string           `json:"scanId"`
	Timestamp string           `json:"timestamp"` // ISO8601
	Status    string           `json:"status"`
	Results   []ViewportResult `json:"results"`
}

type ViewportResult struct {
	Device           DeviceType      `json:"device"`
	Dimensions       Dimensions      `json:"dimensions"`
	ScreenshotBase64 string          `json:"screenshotBase64"`
	Issues           []DetectedIssue `json:"issues"`
}

type DetectedIssue struct {
	Severity    Severity `json:"severity"`
	Type        string   `json:"type"`
	Description string   `json:"description"`
	Suggestion  string   `json:"suggestion"`
}

type Dimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}
```

## 6. Implementation Phases

### Phase 1: Backend Foundation (Edge)
**Goal**: Deploy a Cloudflare Worker that can take screenshots.
1.  Initialize Cloudflare Worker Project: `npm create cloudflare@latest`.
2.  Configure `wrangler.toml` for Browser Rendering binding.
3.  Implement `POST /scan` endpoint using Hono.
4.  Implement basic Puppeteer screenshot logic.

### Phase 2: Client Foundation (CLI)
**Goal**: A CLI that can parse args and talk to the backend.
1.  Initialize Go Module: `go mod init viewport-cli`.
2.  Setup `cobra` for `viewport scan` command.
3.  Implement `resty` client to reach the deployed Worker.

### Phase 3: Tunneling
**Goal**: Expose localhost to the world securely.
1.  Integrate `cloudflared` (using `os/exec` or embedded library if available/stable).
2.  Parse user's local port (default 3000).
3.  Start tunnel and extract Public URL.

### Phase 4: Intelligence (AI)
**Goal**: Analyze the screenshots.
1.  Integrate Workers AI (`@cf/google/gemini-1.5-flash-001`) in the Worker.
2.  Construct prompt for Gemini: "Analyze this mobile screenshot for layout bugs...".
3.  Parse Gemini JSON response into strict `DetectedIssue` format.

### Phase 5: TUI & Reporting
**Goal**: Beautiful output.
1.  Use `bubbletea` for a loading spinner "Scanning...".
2.  Render the JSON response into a Markdown report `REPORT.md` on the user's machine.
3.  Save screenshots to a `viewport-results/` folder.

## 7. Configuration Strategy

Config file `.viewport.yaml` (optional override):
```yaml
target: "http://localhost:3000"
viewports:
  - mobile
  - desktop
output: "./reports"
```
