import {
  ProtectionOptions,
  ProtectionResult,
  ScanMatch,
  MonitoredSite,
  DetectionAlert,
} from "./types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// === 이미지 보호 처리 ===
export async function processImage(
  _file: File,
  options: ProtectionOptions
): Promise<ProtectionResult> {
  await delay(1800);
  return {
    id: `asset_${Date.now().toString(36)}`,
    appliedAt: new Date(),
    noise: options.applyAINoise,
    watermark: options.applyWatermark,
    fingerprint: options.generateFingerprint,
    fingerprintHash: options.generateFingerprint ? "a3f7b2c91e4d8f06" : undefined,
    watermarkId: options.applyWatermark
      ? `WM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      : undefined,
    qualityScore:
      100 -
      (options.applyAINoise ? 4 : 0) -
      (options.applyWatermark ? Math.round(options.strength / 20) : 0),
  };
}

// === 사이트 스캔 ===
export async function scanWebsite(_url: string): Promise<ScanMatch[]> {
  await delay(2400);
  return [
    {
      id: "m1",
      thumbnailUrl: "https://picsum.photos/seed/scan1/240/240",
      pageUrl: "https://example-blog.com/post/abc",
      imageUrl: "https://example-blog.com/img/a.jpg",
      similarity: 96,
      watermarkDetected: true,
      riskLevel: "high",
      detectedAt: new Date(),
      matchedAssetId: "asset_xyz123",
    },
    {
      id: "m2",
      thumbnailUrl: "https://picsum.photos/seed/scan2/240/240",
      pageUrl: "https://news-site.com/article/123",
      imageUrl: "https://news-site.com/img/b.jpg",
      similarity: 82,
      watermarkDetected: false,
      riskLevel: "medium",
      detectedAt: new Date(),
      matchedAssetId: "asset_abc456",
    },
    {
      id: "m3",
      thumbnailUrl: "https://picsum.photos/seed/scan3/240/240",
      pageUrl: "https://example-blog.com/post/xyz",
      imageUrl: "https://example-blog.com/img/c.jpg",
      similarity: 67,
      watermarkDetected: false,
      riskLevel: "low",
      detectedAt: new Date(),
    },
  ];
}

// === 모니터링 ===
let mockSites: MonitoredSite[] = [
  {
    id: "site_1",
    url: "https://blog.naver.com/yourname",
    name: "네이버 블로그",
    frequency: "daily",
    enabled: true,
    lastScan: new Date(Date.now() - 1000 * 60 * 60 * 3),
    nextScan: new Date(Date.now() + 1000 * 60 * 60 * 21),
    detections: 2,
    status: "active",
  },
  {
    id: "site_2",
    url: "https://my-portfolio.com",
    name: "포트폴리오",
    frequency: "weekly",
    enabled: true,
    lastScan: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    nextScan: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    detections: 0,
    status: "active",
  },
  {
    id: "site_3",
    url: "https://instagram-feed.com/yourname",
    name: "Instagram",
    frequency: "daily",
    enabled: false,
    lastScan: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    nextScan: null,
    detections: 1,
    status: "paused",
  },
];

export async function getMonitoredSites(): Promise<MonitoredSite[]> {
  await delay(500);
  return [...mockSites];
}

export async function addMonitoredSite(
  data: Omit<MonitoredSite, "id" | "lastScan" | "nextScan" | "detections" | "status">
): Promise<MonitoredSite> {
  await delay(600);
  const site: MonitoredSite = {
    ...data,
    id: `site_${Date.now().toString(36)}`,
    lastScan: null,
    nextScan: new Date(Date.now() + 1000 * 60 * 60 * 24),
    detections: 0,
    status: data.enabled ? "active" : "paused",
  };
  mockSites = [site, ...mockSites];
  return site;
}

export async function toggleSite(id: string, enabled: boolean): Promise<void> {
  await delay(300);
  mockSites = mockSites.map((s) =>
    s.id === id ? { ...s, enabled, status: enabled ? "active" : "paused" } : s
  );
}

export async function removeSite(id: string): Promise<void> {
  await delay(300);
  mockSites = mockSites.filter((s) => s.id !== id);
}

export async function getRecentAlerts(): Promise<DetectionAlert[]> {
  await delay(400);
  return [
    {
      id: "a1",
      siteUrl: "https://blog.naver.com/yourname",
      imageUrl: "https://picsum.photos/seed/a1/120/120",
      similarity: 94,
      detectedAt: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
    },
    {
      id: "a2",
      siteUrl: "https://example.com/post",
      imageUrl: "https://picsum.photos/seed/a2/120/120",
      similarity: 88,
      detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: false,
    },
    {
      id: "a3",
      siteUrl: "https://instagram-feed.com/yourname",
      imageUrl: "https://picsum.photos/seed/a3/120/120",
      similarity: 76,
      detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
    },
  ];
}
