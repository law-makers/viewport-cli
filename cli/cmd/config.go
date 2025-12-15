package cmd

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/law-makers/viewport-cli/pkg/config"
	"github.com/law-makers/viewport-cli/pkg/results"
	"github.com/spf13/cobra"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Manage configuration",
	Long:  `Initialize and manage ViewPort-CLI configuration.`,
}

var configInitCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize .viewport.yaml configuration file",
	Long: `Create a new .viewport.yaml configuration file with default settings.
	
This will create a config file in your home directory (.config/viewport-cli/.viewport.yaml)
or in the current directory if home directory is not accessible.`,
	RunE: runConfigInit,
}

var configShowCmd = &cobra.Command{
	Use:   "show",
	Short: "Show current configuration",
	Long:  `Display the current configuration being used.`,
	RunE: runConfigShow,
}

var resultsCmd = &cobra.Command{
	Use:   "results",
	Short: "Manage scan results",
	Long:  `View and manage previously saved scan results.`,
}

var resultsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all saved scan results",
	Long:  `Display a list of all previous scans with summary information.`,
	RunE: runResultsList,
}

func init() {
	configCmd.AddCommand(configInitCmd)
	configCmd.AddCommand(configShowCmd)
	resultsCmd.AddCommand(resultsListCmd)
}

func runConfigInit(cmd *cobra.Command, args []string) error {
	reader := bufio.NewReader(os.Stdin)

	// 1. Check if config already exists
	configPath, err := config.GetConfigPath()
	if err != nil {
		return fmt.Errorf("failed to determine config path: %w", err)
	}

	if _, err := os.Stat(configPath); err == nil {
		fmt.Printf("Configuration file already exists at %s\n", configPath)
		if !promptBool(reader, "Do you want to overwrite it?", false) {
			fmt.Println("Operation cancelled.")
			return nil
		}
	}

	// Header
	fmt.Printf("\n%s\n\n", lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("6")).Render("⚙️  ViewPort-CLI Configuration Wizard"))
	fmt.Println("Press [Enter] to accept the default values in brackets.")
	fmt.Println()

	// 2. Load Default Config
	cfg := config.DefaultConfig()

	// 3. Questions
	// API Configuration
	fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render("📡 API Configuration"))
	cfg.API.URL = promptString(reader, "API Endpoint", cfg.API.URL)
	fmt.Println()

	// Scan Configuration
	fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render("📸 Scan Configuration"))
	
	// Handle Viewports (CSV)
	defaultViewports := strings.Join(cfg.Scan.Viewports, ",")
	viewportsInput := promptString(reader, "Default Viewports (comma separated)", defaultViewports)
	cfg.Scan.Viewports = parseCSV(viewportsInput)

	cfg.Scan.Output = promptString(reader, "Output Directory", cfg.Scan.Output)
	
	// Handle Timeout (Int)
	cfg.Scan.Timeout = promptInt(reader, "Timeout (seconds)", cfg.Scan.Timeout)
	fmt.Println()

	// Display Settings
	fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render("🎨 Display Settings"))
	cfg.Display.Verbose = promptBool(reader, "Enable Verbose Logging?", cfg.Display.Verbose)
	fmt.Println()

	// 4. Save Config
	if err := config.SaveConfig(cfg, configPath); err != nil {
		return fmt.Errorf("failed to save config: %w", err)
	}

	fmt.Printf("%s %s\n\n", 
		lipgloss.NewStyle().Foreground(lipgloss.Color("2")).Render("✅"),
		lipgloss.NewStyle().Bold(true).Render(fmt.Sprintf("Configuration saved to: %s", configPath)))

	return nil
}

// --- Helper Functions ---

// promptString asks a question and returns the string. Returns default if empty.
func promptString(r *bufio.Reader, label string, def string) string {
	inputStr := fmt.Sprintf("%s [%s]: ", label, lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render(def))
	fmt.Print(inputStr)

	input, _ := r.ReadString('\n')
	input = strings.TrimSpace(input)

	if input == "" {
		return def
	}
	return input
}

// promptBool asks a yes/no question.
func promptBool(r *bufio.Reader, label string, def bool) bool {
	// Visual indicator of capital letter shows default (e.g., [Y/n] or [y/N])
	options := "[Y/n]"
	if !def {
		options = "[y/N]"
	}

	fmt.Printf("%s %s: ", label, lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render(options))

	input, _ := r.ReadString('\n')
	input = strings.TrimSpace(strings.ToLower(input))

	if input == "" {
		return def
	}

	return input == "y" || input == "yes"
}

