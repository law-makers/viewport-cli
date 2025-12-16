package cmd

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/law-makers/viewport-cli/pkg/api"
	"github.com/law-makers/viewport-cli/pkg/config"
	"github.com/law-makers/viewport-cli/pkg/server"
	"github.com/spf13/cobra"
)

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

var (
	targetURL string
	port      int
	serverPort int
	viewports []string
	output    string
	apiURL    string
	noDisplay bool
	autoStart bool
)

var scanCmd = &cobra.Command{
	Use:   "scan",
	Short: "Scan a website for responsive design issues",
	Long: `Scan a website across multiple viewports to check for responsive design issues.

Captures screenshots at Mobile (375×667), Tablet (768×1024), and Desktop (1920×1080) sizes.
The local screenshot server is automatically started if not already running.

Configuration can be managed with 'viewport-cli config init' and 'viewport-cli config show'.
CLI flags override configuration file settings.`,
	RunE: runScan,
}

func init() {
	scanCmd.Flags().StringVar(&targetURL, "target", "", "Target URL to scan (e.g., http://localhost:3000)")
	scanCmd.Flags().IntVar(&port, "port", 3000, "Local port to scan (used if target not specified)")
	scanCmd.Flags().IntVar(&serverPort, "server-port", 3001, "Screenshot server port")
	scanCmd.Flags().StringSliceVar(&viewports, "viewports", nil, "Viewports to test (comma-separated)")
	scanCmd.Flags().StringVar(&output, "output", "", "Output directory for results")
	scanCmd.Flags().StringVar(&apiURL, "api", "", "Screenshot server endpoint (overrides --server-port)")
	scanCmd.Flags().BoolVar(&noDisplay, "no-display", false, "Don't display results, just save")
	scanCmd.Flags().BoolVar(&autoStart, "no-auto-start", false, "Don't auto-start the screenshot server")
}

