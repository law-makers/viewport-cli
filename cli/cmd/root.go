package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "viewport-cli",
	Short: "ViewPort-CLI - Responsive design auditing tool",
	Long: `ViewPort-CLI is a developer tool that bridges the gap between local development 
environments and the diverse reality of end-user devices.

It provides instantaneous, pre-commit visual regression testing and responsive 
design auditing directly from the terminal, using Cloudflare Tunnels and Headless Chrome.`,
	Version: "0.2.0",
}

// Execute runs the root command
func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func init() {
	// Add subcommands
	rootCmd.AddCommand(scanCmd)
	rootCmd.AddCommand(configCmd)
	rootCmd.AddCommand(resultsCmd)
}
