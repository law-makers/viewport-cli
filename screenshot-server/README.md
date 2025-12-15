# ViewPort CLI Server

A lightweight, production-ready screenshot server for viewport testing. Now available as an NPM executable package with auto-start capabilities for seamless integration with the Go CLI.

## 🎯 Features

✅ **NPM Package** - Install globally or locally  
✅ **CLI Executable** - `viewport-server` command  
✅ **Auto-Start Helper** - Smart server management  
✅ **Custom Ports** - `--port` argument support  
✅ **Background Mode** - `--detach` for daemon operation  
✅ **Health Checks** - Built-in server readiness verification  
✅ **Process Management** - Graceful cleanup, no zombie processes  
✅ **Port Discovery** - Automatic port conflict resolution  

## 📦 Installation

### Development (Local)
```bash
cd server
npm link
```

### Production
```bash
npm install viewport-cli-server
# or globally
npm install -g viewport-cli-server
```

## 🚀 Quick Start

### Start Server

```bash
# Default port 3001
viewport-server

# Custom port
viewport-server --port 4000

# Background mode
viewport-server --port 3001 --detach

# Show help
viewport-server --help
```

### Use from Node.js

```javascript
const { ensureServerRunning, killServer } = require('./lib/launcher');

async function scan() {
  try {
    // Auto-start server and wait for readiness
    const serverUrl = await ensureServerRunning(3001, true, true);
    console.log('Server ready:', serverUrl);
    
    // Use the server...
    const response = await fetch(`${serverUrl}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: 'http://localhost:3000',
        viewports: ['mobile', 'tablet', 'desktop']
      })
    });
    
    const results = await response.json();
    console.log('Scan complete:', results);
  } finally {
    // Always cleanup
    await killServer(3001);
  }
}

scan();
```

### Use from Go

```go
package main

import (
	"fmt"
	"net/http"
	"os/exec"
	"time"
)

