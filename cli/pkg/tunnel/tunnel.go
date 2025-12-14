package tunnel

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// TunnelConfig holds configuration for Cloudflare tunnel
type TunnelConfig struct {
	Name      string // Tunnel name (unused with cloudflared, kept for compatibility)
	LocalPort int    // Local port to expose (e.g., 3000)
}

// TunnelManager handles tunnel creation and management using cloudflared CLI
type TunnelManager struct {
	config    TunnelConfig
	cmd       *exec.Cmd
	tunnelURL string
}

// NewTunnelManager creates a new tunnel manager instance
func NewTunnelManager(config TunnelConfig) (*TunnelManager, error) {
	// Verify local port is accessible
	if !isLocalPortAccessible("127.0.0.1", config.LocalPort) && !isLocalPortAccessible("localhost", config.LocalPort) {
		return nil, fmt.Errorf("local port %d is not accessible", config.LocalPort)
	}

	return &TunnelManager{
		config: config,
	}, nil
}

// Start creates a tunnel and returns the public URL
func (tm *TunnelManager) Start(ctx context.Context) (string, error) {
	// Check if cloudflared is installed
	if !isCloudflaredInstalled() {
		return "", fmt.Errorf("cloudflared not installed. Please install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/")
	}

	// Start cloudflared tunnel with output capture
	cmd := exec.CommandContext(
		ctx,
		"cloudflared",
		"tunnel",
		"--url", fmt.Sprintf("http://127.0.0.1:%d", tm.config.LocalPort),
		"--no-tls-verify",
	)

	// Create a pipe to read command output
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	// Combine stderr and stdout
	cmd.Stderr = cmd.Stdout

	// Start the command
	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to start cloudflared: %w", err)
	}

	tm.cmd = cmd

	// Read output to find tunnel URL
	scanner := bufio.NewScanner(stdout)
	tunnelURL := ""
	timeoutChan := time.After(15 * time.Second)

	for scanner.Scan() {
		line := scanner.Text()

		// Look for tunnel URL in output
		if url := extractTunnelURL(line); url != "" {
			tunnelURL = url
			break
		}

		// Exit early if we see the tunnel is ready
		if strings.Contains(line, "Tunnel credentials") || strings.Contains(line, "Your quick tunnel") {
			// Give it a moment to fully initialize
			time.Sleep(1 * time.Second)
			break
		}

		select {
		case <-timeoutChan:
			tm.cmd.Process.Kill()
			return "", fmt.Errorf("timeout waiting for tunnel URL")
		default:
		}
	}

	if tunnelURL == "" {
		tm.cmd.Process.Kill()
		return "", fmt.Errorf("could not extract tunnel URL from cloudflared output")
	}

	tm.tunnelURL = tunnelURL
	return tunnelURL, nil
}

// Stop terminates the tunnel
func (tm *TunnelManager) Stop(ctx context.Context) error {
	if tm.cmd == nil || tm.cmd.Process == nil {
		return nil
	}

	// Try graceful termination first
	tm.cmd.Process.Signal(os.Interrupt)

	// Wait for process to exit
	done := make(chan error, 1)
	go func() {
		done <- tm.cmd.Wait()
	}()

	select {
	case <-time.After(5 * time.Second):
		// Force kill if it doesn't exit gracefully
		tm.cmd.Process.Kill()
	case <-done:
		// Process exited gracefully
	}

	return nil
}

// GetTunnelURL returns the public tunnel URL
func (tm *TunnelManager) GetTunnelURL() string {
	return tm.tunnelURL
}

// isLocalPortAccessible checks if the local port is accessible
func isLocalPortAccessible(host string, port int) bool {
	addr := fmt.Sprintf("%s:%d", host, port)
	conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}
// isCloudflaredInstalled checks if cloudflared CLI is available
func isCloudflaredInstalled() bool {
	cmd := exec.Command("which", "cloudflared")
	return cmd.Run() == nil
}

// extractTunnelURL parses a single line looking for tunnel URL
func extractTunnelURL(line string) string {
	// Look for pattern like "https://xxx-xxx-xxx.trycloudflare.com"
	re := regexp.MustCompile(`https://[a-zA-Z0-9\-]+\.trycloudflare\.com`)
	match := re.FindString(line)
	return match
}