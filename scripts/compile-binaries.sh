#!/bin/bash

##
# Compile ViewPort-CLI for multiple platforms
#
# This script builds the Go CLI binary for all supported platforms:
# - Linux (x64, arm64)
# - macOS (x64, arm64)  
# - Windows (x64)
#
# Usage: bash scripts/compile-binaries.sh
##

# NOTE: Using 'set -e' only in specific sections to allow graceful failure handling

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CLI_DIR="cli"
BIN_DIR="bin/platform-binaries"

# For local development, build only the current platform
# CI/CD will build all platforms on version tags
BUILD_ALL_PLATFORMS="${BUILD_ALL_PLATFORMS:-false}"

if [ "$BUILD_ALL_PLATFORMS" = "true" ]; then
  TARGETS=(
    "linux:amd64:linux-x64"
    "linux:arm64:linux-arm64"
    "darwin:amd64:macos-x64"
    "darwin:arm64:macos-arm64"
    "windows:amd64:windows-x64"
  )
else
  # Only build for current platform (faster for local dev)
  case "$(uname)" in
    Linux)
      case "$(uname -m)" in
        x86_64)
          TARGETS=("linux:amd64:linux-x64")
          ;;
        aarch64)
          TARGETS=("linux:arm64:linux-arm64")
          ;;
        *)
          echo "Unsupported architecture: $(uname -m)"
          exit 1
          ;;
      esac
      ;;
    Darwin)
      case "$(uname -m)" in
        x86_64)
          TARGETS=("darwin:amd64:macos-x64")
          ;;
        arm64)
          TARGETS=("darwin:arm64:macos-arm64")
          ;;
        *)
          echo "Unsupported architecture: $(uname -m)"
          exit 1
          ;;
      esac
      ;;
    *)
      echo "Unsupported OS: $(uname)"
      exit 1
      ;;
  esac
fi

# Helper functions
log_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Check if Go is installed
check_go() {
  if ! command -v go &> /dev/null; then
    log_error "Go is not installed. Please install Go 1.20 or later."
    exit 1
  fi
  
  GO_VERSION=$(go version | awk '{print $3}')
  log_success "Found Go $GO_VERSION"
}

# Build binary for a specific platform
build_binary() {
  local GOOS=$1
  local GOARCH=$2
  local OUTPUT_DIR=$3
  local OUTPUT_FILE=$4
  
  local FULL_OUTPUT="${BIN_DIR}/${OUTPUT_DIR}/${OUTPUT_FILE}"
  
  log_info "Building for ${GOOS}-${GOARCH}..."
  
  # Create output directory
  mkdir -p "${BIN_DIR}/${OUTPUT_DIR}"
  
  # Build with size optimization (with timeout)
  if timeout 120 bash -c "cd '$CLI_DIR' && GOOS=$GOOS GOARCH=$GOARCH go build -ldflags='-s -w' -o '../$FULL_OUTPUT' main.go" 2>/dev/null; then
    # Check file size
    if [ -f "$FULL_OUTPUT" ]; then
      SIZE=$(du -h "$FULL_OUTPUT" | cut -f1)
      log_success "Built: $FULL_OUTPUT ($SIZE)"
      return 0
    else
      log_error "Failed to build: $FULL_OUTPUT"
      return 1
    fi
  else
    log_error "Build timeout or failed for ${GOOS}-${GOARCH}"
    return 1
  fi
}

# Compress binary with UPX if available
compress_binary() {
  local BINARY_PATH=$1
  local PLATFORM=$2
  
  # Skip compression on Windows (not needed)
  if [[ "$PLATFORM" == "windows"* ]]; then
    return 0
  fi
  
  # Check if UPX is available
  if ! command -v upx &> /dev/null; then
    log_warn "UPX not found, skipping compression"
    return 0
  fi
  
  log_info "Compressing ${BINARY_PATH}..."
  
  if upx --best --lzma "$BINARY_PATH" 2>/dev/null; then
    SIZE=$(du -h "$BINARY_PATH" | cut -f1)
    log_success "Compressed: $BINARY_PATH ($SIZE)"
  else
    log_warn "Failed to compress $BINARY_PATH (continuing anyway)"
  fi
}

# Generate checksums
generate_checksums() {
  log_info "Generating checksums..."
  
  if command -v sha256sum &> /dev/null; then
    sha256sum $(find "$BIN_DIR" -type f -executable -o -name "*.exe") > checksums.sha256
  elif command -v shasum &> /dev/null; then
    find "$BIN_DIR" -type f \( -executable -o -name "*.exe" \) -exec shasum -a 256 {} \; > checksums.sha256
  else
    log_warn "Could not generate checksums - sha256sum or shasum not found"
    return 1
  fi
  
  log_success "Checksums generated: checksums.sha256"
}

# Main build process
main() {
  echo ""
  echo -e "${CYAN}🔨 ViewPort-CLI Binary Compilation${NC}"
  echo ""
  
  # Check prerequisites
  check_go
  
  # Clean previous builds
  log_info "Cleaning previous builds..."
  rm -rf "$BIN_DIR"
  log_success "Cleaned"
  echo ""
  
  # Build for each target
  local BUILD_COUNT=0
  local FAIL_COUNT=0
  
  for TARGET in "${TARGETS[@]}"; do
    IFS=':' read -r GOOS GOARCH OUTPUT_DIR <<< "$TARGET"
    
    # Determine output filename
    local OUTPUT_FILE="viewport-cli"
    if [ "$GOOS" = "windows" ]; then
      OUTPUT_FILE="viewport-cli.exe"
    fi
    
    # Build binary (continue even if some fail)
    if build_binary "$GOOS" "$GOARCH" "$OUTPUT_DIR" "$OUTPUT_FILE"; then
      BINARY="${BIN_DIR}/${OUTPUT_DIR}/${OUTPUT_FILE}"
      
      # Compress if not Windows
      if [ "$GOOS" != "windows" ]; then
        compress_binary "$BINARY" "$GOOS"
      fi
      
      ((BUILD_COUNT++))
    else
      # Log warning but continue
      log_warn "Skipping ${GOOS}-${GOARCH} (may require different toolchain)"
      ((FAIL_COUNT++))
    fi
  done
  
  echo ""
  
  # Generate checksums (only for binaries that were built)
  if [ $BUILD_COUNT -gt 0 ]; then
    if generate_checksums; then
      :
    fi
  fi
  
  echo ""
  
  # Summary
  if [ $BUILD_COUNT -gt 0 ]; then
    log_success "${BUILD_COUNT} binary(ies) built successfully!"
    
    if [ "$BUILD_ALL_PLATFORMS" != "true" ]; then
      log_info "Built for current platform. For all platforms, use:"
      log_info "  BUILD_ALL_PLATFORMS=true npm run build"
      log_info "Or use GitHub Actions CI/CD for multi-platform builds"
    fi
    
    if [ $FAIL_COUNT -gt 0 ]; then
      log_warn "${FAIL_COUNT} platforms skipped"
    fi
    
    echo ""
    log_info "Built binaries:"
    find "$BIN_DIR" -type f \( -executable -o -name "*.exe" \) | sort | while read -r file; do
      SIZE=$(du -h "$file" | cut -f1)
      echo "  $file ($SIZE)"
    done
    echo ""
    return 0
  else
    log_error "No binaries built. Check Go installation and try again."
    return 1
  fi
}

# Run main
main
exit $?
