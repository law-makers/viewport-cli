package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "viewport-cli",
	Short: "ViewPort-CLI - Responsive design auditing tool",
	Long: `A command-line tool for capturing screenshots of websites across multiple device viewports to identify responsive design issues before deployment.`,
	Version: "1.1.6",
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