func runScan(cmd *cobra.Command, args []string) error {
	// Load configuration
	cfg, err := config.LoadConfig("")
	if err != nil {
		// Just warn, don't fail - use defaults if config doesn't exist
		fmt.Printf("%s Warning: Could not load config: %v (using defaults)\n", 
			lipgloss.NewStyle().Foreground(lipgloss.Color("3")).Render("⚠️ "), err)
	}

	// Apply config defaults if flags weren't explicitly set
	if output == "" && cfg != nil {
		output = cfg.Scan.Output
	} else if output == "" {
		output = "./viewport-results"
	}

	if len(viewports) == 0 && cfg != nil {
		viewports = cfg.Scan.Viewports
	} else if len(viewports) == 0 {
		viewports = []string{"mobile", "tablet", "desktop"}
	}

	// Determine API URL (--api flag takes precedence over --server-port)
	if apiURL == "" {
		if cfg != nil && cfg.API.URL != "" {
			apiURL = cfg.API.URL
		} else {
			apiURL = fmt.Sprintf("http://127.0.0.1:%d", serverPort)
		}
	}

	// If no target specified but port is, construct localhost URL
	if targetURL == "" && port > 0 {
		targetURL = fmt.Sprintf("http://localhost:%d", port)
	}

	if targetURL == "" {
		return fmt.Errorf("either --target or --port must be specified")
	}

	// Display startup info
	fmt.Printf("\n%s\n", lipgloss.NewStyle().Bold(true).Render("🎯 ViewPort-CLI Scan"))
	fmt.Printf("Target: %s\n", lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render(targetURL))
	fmt.Printf("Screenshot Server: %s\n", lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render(apiURL))
	fmt.Printf("Output: %s\n\n", lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render(output))

	// Display which viewports
	fmt.Printf("Viewports: %v\n\n", viewports)

	// Setup server manager
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle Ctrl+C gracefully
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		cancel()
	}()

	// Auto-start server if needed
	var serverManager *server.Manager
	if !noDisplay {
		// Extract port from apiURL
		var sPort int
		fmt.Sscanf(apiURL, "http://localhost:%d", &sPort)
		if sPort == 0 {
			sPort = serverPort
		}

		serverManager = server.NewManager(sPort)
		if err := serverManager.Start(ctx, true); err != nil {
			// Not fatal - server might already be running or might be on different host
			fmt.Printf("⚠️ Warning: Could not auto-start server: %v\n", err)
			fmt.Printf("   Continuing anyway - server may already be running\n\n")
		} else {
			// Register cleanup
			defer func() {
				if serverManager != nil {
					serverManager.Stop()
				}
			}()
		}
	}

	// Create API client
	client := api.NewClient(apiURL)

	// Create scan request (viewports are kept as-is, lowercase)
	req := &api.ScanRequest{
		TargetURL: targetURL,
		Viewports: viewports,
		Options: &api.ScanOptions{
			FullPage: true,
		},
	}

	// Show loading message
	fmt.Println("📸 Capturing screenshots...")
	startTime := time.Now()

	// Send scan request
	scanCtx, scanCancel := context.WithTimeout(ctx, 180*time.Second)
	defer scanCancel()

	resp, err := client.Scan(scanCtx, req)
	if err != nil {
		// Enhanced error reporting
		fmt.Printf("\n%s\n", lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("1")).Render("❌ Scan Failed"))
		fmt.Printf("Error: %v\n\n", err)
		
		// Check for Firefox/Playwright related errors
		errStr := err.Error()
		if contains(errStr, "Executable doesn't exist") || contains(errStr, "firefox") {
			fmt.Printf("⚠️  Firefox browser binaries not found\n\n")
			fmt.Printf("Solutions:\n")
			fmt.Printf("  1. Install Firefox binaries:\n")
			fmt.Printf("     npx playwright install firefox\n\n")
			fmt.Printf("  2. Or install with system dependencies:\n")
			fmt.Printf("     npx playwright install --with-deps firefox\n\n")
			fmt.Printf("  3. If you're on Windows and Playwright was already installed,\n")
			fmt.Printf("     try reinstalling:\n")
			fmt.Printf("     npm install --force\n")
		} else if contains(errStr, "missing dependencies") || contains(errStr, "libxcb") || 
		   contains(errStr, "libx11") || contains(errStr, "libgtk") {
			fmt.Printf("⚠️  System dependencies missing (common in Docker, IDX, or restricted containers)\n\n")
			fmt.Printf("Solutions:\n")
			fmt.Printf("  1. Install deps: sudo npx playwright install-deps\n")
			fmt.Printf("  2. Use xvfb-run wrapper: xvfb-run npx viewport-cli scan --target <url>\n")
			fmt.Printf("  3. Use in environment with system libraries (Linux desktop, native OS)\n")
		}
		
		fmt.Printf("\nDiagnostics:\n")
		fmt.Printf("  • Target URL: %s\n", targetURL)
		fmt.Printf("  • API Server: %s\n", apiURL)
		fmt.Printf("  • Viewports: %v\n", viewports)
		fmt.Printf("  • Output Dir: %s\n", output)
		
		// Attempt to kill server on error if we started it
		if serverManager != nil {
			fmt.Printf("\nCleaning up screenshot server on port %d...\n", serverPort)
			if err := serverManager.Stop(); err != nil {
				fmt.Printf("  ⚠️  Error stopping server: %v\n", err)
			} else {
				fmt.Printf("  ✅ Server stopped\n")
			}
		}
		
		fmt.Println()
		return fmt.Errorf("scan failed")
	}

	elapsed := time.Since(startTime)

	// Validate that we actually got screenshots with data
	hasValidScreenshots := false
	for _, result := range resp.Results {
		if len(result.ScreenshotBase64) > 0 {
			hasValidScreenshots = true
			break
		}
	}
	
	if !hasValidScreenshots {
		// Enhanced error reporting for empty screenshots
		fmt.Printf("\n%s\n", lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("1")).Render("❌ Scan Failed"))
		fmt.Printf("Error: All screenshots are empty - browser may not have captured anything\n\n")
		fmt.Printf("Diagnostics:\n")
		fmt.Printf("  • Target URL: %s\n", targetURL)
		fmt.Printf("  • API Server: %s\n", apiURL)
		fmt.Printf("  • Viewports: %v\n", viewports)
		fmt.Printf("  • Output Dir: %s\n", output)
		fmt.Printf("\nSolutions:\n")
		fmt.Printf("  1. Verify the target URL is accessible: curl %s\n", targetURL)
		fmt.Printf("  2. Check that Firefox binaries are installed: npx playwright install --with-deps firefox\n")
		fmt.Printf("  3. Try increasing timeout: viewport-cli scan --target %s --server-port 3002\n\n", targetURL)
		
		// Attempt to kill server on error if we started it
		if serverManager != nil {
			fmt.Printf("Cleaning up screenshot server on port %d...\n", serverPort)
			if err := serverManager.Stop(); err != nil {
				fmt.Printf("  ⚠️  Error stopping server: %v\n", err)
			} else {
				fmt.Printf("  ✅ Server stopped\n")
			}
		}
		
		fmt.Println()
		return fmt.Errorf("scan failed: all screenshots are empty")
	}

	// Display results
	fmt.Printf("\n%s\n", lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("2")).Render("✅ Scan Complete!"))
	fmt.Printf("Duration: %.2fs\n", elapsed.Seconds())
	fmt.Printf("Scan ID: %s\n", lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render(resp.ScanID))
	fmt.Printf("Status: %s\n\n", resp.Status)

	// Display results table with proper alignment
	fmt.Println("Results:")
	fmt.Println("┌──────────┬────────────┬────────┐")
	fmt.Println("│ Device   │ Size       │ Issues │")
	fmt.Println("├──────────┼────────────┼────────┤")
	for _, result := range resp.Results {
		// Format size with proper spacing (e.g., "1920×1080")
		sizeStr := fmt.Sprintf("%d×%d", result.Dimensions.Width, result.Dimensions.Height)
		fmt.Printf("│ %-8s │ %-10s │ %6d │\n",
			result.Device,
			sizeStr,
			len(result.Issues),
		)
	}
	fmt.Println("└──────────┴────────────┴────────┘")

	// Save results
	fmt.Printf("\n💾 Saving results to %s/\n", output)
	if err := saveResults(resp, output); err != nil {
		fmt.Printf("⚠️  Warning: Failed to save results: %v\n", err)
	} else {
		fmt.Println("✅ Results saved successfully!")
	}

	fmt.Println()
	return nil
}

func saveResults(resp *api.ScanResponse, outputDir string) error {
	// Create scan directory
	scanDir := fmt.Sprintf("%s/%s", outputDir, resp.ScanID)
	if err := os.MkdirAll(scanDir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Save metadata
	metadataFile := fmt.Sprintf("%s/metadata.json", scanDir)
	metadataJSON, err := json.MarshalIndent(resp, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	if err := os.WriteFile(metadataFile, metadataJSON, 0644); err != nil {
		return fmt.Errorf("failed to write metadata: %w", err)
	}

	// Decode and save screenshots
	for _, result := range resp.Results {
		screenshotFile := fmt.Sprintf("%s/%s.png", scanDir, result.Device)
		screenshotData, err := base64.StdEncoding.DecodeString(result.ScreenshotBase64)
		if err != nil {
			return fmt.Errorf("failed to decode screenshot: %w", err)
		}
		if err := os.WriteFile(screenshotFile, screenshotData, 0644); err != nil {
			return fmt.Errorf("failed to write screenshot: %w", err)
		}
	}

	return nil
}

