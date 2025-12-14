package results

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// ScanMetadata represents the metadata stored in metadata.json
type ScanMetadata struct {
	ScanID    string    `json:"scanId"`
	Timestamp string    `json:"timestamp"`
	Status    string    `json:"status"`
	Results   []Result  `json:"results"`
}

// Result represents a single viewport result
type Result struct {
	Device       string `json:"device"`
	Dimensions   struct {
		Width  int `json:"width"`
		Height int `json:"height"`
	} `json:"dimensions"`
	Issues []interface{} `json:"issues"`
}

// ScanSummary represents a summary of a scan
type ScanSummary struct {
	ScanID      string
	Timestamp   time.Time
	Viewports   []string
	IssueCount  int
	Status      string
}

// ListScans returns all scans found in the results directory
func ListScans(resultsDir string) ([]ScanSummary, error) {
	// Check if directory exists
	if _, err := os.Stat(resultsDir); os.IsNotExist(err) {
		return []ScanSummary{}, nil // Return empty list if directory doesn't exist
	}

	entries, err := os.ReadDir(resultsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read results directory: %w", err)
	}

	var scans []ScanSummary

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		// Try to read metadata.json from this directory
		metadataPath := filepath.Join(resultsDir, entry.Name(), "metadata.json")
		metadata, err := readMetadata(metadataPath)
		if err != nil {
			// Skip directories without valid metadata
			continue
		}

		// Parse timestamp
		timestamp, err := time.Parse(time.RFC3339, metadata.Timestamp)
		if err != nil {
			// Use current time if parsing fails
			timestamp = time.Now()
		}

		// Extract viewports and count issues
		viewports := make([]string, 0)
		issueCount := 0

		for _, result := range metadata.Results {
			viewports = append(viewports, strings.ToLower(result.Device))
			issueCount += len(result.Issues)
		}

		scans = append(scans, ScanSummary{
			ScanID:     metadata.ScanID,
			Timestamp:  timestamp,
			Viewports:  viewports,
			IssueCount: issueCount,
			Status:     metadata.Status,
		})
	}

	// Sort by timestamp, newest first
	sort.Slice(scans, func(i, j int) bool {
		return scans[i].Timestamp.After(scans[j].Timestamp)
	})

	return scans, nil
}

// GetScan retrieves a specific scan by ID
func GetScan(resultsDir, scanID string) (*ScanMetadata, error) {
	metadataPath := filepath.Join(resultsDir, scanID, "metadata.json")
	return readMetadata(metadataPath)
}

// readMetadata reads and parses a metadata.json file
func readMetadata(path string) (*ScanMetadata, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read metadata: %w", err)
	}

	var metadata ScanMetadata
	if err := json.Unmarshal(data, &metadata); err != nil {
		return nil, fmt.Errorf("failed to parse metadata: %w", err)
	}

	return &metadata, nil
}

// DeleteScan removes a scan directory
func DeleteScan(resultsDir, scanID string) error {
	scanPath := filepath.Join(resultsDir, scanID)
	return os.RemoveAll(scanPath)
}

// FilterByDateRange filters scans within a date range
func FilterByDateRange(scans []ScanSummary, after, before time.Time) []ScanSummary {
	var filtered []ScanSummary

	for _, scan := range scans {
		if (after.IsZero() || scan.Timestamp.After(after)) &&
			(before.IsZero() || scan.Timestamp.Before(before)) {
			filtered = append(filtered, scan)
		}
	}

	return filtered
}

// FilterByStatus filters scans by status
func FilterByStatus(scans []ScanSummary, status string) []ScanSummary {
	var filtered []ScanSummary

	for _, scan := range scans {
		if strings.EqualFold(scan.Status, status) {
			filtered = append(filtered, scan)
		}
	}

	return filtered
}
