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

// ============================================================
// /api/verify — 의심 이미지 1장으로 등록된 자산들 중 매칭 검색
// ============================================================
export interface VerifyMatch {
  id: string;
  assetId: string;
  originalFilename: string | null;
  downloadUrl: string | null;
  registeredCode: string | null;       // 그 자산의 TrustMark 코드
  watermarkMatch: "yes" | "partial" | "no";
  cosineSimilarity: number | null;     // CLIP 코사인 유사도 (0~1)
  score: number;                        // 정렬용 종합 점수
  createdAt: string | null;
}

export interface VerifyVerdict {
  verdict:
    | "plagiarism_confirmed"
    | "highly_suspicious"
    | "ai_regenerated_suspicious"
    | "manual_review"
    | "not_plagiarism";
  label: string;                        // 한국어 라벨
  confidence: string;
  reason: string;
  wmMatch: "yes" | "partial" | "no";
  clipVerdict: "high" | "match" | "review" | "no" | "unknown";
  cosineSimilarity: number | null;
}

export interface VerifyResult {
  extractedCode: string | null;
  watermarkPresent: boolean;
  clipAvailable: boolean;
  matches: VerifyMatch[];               // 상위 5개
  best: VerifyVerdict;
}
