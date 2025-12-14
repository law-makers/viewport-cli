package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config holds all application configuration
type Config struct {
	// API Configuration
	API struct {
		URL string `mapstructure:"url"`
	} `mapstructure:"api"`

	// Scan Configuration
	Scan struct {
		// Default viewports for scans
		Viewports []string `mapstructure:"viewports"`
		// Default output directory
		Output string `mapstructure:"output"`
		// Enable tunnel by default
		Tunnel bool `mapstructure:"tunnel"`
		// Default timeout in seconds
		Timeout int `mapstructure:"timeout"`
	} `mapstructure:"scan"`

	// Tunnel Configuration
	Tunnel struct {
		// Tunnel name
		Name string `mapstructure:"name"`
		// Auto-cleanup tunnel on exit
		AutoCleanup bool `mapstructure:"auto_cleanup"`
	} `mapstructure:"tunnel"`

	// CLI Display Configuration
	Display struct {
		// Show verbose output
		Verbose bool `mapstructure:"verbose"`
		// Disable colors
		NoColor bool `mapstructure:"no_color"`
		// Disable table formatting
		NoTable bool `mapstructure:"no_table"`
	} `mapstructure:"display"`
}

// DefaultConfig returns a Config with sensible defaults
func DefaultConfig() *Config {
	cfg := &Config{}
	cfg.API.URL = "http://localhost:8787"
	cfg.Scan.Viewports = []string{"mobile", "tablet", "desktop"}
	cfg.Scan.Output = "./viewport-results"
	cfg.Scan.Tunnel = false // Disabled by default for codespaces compatibility
	cfg.Scan.Timeout = 60
	cfg.Tunnel.Name = "viewport-scan"
	cfg.Tunnel.AutoCleanup = true
	cfg.Display.Verbose = false
	cfg.Display.NoColor = false
	cfg.Display.NoTable = false
	return cfg
}

// LoadConfig loads configuration from files and environment
func LoadConfig(configPath string) (*Config, error) {
	v := viper.New()

	// Set defaults
	defaults := DefaultConfig()
	setDefaults(v, defaults)

	// Look for config file
	if configPath != "" {
		// Use provided path
		v.SetConfigFile(configPath)
	} else {
		// Look in home directory
		home, err := os.UserHomeDir()
		if err == nil {
			v.AddConfigPath(home)
		}

		// Look in current directory
		v.AddConfigPath(".")

		// Look in .config/viewport-cli
		if home != "" {
			v.AddConfigPath(filepath.Join(home, ".config", "viewport-cli"))
		}

		v.SetConfigName(".viewport")
		v.SetConfigType("yaml")
	}

	// Read environment variables with prefix VIEWPORT_
	v.SetEnvPrefix("VIEWPORT")
	v.AutomaticEnv()

	// Try to read the file, but don't fail if it doesn't exist
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			// If there's an error other than file not found, return it
			return nil, fmt.Errorf("error reading config file: %w", err)
		}
		// File not found is OK - we'll use defaults
	}

	// Unmarshal into Config struct
	cfg := DefaultConfig()
	if err := v.Unmarshal(cfg); err != nil {
		return nil, fmt.Errorf("error parsing config: %w", err)
	}

	return cfg, nil
}

// GetConfigPath returns the path where config file should be created
func GetConfigPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Try to create .config/viewport-cli directory
	configDir := filepath.Join(home, ".config", "viewport-cli")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		// Fallback to current directory if home doesn't work
		return ".viewport.yaml", nil
	}

	return filepath.Join(configDir, ".viewport.yaml"), nil
}

// SaveConfig saves the configuration to a file
func SaveConfig(cfg *Config, path string) error {
	// Create parent directory if needed
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Marshal config to YAML
	v := viper.New()
	setDefaults(v, cfg)

	// Write to file
	if err := v.WriteConfigAs(path); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// setDefaults sets all default values in viper
func setDefaults(v *viper.Viper, cfg *Config) {
	v.SetDefault("api.url", cfg.API.URL)
	v.SetDefault("scan.viewports", cfg.Scan.Viewports)
	v.SetDefault("scan.output", cfg.Scan.Output)
	v.SetDefault("scan.tunnel", cfg.Scan.Tunnel)
	v.SetDefault("scan.timeout", cfg.Scan.Timeout)
	v.SetDefault("tunnel.name", cfg.Tunnel.Name)
	v.SetDefault("tunnel.auto_cleanup", cfg.Tunnel.AutoCleanup)
	v.SetDefault("display.verbose", cfg.Display.Verbose)
	v.SetDefault("display.no_color", cfg.Display.NoColor)
	v.SetDefault("display.no_table", cfg.Display.NoTable)
}
