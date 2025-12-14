package cmd

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/law-makers/viewport-cli/pkg/api"
	"github.com/law-makers/viewport-cli/pkg/config"
	"github.com/law-makers/viewport-cli/pkg/tunnel"
	"github.com/spf13/cobra"
)

var (
	targetURL  string
	port       int
	viewports  []string
	output     string
	withTunnel bool
	apiURL     string
	noDisplay  bool
)

var scanCmd = &cobra.Command{
	Use:   "scan",
	Short: "Scan a website for responsive design issues",
	Long: `Scan a website across multiple viewports to check for responsive design issues.

By default, creates a Cloudflare tunnel to expose your localhost to the backend API,
then captures screenshots at Mobile (375×667), Tablet (768×1024), and Desktop (1920×1080) sizes.

Configuration can be managed with 'viewport-cli config init' and 'viewport-cli config show'.
CLI flags override configuration file settings.`,
	RunE: runScan,
}

func init() {
	scanCmd.Flags().StringVar(&targetURL, "target", "", "Target URL to scan (e.g., http://localhost:3000)")
	scanCmd.Flags().IntVar(&port, "port", 3000, "Local port to scan (used if target not specified)")
	scanCmd.Flags().StringSliceVar(&viewports, "viewports", nil, "Viewports to test (comma-separated)")
	scanCmd.Flags().StringVar(&output, "output", "", "Output directory for results")
	scanCmd.Flags().BoolVar(&withTunnel, "tunnel", false, "Use Cloudflare Tunnel to expose localhost")
	scanCmd.Flags().StringVar(&apiURL, "api", "", "Backend API endpoint")
	scanCmd.Flags().BoolVar(&noDisplay, "no-display", false, "Don't display results, just save")

	// Mark required flags
	scanCmd.MarkFlagRequired("target")
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

	if apiURL == "" && cfg != nil {
		apiURL = cfg.API.URL
	} else if apiURL == "" {
		apiURL = "http://localhost:8787"
	}

	// Check if tunnel flag was explicitly set, otherwise use config value
	if !cmd.Flags().Changed("tunnel") && cfg != nil {
		withTunnel = cfg.Scan.Tunnel
	}

	// If no target specified but port is, construct localhost URL
	if targetURL == "" && port > 0 {
		targetURL = fmt.Sprintf("http://localhost:%d", port)
	}

	if targetURL == "" {
		return fmt.Errorf("either --target or --port must be specified")
	}

	// Parse URL to handle tunnel if target is localhost
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return fmt.Errorf("invalid target URL: %w", err)
	}

	tunnelURL := ""
	var tm *tunnel.TunnelManager

	// If target is localhost and tunnel is enabled, create tunnel
	if withTunnel && (parsedURL.Hostname() == "localhost" || parsedURL.Hostname() == "127.0.0.1") {
		fmt.Println("🌐 Setting up Cloudflare Tunnel...")

		// Extract port from target URL or use default
		localPort := 3000
		if parsedURL.Port() != "" {
			fmt.Sscanf(parsedURL.Port(), "%d", &localPort)
		}

		// Create tunnel manager
		tunnelConfig := tunnel.TunnelConfig{
			Name:      "viewport-scan",
			LocalPort: localPort,
		}

		tm, err = tunnel.NewTunnelManager(tunnelConfig)
		if err != nil {
			return fmt.Errorf("failed to create tunnel manager: %w", err)
		}

		// Start tunnel
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		tunnelURL, err = tm.Start(ctx)
		cancel()

		if err != nil {
			return fmt.Errorf("failed to start tunnel: %w", err)
		}

		fmt.Printf("✅ Tunnel created: %s\n\n", lipgloss.NewStyle().Foreground(lipgloss.Color("6")).Render(tunnelURL))

		// Update target URL to use tunnel
		targetURL = tunnelURL + parsedURL.Path
	}

	// Display startup info
	fmt.Printf("\n%s\n", lipgloss.NewStyle().Bold(true).Render("🎯 ViewPort-CLI Scan"))
	fmt.Printf("Target: %s\n", lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render(targetURL))
	fmt.Printf("API: %s\n", lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render(apiURL))
	fmt.Printf("Output: %s\n\n", lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render(output))

	// Display which viewports
	fmt.Printf("Viewports: %v\n\n", viewports)


	// Create API client
	client := api.NewClient(apiURL)

	// Convert viewport names to uppercase for API
	viewportsAPI := make([]string, len(viewports))
	for i, v := range viewports {
		switch v {
		case "mobile":
			viewportsAPI[i] = "MOBILE"
		case "tablet":
			viewportsAPI[i] = "TABLET"
		case "desktop":
			viewportsAPI[i] = "DESKTOP"
		default:
			viewportsAPI[i] = v // pass through as-is
		}
	}

	// Create scan request
	req := &api.ScanRequest{
		TargetURL: targetURL,
		Viewports: viewportsAPI,
		Options: &api.ScanOptions{
			FullPage: true,
		},
	}

	// Show loading message
	fmt.Println("📸 Capturing screenshots...")
	startTime := time.Now()

	// Send scan request
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	resp, err := client.Scan(ctx, req)
	if err != nil {
		// Clean up tunnel if it was created
		if tm != nil {
			cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
			tm.Stop(cleanupCtx)
			cleanupCancel()
		}
		return fmt.Errorf("scan failed: %w", err)
	}

	// Clean up tunnel if it was created
	if tm != nil {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
		tm.Stop(cleanupCtx)
		cleanupCancel()
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
