import {
  ProtectionOptions,
  ProtectionResult,
  CustomerInfo,
  ComparisonResult,
  VerifyResult,
} from "./types";

/**
 * 백엔드(Flask) API 주소.
 *
 * - 로컬 개발: .env.local 에 NEXT_PUBLIC_API_BASE=http://localhost:8080
 * - Vercel 배포: Vercel 대시보드 → Settings → Environment Variables 에
 *   NEXT_PUBLIC_API_BASE = https://<GCP-VM-도메인-또는-Cloud-Run-URL> 등록
 *
 * ⚠️ Vercel은 HTTPS로 서빙되므로 백엔드도 반드시 HTTPS여야 합니다.
 *    (HTTP로 두면 브라우저 mixed-content 차단으로 요청이 막힙니다)
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

if (
  typeof window !== "undefined" &&
  !process.env.NEXT_PUBLIC_API_BASE &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
) {
  // 운영 환경에서 환경변수가 비어 있으면 콘솔에 경고
  console.warn(
    "[api] NEXT_PUBLIC_API_BASE 환경변수가 설정되지 않았습니다. " +
      "Vercel Dashboard → Settings → Environment Variables 에 백엔드 URL을 등록하세요."
  );
}

/**
 * 이미지를 VM 서버에 보내 보호 처리 + Firebase 저장.
 *
 * 흐름:
 *  1) multipart/form-data로 이미지 + 고객 정보 + 옵션 전송
 *  2) VM 서버에서 워터마크/지문 처리
 *  3) Firebase Storage에 업로드 + Firestore에 메타데이터 저장
 *  4) 다운로드 URL 반환
 */
export async function processImageReal(
  file: File,
  options: ProtectionOptions,
  customer: CustomerInfo
): Promise<ProtectionResult> {
  const form = new FormData();
  form.append("image", file);
  form.append("customerName", customer.name);
  form.append("password", customer.password);
  form.append("applyAINoise", String(options.applyAINoise));
  form.append("applyWatermark", String(options.applyWatermark));
  form.append("generateFingerprint", String(options.generateFingerprint));
  form.append("strength", String(options.strength));
  if (options.metadata) {
    form.append("metadata", options.metadata);
  }

  const res = await fetch(`${API_BASE}/api/protect`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errorPayload = await res
      .json()
      .catch(() => ({ error: `요청 실패 (HTTP ${res.status})` }));
    throw new Error(errorPayload.error || `요청 실패 (${res.status})`);
  }

  const data = await res.json();

  return {
    id: data.id,
    customerId: data.customerId,
    isNewCustomer: data.isNewCustomer,
    appliedAt: new Date(data.appliedAt || Date.now()),
    noise: data.noise,
    watermark: data.watermark,
    fingerprint: data.fingerprint,
    fingerprintHash: data.fingerprintHash,
    watermarkId: data.watermarkId,
    qualityScore: data.qualityScore,
    downloadUrl: data.downloadUrl,
    filename: data.filename,
  };
}

/**
 * 두 이미지의 유사도를 비교.
 *
 * VM 서버의 /api/compare 엔드포인트를 호출하여
 * 강화 지문(phash + dhash + chash + 블록 해시) 기반 유사도를 계산하고,
 * 워터마크가 있다면 그것도 추출 시도합니다.
 */
export async function compareImages(
  myImage: File,
  compareImage: File
): Promise<ComparisonResult> {
  const form = new FormData();
  form.append("image1", myImage);
  form.append("image2", compareImage);

  const res = await fetch(`${API_BASE}/api/compare`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errorPayload = await res
      .json()
      .catch(() => ({ error: `요청 실패 (HTTP ${res.status})` }));
    throw new Error(errorPayload.error || `요청 실패 (${res.status})`);
  }

  return (await res.json()) as ComparisonResult;
}

/**
 * 표절 검증 — 의심 이미지 한 장을 보내서
 * 서버에 등록된 본인 자산들 중 TrustMark/CLIP으로 매칭되는 것을 찾음.
 *
 * 흐름:
 *  1) multipart/form-data로 의심 이미지 + 고객명/비밀번호 전송
 *  2) 서버가 이미지에서 TrustMark 추출 + CLIP 임베딩 계산
 *  3) Firestore에 저장된 같은 고객의 자산들과 비교
 *  4) 상위 5개 후보 + 종합 판정 반환
 */
export async function verifyImage(
  suspectImage: File,
  customer: CustomerInfo
): Promise<VerifyResult> {
  const form = new FormData();
  form.append("image", suspectImage);
  form.append("customerName", customer.name);
  form.append("password", customer.password);

  const res = await fetch(`${API_BASE}/api/verify`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errorPayload = await res
      .json()
      .catch(() => ({ error: `요청 실패 (HTTP ${res.status})` }));
    throw new Error(errorPayload.error || `요청 실패 (${res.status})`);
  }

  return (await res.json()) as VerifyResult;
}