func main() {
	// Start server
	cmd := exec.Command("viewport-server", "--port", "3001")
	cmd.Start()
	defer cmd.Process.Kill()

	// Wait for server to be ready
	for i := 0; i < 30; i++ {
		resp, err := http.Get("http://localhost:3001")
		if err == nil && resp.StatusCode == 200 {
			resp.Body.Close()
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	// Perform scan...
}
```

## 📚 Documentation

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Complete integration guide with examples
- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Technical summary of all changes

## 🔧 API Reference

### `ensureServerRunning(port, autoStart, verbose)`

Ensures the screenshot server is running. Auto-spawns if needed.

**Parameters:**
- `port` (number): Port number (default: 3001)
- `autoStart` (boolean): Spawn if not running (default: true)
- `verbose` (boolean): Log output (default: false)

**Returns:** Promise<string> - Server URL

```javascript
const serverUrl = await ensureServerRunning(3001, true, true);
// => "http://localhost:3001"
```

### `killServer(port)`

Gracefully shut down the server.

**Parameters:**
- `port` (number): Port the server is running on

**Returns:** Promise<void>

```javascript
await killServer(3001);
```

### `findAvailablePort(startPort, maxAttempts)`

Find the first available port.

**Parameters:**
- `startPort` (number): Starting port (default: 3001)
- `maxAttempts` (number): Ports to check (default: 10)

**Returns:** Promise<number>

```javascript
const port = await findAvailablePort(3001);
// Returns first available port: 3001, 3002, 3003, etc.
```

### Other Functions

- `isServerRunning(port, timeout)` - Check if server is running
- `waitForServer(port, maxAttempts, delayMs)` - Poll for readiness
- `spawnServer(port, silent)` - Spawn server process

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for full API documentation.

## 🧪 Testing

```bash
npm test
# or
node test-integration.js
```

**Test Results:** 10/10 passing ✅

## 📁 Project Structure

```
server/
├── bin/
│   └── viewport-server.js         # CLI executable
├── lib/
│   └── launcher.js                # Auto-start helper
├── examples/
│   ├── launcher-example.js        # Launcher examples
│   └── cli-integration.js         # Integration patterns
├── index.js                        # Server implementation
├── package.json                    # NPM config
├── INTEGRATION_GUIDE.md            # Full integration guide
├── REFACTORING_SUMMARY.md          # Technical summary
└── test-integration.js             # Test suite
```

## 🌐 Endpoints

### Health Check
```
GET /
```

Returns server status and available devices.

```json
{
  "status": "ok",
  "service": "local-screenshot-server",
  "devices": ["mobile", "tablet", "desktop"]
}
```

### Single Screenshot
```
POST /screenshot
Content-Type: application/json

{
  "targetUrl": "http://localhost:3000",
  "device": "mobile"
}
```

### Batch Screenshots
```
POST /screenshots
Content-Type: application/json

{
  "targetUrl": "http://localhost:3000",
  "devices": ["mobile", "tablet", "desktop"]
}
```

### Scan (CLI Compatible)
```
POST /scan
Content-Type: application/json

{
  "targetUrl": "http://localhost:3000",
  "viewports": ["mobile", "tablet", "desktop"]
}
```

## 🎬 Device Viewports

- **Mobile**: 375×667
- **Tablet**: 768×1024
- **Desktop**: 1920×1080

## ⚙️ Configuration

### Environment Variables

```bash
# Set default port
PORT=4000 viewport-server

# CLI args override env vars
PORT=4000 viewport-server --port 5000  # Uses 5000
```

### Command Line Arguments

```bash
viewport-server [OPTIONS]

Options:
  --port <PORT>     Port to run on (default: 3001)
  --detach          Run in background
  --help, -h        Show help message
```

## 🔄 Process Lifecycle

### Starting
1. Check if server already running
2. If not running and autoStart=true, spawn process
3. Poll health endpoint until ready
4. Return server URL

### Cleanup
1. Receive SIGINT or killServer() call
2. Close HTTP server
3. Close Chrome/Chromium browser
4. Exit process

### Error Handling
- Timeout protection (30 second max)
- Force-kill after 5 seconds graceful shutdown fails
- Automatic port fallback if conflict detected
- Detailed error messages

## 🐛 Troubleshooting

### Server won't start
```bash
# Check Chrome availability
npx @sparticuz/chromium

# Check logs
viewport-server  # Run in foreground to see errors
```

### Port already in use
```javascript
// Auto-detect and use available port
const port = await findAvailablePort(3001);
const serverUrl = await ensureServerRunning(port, true, true);
```

### Zombie processes
```bash
# Use killServer() function
// or force-kill all
pkill -9 -f "node.*index.js"
```

## 📊 Performance

- Server startup: ~2-3 seconds
- Health check response: <500ms
- Screenshot capture: ~1-3 seconds per device
- Max concurrent pages: 3 (configurable)

## 📝 Examples

See the `examples/` directory for:
- `launcher-example.js` - Launcher API usage
- `cli-integration.js` - Go/Node.js integration patterns

Run examples:
```bash
node examples/launcher-example.js
```

## 🔐 Security Notes

- Server only listens on localhost by default
- No authentication required (intended for local dev)
- CORS headers allow requests from any origin
- Consider firewall restrictions in production

## 🚦 Status

| Feature | Status |
|---------|--------|
| NPM Package | ✅ Complete |
| CLI Executable | ✅ Complete |
| Auto-start Helper | ✅ Complete |
| Custom Ports | ✅ Complete |
| Health Checks | ✅ Complete |
| Process Management | ✅ Complete |
| Documentation | ✅ Complete |
| Tests | ✅ 10/10 passing |

## 🤝 Integration

The server is designed to be integrated with the main Go CLI. Use the launcher helper:

```javascript
const { ensureServerRunning, killServer } = require('viewport-cli-server/lib/launcher');

// In your scan function
const serverUrl = await ensureServerRunning(3001, true, true);
// ... perform scan ...
await killServer(3001);
```

For full integration examples, see [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md).

## 📄 License

MIT

## 🎯 Next Steps

1. ✅ Install: `npm link` (development) or `npm install` (production)
2. ✅ Test: `npm test` or `node test-integration.js`
3. ✅ Integrate with Go CLI: Use launcher helper
4. ✅ Deploy: Include in dependencies

Happy scanning! 🎬
