package cmd

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/law-makers/viewport-cli/pkg/api"
	"github.com/law-makers/viewport-cli/pkg/config"
	"github.com/law-makers/viewport-cli/pkg/server"
	"github.com/spf13/cobra"
)

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
			apiURL = fmt.Sprintf("http://localhost:%d", serverPort)
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
		return fmt.Errorf("scan failed: %w", err)
	}

	elapsed := time.Since(startTime)

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

