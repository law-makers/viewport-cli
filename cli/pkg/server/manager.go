package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
)

// Manager handles the lifecycle of the screenshot server
type Manager struct {
	port      int
	serverURL string
	cmd       *exec.Cmd
}

// NewManager creates a new server manager
func NewManager(port int) *Manager {
	return &Manager{
		port:      port,
		serverURL: fmt.Sprintf("http://127.0.0.1:%d", port),
	}
}

// IsRunning checks if the server is already running and healthy
func (m *Manager) IsRunning(ctx context.Context, timeout time.Duration) bool {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", m.serverURL, nil)
	if err != nil {
		return false
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// Accept 200 (OK) - server is ready
	// Accept 503 (Service Unavailable) - server is responding but browser init failed
	// This is still a successful health check - the server is running and accessible
	return resp.StatusCode == 200 || resp.StatusCode == 503
}

// findViewportServerExecutable tries multiple methods to find viewport-server
func findViewportServerExecutable() string {
	// Method 1: Try 'viewport-server' directly (should be in PATH from npm)
	if _, err := exec.LookPath("viewport-server"); err == nil {
		return "viewport-server"
	}

	// Method 2: Try 'npx viewport-server'
	if _, err := exec.LookPath("npx"); err == nil {
		return "npx"
	}

	// Method 3: Try to find it relative to the executable (development mode)
	exePath, err := os.Executable()
	if err == nil {
		// Look for viewport-server in npm module directory
		// This would be: node_modules/.bin/viewport-server or similar
		possiblePaths := []string{
			filepath.Join(filepath.Dir(exePath), "..", "..", "node_modules", ".bin", "viewport-server"),
			filepath.Join(filepath.Dir(exePath), "..", "..", "bin", "viewport-server.js"),
		}

		for _, p := range possiblePaths {
			if _, err := os.Stat(p); err == nil {
				return p
			}
		}
	}

	// Fallback
	return "viewport-server"
}

// getViewportServerCommand creates the appropriate exec.Cmd for starting the server
func getViewportServerCommand(ctx context.Context, port int) *exec.Cmd {
	executable := findViewportServerExecutable()

	// If we found npx, use it
	if executable == "npx" {
		return exec.CommandContext(ctx, "npx", "viewport-server", "--port", fmt.Sprintf("%d", port))
	}

	// Otherwise, use the executable directly
	return exec.CommandContext(ctx, executable, "--port", fmt.Sprintf("%d", port))
}

// Start spawns the screenshot server
func (m *Manager) Start(ctx context.Context, verbose bool) error {
	// Check if already running
	if m.IsRunning(ctx, 2*time.Second) {
		if verbose {
			fmt.Printf("✅ Screenshot server already running on %s\n\n", m.serverURL)
		}
		return nil
	}

	if verbose {
		fmt.Printf("⏳ Starting screenshot server on port %d...\n", m.port)
	}

	// Spawn viewport-server process with intelligent command resolution
	m.cmd = getViewportServerCommand(ctx, m.port)

	// Run detached from this process
	if err := m.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start screenshot server: %w", err)
	}

	// Wait for server to be ready (poll health endpoint)
	if verbose {
		fmt.Printf("⏳ Waiting for server health check...\n")
	}

	maxAttempts := 30
	for i := 0; i < maxAttempts; i++ {
		if m.IsRunning(ctx, 2*time.Second) {
			if verbose {
				fmt.Printf("✅ Screenshot server ready on %s\n\n", m.serverURL)
			}
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}

	m.cmd.Process.Kill()
	return fmt.Errorf("screenshot server failed to start after %d seconds", maxAttempts/2)
}

// GetURL returns the server URL
func (m *Manager) GetURL() string {
	return m.serverURL
}

// Stop gracefully stops the server
func (m *Manager) Stop() error {
	if m.cmd == nil || m.cmd.Process == nil {
		return nil
	}

	// Try graceful shutdown first with SIGTERM
	m.cmd.Process.Signal(syscall.SIGTERM)

	// Wait up to 5 seconds for graceful shutdown
	done := make(chan error, 1)
	go func() {
		done <- m.cmd.Wait()
	}()

	select {
	case <-time.After(5 * time.Second):
		// Force kill if still running
		m.cmd.Process.Kill()
		<-done
	case <-done:
	}

	return nil
}

// Kill forcefully kills the server
func (m *Manager) Kill() error {
	if m.cmd == nil || m.cmd.Process == nil {
		return nil
	}
	return m.cmd.Process.Kill()
}
