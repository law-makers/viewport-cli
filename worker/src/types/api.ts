// API types matching the implementation plan

export type DeviceType = 'MOBILE' | 'TABLET' | 'DESKTOP';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueType = 'OVERFLOW' | 'LAYOUT_SHIFT' | 'TRUNCATION' | 'CONTRAST' | 'OTHER';

export interface ScanRequest {
  targetUrl: string;
  viewports: DeviceType[];
  options?: {
    fullPage?: boolean;
    authHeader?: string;
  };
}

export interface DetectedIssue {
  severity: Severity;
  type: IssueType;
  description: string;
  suggestion: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ViewportResult {
  device: DeviceType;
  dimensions: {
    width: number;
    height: number;
  };
  screenshotBase64: string;
  issues: DetectedIssue[];
}

export interface ScanResponse {
  scanId: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  results: ViewportResult[];
  globalAnalysis?: string;
}

// Device viewport dimensions for standard sizes
export const DEVICE_VIEWPORTS: Record<DeviceType, { width: number; height: number }> = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1920, height: 1080 },
};
