# Screenshot Testing Guide

This guide explains how to test real screenshot capturing for ViewPort-CLI.

## Quick Start

### 1. Start the Test Server

```bash
cd /workspaces/viewport-cli/test-server
node server.js

# Output:
# 🚀 Test server running at http://localhost:3000
# 📄 Test page: http://localhost:3000/test.html
```

### 2. Start the Worker Dev Server

```bash
cd /workspaces/viewport-cli/worker
npm run dev

# Output:
# ⛅️ wrangler dev
# Ready on http://localhost:8787
```

### 3. Test the Scan Endpoint

```bash
curl -X POST http://localhost:8787/scan \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/test.html",
    "viewports": ["MOBILE", "TABLET", "DESKTOP"],
    "options": {"fullPage": true}
  }' | jq '.'
```

## Backend Strategies

### Strategy 1: Cloudflare Browser Rendering API (Production)

**When to use**: Deployed on Cloudflare Workers

**Setup**:
1. Get `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from https://dash.cloudflare.com/profile/api-tokens
2. Add to `.dev.vars` file in worker directory:
   ```
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_API_TOKEN=your_api_token
   ```
3. The worker will automatically use the API to capture real screenshots

**Advantages**:
- ✅ Runs in serverless Cloudflare environment
- ✅ Capture live websites & internal URLs (with proper network access)
- ✅ Handles authentication, cookies, custom headers
- ✅ No dependencies on local Chrome

**Limitations**:
- ❌ Cannot access `localhost` URLs (external service)
- ❌ Requires Cloudflare account & credits
- ❌ Rate limited based on plan

### Strategy 2: Puppeteer (Local Development)

**When to use**: Local testing with system Chrome installed

**Setup**:
1. Ensure Chrome is installed on your system
2. Puppeteer will auto-download/use it
3. Worker automatically detects and uses Puppeteer

**Advantages**:
- ✅ Can access localhost URLs (perfect for dev loop)
- ✅ Fast iteration & testing
- ✅ Full control over browser behavior

**Limitations**:
- ❌ Only works in Node.js environment (not on Cloudflare Workers)
- ❌ Requires Chrome binary + system dependencies
- ❌ Not suitable for production

### Strategy 3: Mock Screenshots (Current Fallback)

**When to use**: Testing API structure without screenshot implementation

**Setup**: 
- Automatic fallback when Puppeteer/Chrome unavailable
- Returns valid base64 PNG for testing

**Advantages**:
- ✅ Works everywhere (no dependencies)
- ✅ Great for API testing & development

**Limitations**:
- ❌ Returns placeholder images (1x1 pixel)
- ❌ Not suitable for visual testing

## Testing Each Strategy

### Test Mock Screenshots (Currently Active)

```bash
# No setup needed - this is the default fallback
curl -X POST http://localhost:8787/scan \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/test.html",
    "viewports": ["MOBILE"]
  }' | jq '.results[0].screenshotBase64 | length'

# Expected: 96 bytes (mock PNG)
```

### Test Cloudflare API (With Credentials)

```bash
# Set environment variables first:
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_API_TOKEN="your_api_token"

# Add to .dev.vars
cat >> worker/.dev.vars << EOF
CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN
EOF

# Restart worker
pkill -f "npm run dev"
cd worker && npm run dev

# Test with public URL (localhost won't work with API)
curl -X POST http://localhost:8787/scan \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://example.com",
    "viewports": ["MOBILE", "DESKTOP"]
  }' | jq '.results[0].screenshotBase64 | length'

# Expected: Many thousands of bytes (real PNG)
```

### Test Puppeteer Locally

**Prerequisites** (one-time setup):
```bash
# Install Chrome dependencies (Ubuntu/Debian)
# Note: Requires sudo or container privileges
sudo apt-get install -y \
  libatk-1.0-0 libatk-bridge2.0-0 libx11-6 libxcomposite1 \
  libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 \
  libxss1 libxtst6 fonts-liberation libnss3

# Puppeteer will use system Chrome once installed
```

**Test**:
```bash
# With proper system Chrome installed, test localhost:
curl -X POST http://localhost:8787/scan \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/test.html",
    "viewports": ["MOBILE"]
  }' | jq '.results[0].screenshotBase64 | length'

# Expected: Many thousands of bytes (real screenshot)
```

## Production Deployment

When deploying to Cloudflare:

1. **Configure Browser Rendering addon**:
   - Go to Cloudflare dashboard → Workers → Your worker
   - Add "Workers Browser Rendering" binding

2. **Set environment variables**:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`

3. **Deploy**:
   ```bash
   cd worker
   npm run deploy
   ```

4. **Test with public URLs**:
   ```bash
   curl -X POST https://your-worker.workers.dev/scan \
     -H "Content-Type: application/json" \
     -d '{"targetUrl": "https://example.com", "viewports": ["MOBILE", "DESKTOP"]}'
   ```

## Troubleshooting

### "Chrome not found" error
- Install system Chrome OR
- Add valid Cloudflare API credentials to `.dev.vars` OR
- Accept mock screenshots for testing

### "Could not connect to localhost:3000"
- Ensure test server is running: `cd test-server && node server.js`
- Only Puppeteer can access localhost, API backend cannot

### "API credentials invalid"
- Verify `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `.dev.vars`
- Check token has `Browser Rendering` permission
- Ensure account has active subscription

## Next Steps (Phase 4)

The captured screenshots will be sent to Google Gemini 1.5 Flash for AI analysis:
- Detect layout shifts
- Find overflow issues  
- Identify accessibility problems
- Generate actionable suggestions

Phase 4 will convert raw screenshots into insights!
