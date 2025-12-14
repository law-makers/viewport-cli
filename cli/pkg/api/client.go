package api

import (
	"context"
	"fmt"
	"time"

	"github.com/go-resty/resty/v2"
)

// Client handles communication with the backend API
type Client struct {
	baseURL    string
	httpClient *resty.Client
}

// ScanRequest is the request sent to the backend API
type ScanRequest struct {
	TargetURL string        `json:"targetUrl"`
	Viewports []string      `json:"viewports"`
	Options   *ScanOptions  `json:"options,omitempty"`
}

// ScanOptions configures screenshot capture options
type ScanOptions struct {
	FullPage   bool   `json:"fullPage,omitempty"`
	AuthHeader string `json:"authHeader,omitempty"`
}

// ScanResponse is the response from the backend API
type ScanResponse struct {
	ScanID         string            `json:"scanId"`
	Timestamp      string            `json:"timestamp"`
	Status         string            `json:"status"`
	Results        []ViewportResult  `json:"results"`
	GlobalAnalysis string            `json:"globalAnalysis"`
}

// ViewportResult contains screenshot and metadata for a single viewport
type ViewportResult struct {
	Device            string          `json:"device"`
	Dimensions        Dimensions      `json:"dimensions"`
	ScreenshotBase64  string          `json:"screenshotBase64"`
	Issues            []DetectedIssue `json:"issues"`
}

// Dimensions contains width and height information
type Dimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// DetectedIssue represents a detected issue from AI analysis
type DetectedIssue struct {
	Severity    string `json:"severity"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Suggestion  string `json:"suggestion"`
}

// NewClient creates a new API client
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: resty.New().
			SetTimeout(60 * time.Second).
			SetRetryCount(3).
			SetRetryWaitTime(1 * time.Second),
	}
}

// Scan sends a scan request to the backend API
func (c *Client) Scan(ctx context.Context, req *ScanRequest) (*ScanResponse, error) {
	endpoint := fmt.Sprintf("%s/scan", c.baseURL)

	resp, err := c.httpClient.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json").
		SetBody(req).
		SetResult(&ScanResponse{}).
		Post(endpoint)

	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	if !resp.IsSuccess() {
		return nil, fmt.Errorf("API error: %d %s", resp.StatusCode(), resp.String())
	}

	result, ok := resp.Result().(*ScanResponse)
	if !ok {
		return nil, fmt.Errorf("failed to parse response")
	}

	return result, nil
}

// Health checks if the backend API is available
func (c *Client) Health(ctx context.Context) error {
	endpoint := fmt.Sprintf("%s/", c.baseURL)

	resp, err := c.httpClient.R().
		SetContext(ctx).
		Get(endpoint)

	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}

	if !resp.IsSuccess() {
		return fmt.Errorf("API unhealthy: %d", resp.StatusCode())
	}

	return nil
}