// promptInt asks for an integer.
func promptInt(r *bufio.Reader, label string, def int) int {
	for {
		inputStr := fmt.Sprintf("%s [%s]: ", label, lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render(strconv.Itoa(def)))
		fmt.Print(inputStr)

		input, _ := r.ReadString('\n')
		input = strings.TrimSpace(input)

		if input == "" {
			return def
		}

		val, err := strconv.Atoi(input)
		if err == nil {
			return val
		}
		fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("1")).Render("Please enter a valid number."))
	}
}

func parseCSV(input string) []string {
	parts := strings.Split(input, ",")
	var result []string
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func runConfigShow(cmd *cobra.Command, args []string) error {
	fmt.Printf("\n%s\n\n", lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("6")).Render("⚙️  Current Configuration"))

	// Load config
	cfg, err := config.LoadConfig("")
	if err != nil {
		fmt.Printf("%s Error loading config: %v\n\n", 
			lipgloss.NewStyle().Foreground(lipgloss.Color("1")).Render("⚠️ "),
			err)
		return nil
	}

	// Display API configuration
	fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render("📡 API Configuration"))
	fmt.Printf("  • Endpoint: %s\n", lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render(cfg.API.URL))
	fmt.Println()

	// Display scan configuration
	fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render("📸 Scan Configuration"))
	fmt.Printf("  • Viewports: %v\n", cfg.Scan.Viewports)
	fmt.Printf("  • Output: %s\n", cfg.Scan.Output)
	fmt.Printf("  • Timeout: %ds\n", cfg.Scan.Timeout)
	fmt.Println()

	// Display display settings
	fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("4")).Render("🎨 Display Settings"))
	fmt.Printf("  • Verbose: %v\n", cfg.Display.Verbose)
	fmt.Printf("  • Colors: %v\n", !cfg.Display.NoColor)
	fmt.Printf("  • Tables: %v\n", !cfg.Display.NoTable)
	fmt.Println()

	// Show where config is loaded from
	configPath, _ := config.GetConfigPath()
	if _, err := os.Stat(configPath); err == nil {
		fmt.Printf("%s Configuration file: %s\n\n",
			lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render("📄"),
			configPath)
	} else {
		fmt.Printf("%s Using default configuration (no config file found)\n\n",
			lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render("📄"))
	}

	return nil
}

func runResultsList(cmd *cobra.Command, args []string) error {
	// Load config to get output directory
	cfg, err := config.LoadConfig("")
	if err != nil {
		cfg = &config.Config{}
		cfg.Scan.Output = "./viewport-results"
	}

	// Get scan list
	scans, err := results.ListScans(cfg.Scan.Output)
	if err != nil {
		return fmt.Errorf("failed to list scans: %w", err)
	}

	// Display header
	fmt.Printf("\n%s\n\n", lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("6")).Render("📋 Previous Scans"))

	if len(scans) == 0 {
		fmt.Printf("%s No scans found in %s\n\n",
			lipgloss.NewStyle().Foreground(lipgloss.Color("3")).Render("ℹ️ "),
			cfg.Scan.Output)
		return nil
	}

	// Display scans table
	fmt.Println("┌────┬──────────────────────────────────┬──────────────────────┬──────────────┬────────┐")
	fmt.Println("│    │ Scan ID                          │ Timestamp            │ Viewports    │ Issues │")
	fmt.Println("├────┼──────────────────────────────────┼──────────────────────┼──────────────┼────────┤")

	for _, scan := range scans {
		// Format timestamp
		timeStr := scan.Timestamp.Format("2006-01-02 15:04")

		// Format viewports
		viewportsStr := strings.Join(scan.Viewports, ",")
		if len(viewportsStr) > 12 {
			viewportsStr = viewportsStr[:9] + "..."
		}

		// Status indicator
		statusIcon := "✅"
		if scan.Status != "SUCCESS" {
			statusIcon = "⚠️"
		}

		fmt.Printf("│ %s │ %-28s │ %-20s │ %-12s │ %6d │\n",
			statusIcon,
			scan.ScanID[:32],
			timeStr,
			viewportsStr,
			scan.IssueCount,
		)
	}

	fmt.Println("└────┴──────────────────────────────────┴──────────────────────┴──────────────┴────────┘")

	// Display summary
	totalIssues := 0
	for _, scan := range scans {
		totalIssues += scan.IssueCount
	}

	fmt.Printf("\n%s Total Scans: %d | Total Issues: %d\n\n",
		lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render("📊"),
		len(scans),
		totalIssues)

	fmt.Printf("%s View details: viewport-cli results show <scan-id>\n",
		lipgloss.NewStyle().Foreground(lipgloss.Color("3")).Render("💡"))
	fmt.Printf("%s Results dir: %s\n\n",
		lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Render("📁"),
		cfg.Scan.Output)

	return nil
}
