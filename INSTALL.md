# ViewPort-CLI Installation Guide

This guide covers installation, troubleshooting, and common issues.

## Installation

### Standard Installation (Recommended)

```bash
npm install viewport-cli
```

This will:
1. ✅ Detect your OS and architecture
2. ✅ Download the correct binary
3. ✅ Install screenshot server dependencies (Playwright + Firefox)
4. ✅ Verify the installation (zero system dependencies needed!)

Then use it immediately:

```bash
npx viewport-cli scan --target http://localhost:3000
```

### Global Installation

For easier command-line access without `npx`:

```bash
npm install -g viewport-cli

# Now you can use it directly
viewport-cli scan --target http://localhost:3000
```

### Installation in a Monorepo

```bash
npm install --save-dev viewport-cli

# Use in scripts in package.json
{
  "scripts": {
    "screenshot": "viewport-cli scan --target http://localhost:3000"
  }
}

npm run screenshot
```

## Supported Platforms

| OS | Architecture | Status |
|---|---|---|
| Linux | x64 | ✅ Supported |
| Linux | ARM64 | ✅ Supported |
| macOS | x64 (Intel) | ✅ Supported |
| macOS | ARM64 (Apple Silicon) | ✅ Supported |
| Windows | x64 | ✅ Supported |
| FreeBSD | x64 | ⏳ Coming soon |

## Troubleshooting

### Issue: postinstall script fails

**Common Causes**:
1. No Node.js or npm installed
2. npm not in PATH
3. Insufficient disk space
4. Network issues during installation

**Solutions**:

```bash
# Check Node.js version (need 18+)
node --version
npm --version

# Retry installation
rm -rf node_modules package-lock.json
npm install viewport-cli

# Increase npm timeout (for slow connections)
npm install --fetch-timeout=60000 viewport-cli

# Enable verbose logging
npm install viewport-cli --verbose

# Check available disk space
df -h

# Clear npm cache
npm cache clean --force
npm install viewport-cli
```

### Issue: "command not found: viewport-cli"

**Cause**: Global installation directory not in PATH

**Solution**:
```bash
# Reinstall globally
npm install -g viewport-cli

# Verify npm global bin directory
npm config get prefix

# Add to PATH (macOS/Linux)
export PATH="$(npm config get prefix)/bin:$PATH"

# Verify installation
which viewport-cli
```

### Issue: "ViewPort-CLI not supported on this platform"

**Cause**: Your OS/architecture combination is not supported

**Current Support**:
- ✅ Linux x64, arm64
- ✅ macOS x64, arm64
- ✅ Windows x64

**Solution**: If you have a different architecture:
```bash
# Build from source (requires Go)
git clone https://github.com/law-makers/viewport-cli.git
cd viewport-cli
npm run build
```

### Issue: postinstall script fails

**Common Causes**:
1. No Node.js or npm installed
2. npm not in PATH
3. Insufficient disk space
4. Network timeout downloading Chrome

**Solutions**:

```bash
# Check Node.js version (need 18+)
node --version
npm --version

# Retry installation
rm -rf node_modules package-lock.json
npm install viewport-cli

# Increase npm timeout (for slow connections)
npm install --fetch-timeout=60000 viewport-cli

# Enable verbose logging
npm install viewport-cli --verbose

# Check available disk space
df -h

# Clear npm cache
npm cache clean --force
npm install viewport-cli
```

### Issue: Firefox binary not found

**Cause**: Playwright binaries not installed properly

**Solution**:

```bash
# Manually pre-download Firefox binaries
npx playwright install firefox

# Retry viewport-cli
npm install viewport-cli
```

### Issue: Port 3001 already in use

**Solution**: Use a different port:

```bash
viewport-cli scan --target http://localhost:3000 --server-port 3002
```

Or manually start on different port:

```bash
# Start server manually on port 3003
npx viewport-cli scan --target http://localhost:3000 --server-port 3003 --no-auto-start
```

### Issue: Connection refused when accessing localhost

**Cause**: 
1. Development server not running
2. Firewall blocking localhost
3. Wrong port number

**Solution**:

```bash
# Verify server is running
curl http://localhost:3000

# Try IP address instead
viewport-cli scan --target http://127.0.0.1:3000

# Check firewall on macOS
sudo lsof -i :3000

# On Windows, check with netstat
netstat -ano | findstr :3000
```

### Issue: Screenshots are blank/wrong

**Cause**:
1. Page takes time to load
2. JavaScript errors
3. Content loaded dynamically

**Solution**:

```bash
# Test page directly
curl http://localhost:3000 | head -20

# Try adding delay (if needed)
viewport-cli scan --target http://localhost:3000 --timeout 30

# Check for JavaScript errors in browser console
```

### Issue: Installation is very slow

**Common Causes**:
- Slow internet connection
- First time downloading Firefox binaries (~200MB total with dependencies)
- Npm registry timeouts

**Solutions**:

```bash
# Use faster npm registry
npm install --registry https://registry.npmmirror.com viewport-cli

# Increase timeout
npm install --fetch-timeout=120000 viewport-cli

# Or use different registry (China)
npm install -g cnpm
cnpm install viewport-cli

# Reuse cached Chrome
npm install viewport-cli
# Subsequent installs will use cache
```

### Issue: Permission denied errors on macOS/Linux

**Cause**: Binary doesn't have execute permissions

**Solution**:

```bash
# Make binary executable
chmod +x node_modules/viewport-cli/bin/platform-binaries/*/viewport-cli

# Try again
npx viewport-cli scan --help
```

### Issue: Windows: "cannot load dynamic library"

**Cause**: Missing runtime dependencies on Windows

**Solution**:

```bash
# Install Visual C++ Runtime
# Download from: https://support.microsoft.com/en-us/help/2977003

# Or use WSL (Windows Subsystem for Linux)
# Much more reliable than native Windows
wsl npm install viewport-cli
wsl npx viewport-cli scan --target http://localhost:3000
```

## Offline Installation

If you have no internet access or limited bandwidth:

```bash
# On connected machine with internet:
npm pack viewport-cli
npm install  # Download all deps

# Copy the entire node_modules to offline machine

# On offline machine:
npm install ./viewport-cli-1.0.0.tgz

# Playwright will use cached Firefox binaries
```

## Uninstallation

```bash
# Local installation
npm uninstall viewport-cli

# Global installation
npm uninstall -g viewport-cli

# Clean cache (if needed)
npm cache clean --force
```

## Getting Help

If you encounter an issue not covered here:

1. **Check GitHub Issues**: https://github.com/law-makers/viewport-cli/issues
2. **Enable Debug Mode**: 
   ```bash
   DEBUG=* npx viewport-cli scan --target http://localhost:3000
   ```
3. **Collect Information**:
   ```bash
   node --version
   npm --version
   npm list viewport-cli
   uname -a  # macOS/Linux
   systeminfo  # Windows
   ```
4. **Create Issue** with:
   - Error message and logs
   - Output of commands above
   - Steps to reproduce
   - Expected vs actual behavior

## Building from Source

See [CONTRIBUTING.md](./CONTRIBUTING.md) for instructions on building ViewPort-CLI from source.

---

**Last Updated**: December 16, 2025  
**Supported NPM**: 8.0.0+  
**Supported Node.js**: 18.0.0+
