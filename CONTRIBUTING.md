# Contributing to ViewPort-CLI

Thank you for your interest in contributing! This guide covers development setup, building from source, and submitting changes.

## Development Environment Setup

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Go** 1.20 or higher
- **Git**
- **npm** 8.0.0 or higher

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/law-makers/viewport-cli.git
cd viewport-cli

# Install dependencies
npm install

# Install Go dependencies
cd cli && go mod download && cd ..

# Verify setup
npm run verify
node bin/cli.js --version
```

## Project Structure

```
viewport-cli/
├── cli/                          # Go CLI source code
│   ├── main.go                  # Entry point
│   ├── cmd/                     # CLI commands
│   │   ├── scan.go
│   │   ├── config.go
│   │   ├── results.go
│   │   └── root.go
│   ├── pkg/                     # Go packages
│   │   ├── api/
│   │   ├── config/
│   │   ├── server/
│   │   ├── results/
│   │   └── tunnel/
│   ├── go.mod
│   └── go.sum
│
├── screenshot-server/           # Node.js screenshot server
│   ├── index.js                # Main server
│   ├── lib/
│   ├── package.json
│   └── test-integration.js      # Tests
│
├── bin/                         # Distribution binaries
│   ├── cli.js                  # Node.js shim (launches Go binary)
│   └── platform-binaries/      # Pre-compiled binaries
│       ├── linux-x64/
│       ├── macos-x64/
│       ├── macos-arm64/
│       └── windows-x64/
│
├── lib/                         # Helper modules
│   ├── platform-detector.js
│   └── binary-locator.js
│
├── scripts/                     # Build and install scripts
│   ├── postinstall.js
│   ├── compile-binaries.sh
│   └── verify-install.js
│
└── test-server/                # Test website
```

## Building from Source

### Build Go CLI

```bash
# Build for current platform
cd cli
go build -o viewport-cli main.go

# Build for specific platform
GOOS=linux GOARCH=amd64 go build -o viewport-cli-linux main.go
GOOS=darwin GOARCH=amd64 go build -o viewport-cli-macos main.go
GOOS=windows GOARCH=amd64 go build -o viewport-cli.exe main.go

# Build with optimization
go build -ldflags="-s -w" -o viewport-cli main.go
```

### Build All Platforms

```bash
# From root directory
npm run build

# This compiles binaries for all platforms:
# - Linux (x64, arm64)
# - macOS (x64, arm64)
# - Windows (x64)
```

### Build Screenshot Server

```bash
cd screenshot-server
npm install

# Run
npm start

# Test
npm test
```

## Testing

### Run All Tests

```bash
# Screenshot server tests
npm test

# Integration tests
npm run test:integration
```

### Manual Testing

```bash
# Terminal 1: Start test server
cd test-server
node server.js
# Runs on http://localhost:3000

# Terminal 2: Run CLI scan
cd cli
go run main.go scan --target http://localhost:3000

# Terminal 3: Or test with built binary
./viewport-cli scan --target http://localhost:3000
```

### Testing Different Platforms (Linux/macOS only)

```bash
# Use Docker to test on Linux
docker run -it golang:1.20 /bin/bash
# Inside container:
apt-get update && apt-get install -y git
git clone <repo>
cd viewport-cli
npm run build:linux
```

## Code Style

### Go Code

```bash
# Format
cd cli
go fmt ./...

# Lint
golangci-lint run ./...

# Test
go test ./...
```

### JavaScript/Node.js Code

```bash
# Format with eslint
npx eslint . --fix

# Check style
npx eslint .
```

## Making Changes

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-feature
# or for fixes:
git checkout -b fix/my-fix
```

### 2. Make Your Changes

- Keep commits small and focused
- Write clear commit messages
- Update documentation if needed
- Add tests for new features

### 3. Test Your Changes

```bash
# Build
npm run build

# Test
npm test

# Manual testing
cd test-server && node server.js &
npx viewport-cli scan --target http://localhost:3000
```

### 4. Submit a Pull Request

- Push your branch: `git push origin feature/my-feature`
- Open PR on GitHub
- Include description of changes
- Reference any related issues: "Fixes #123"

## Common Development Tasks

### Add a New CLI Command

1. Create command file in `cli/cmd/mycommand.go`
2. Implement command using Cobra framework
3. Register in `cmd/root.go`
4. Test with `go run main.go mycommand --help`

### Add a New Screenshot Server Endpoint

1. Create route in `screenshot-server/index.js`
2. Implement handler
3. Add tests in `test-integration.js`
4. Update API documentation in README

### Add a New Configuration Option

1. Update config struct in `cli/pkg/config/config.go`
2. Add to YAML file format
3. Add CLI flags in relevant command
4. Update CONFIGURATION.md

### Update Version

```bash
# Update version in:
# 1. package.json (root and screenshot-server/)
# 2. cli/cmd/root.go (const Version)

npm version patch  # or minor, major
# Creates git tag and updates files
```

## Publishing

### Before Publishing

```bash
# Update CHANGELOG.md
# Verify all tests pass
npm test

# Test locally
npm pack
npm install ./viewport-cli-x.x.x.tgz
npx viewport-cli scan --help
```

### Publishing to NPM

```bash
# Ensure you're logged in
npm login

# Create version tag
npm version patch

# Build all binaries
npm run build

# Publish
npm publish

# Create GitHub release with tag
git push origin v1.0.0
# GitHub Actions will automatically create release
```

### Publishing Canary/Beta Version

```bash
# Publish as canary
npm publish --tag canary

# Install canary version
npm install viewport-cli@canary

# Later, promote to latest
npm dist-tag add viewport-cli@1.0.0 latest
```

## Debugging

### Enable Verbose Logging

```bash
# Go CLI
DEBUG=* go run main.go scan --target http://localhost:3000

# Node.js server
DEBUG=viewport-cli:* npm start

# Node.js wrapper
DEBUG=* npx viewport-cli scan --target http://localhost:3000
```

### Debug Go Code

```bash
# Using Delve debugger
go install github.com/go-delve/delve/cmd/dlv@latest

cd cli
dlv debug
(dlv) break main.main
(dlv) continue
```

### Debug Node.js

```bash
# Using node inspector
node --inspect screenshot-server/index.js

# Open in browser: chrome://inspect
```

## Performance Profiling

### Profile Go Binary

```bash
cd cli
go build -o viewport-cli main.go

# CPU profiling
./viewport-cli scan --target http://localhost:3000 --cpuprofile=cpu.prof
go tool pprof cpu.prof

# Memory profiling
./viewport-cli scan --target http://localhost:3000 --memprofile=mem.prof
go tool pprof mem.prof
```

## Documentation

### Update Documentation

Documentation files:
- `README.md` - Main documentation
- `INSTALL.md` - Installation guide
- `NPM_PUBLISH_PLAN.md` - Publishing plan
- `PLAN.md` - Project roadmap
- `server/INTEGRATION_GUIDE.md` - Server integration

When making changes that affect users, update relevant documentation.

## Release Checklist

Before releasing a new version:

- [ ] All tests passing (`npm test`)
- [ ] All builds successful (`npm run build`)
- [ ] Code formatted (`go fmt ./...`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped (package.json, CLI)
- [ ] Git tag created
- [ ] GitHub release created
- [ ] NPM package published

## Getting Help

- **Questions?** Open a GitHub Discussion
- **Bug?** Open a GitHub Issue
- **Security issue?** Email: security@law-makers.dev

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing!**

**Happy coding! 🚀**

---

**Last Updated**: December 15, 2025  
**Maintained by**: law-makers team
