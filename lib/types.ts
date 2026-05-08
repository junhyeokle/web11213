export interface ProtectionOptions {
  applyAINoise: boolean;
  applyWatermark: boolean;
  generateFingerprint: boolean;
  strength: number;
  metadata?: string;
}

export interface CustomerInfo {
  name: string;
  password: string;
}

export interface ProtectionResult {
  id: string;
  customerId?: string;
  isNewCustomer?: boolean;
  appliedAt: Date;
  noise: boolean;
  watermark: boolean;
  fingerprint: boolean;
  fingerprintHash?: string;
  watermarkId?: string;
  qualityScore: number;
  downloadUrl?: string;
  filename?: string;
}

export interface ScanMatch {
  id: string;
  thumbnailUrl: string;
  pageUrl: string;
  imageUrl: string;
  similarity: number;
  watermarkDetected: boolean;
  riskLevel: "low" | "medium" | "high";
  detectedAt: Date;
  matchedAssetId?: string;
}

export interface MonitoredSite {
  id: string;
  url: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  enabled: boolean;
  lastScan: Date | null;
  nextScan: Date | null;
  detections: number;
  status: "active" | "paused" | "error";
}

export interface DetectionAlert {
  id: string;
  siteUrl: string;
  imageUrl: string;
  similarity: number;
  detectedAt: Date;
  read: boolean;
}

export interface ComparisonResult {
  similarity: number;            // 0~100 종합 유사도
  details: {
    phash: number;
    dhash: number;
    chash: number;
    block4: number;
    block8: number;
  };
  watermark1: string | null;     // 첫 이미지에서 추출된 워터마크
  watermark2: string | null;     // 두 번째 이미지에서 추출된 워터마크
  watermarkMatch: string | null; // 두 이미지의 워터마크 일치 시 그 값
  verdict: "exact" | "likely" | "possibly" | "different";
  verdictLabel: string;
}
