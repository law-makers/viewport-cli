package server

import (
	"context"
	"fmt"
	"net/http"
	"os/exec"
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
		serverURL: fmt.Sprintf("http://localhost:%d", port),
	}
}

// IsRunning checks if the server is already running
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

	return resp.StatusCode == 200
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

	// Spawn viewport-server process
	m.cmd = exec.CommandContext(ctx, "viewport-server", "--port", fmt.Sprintf("%d", m.port))

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
