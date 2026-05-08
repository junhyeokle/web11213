"""ImageGuard VM 서버 — Flask 메인 (Storage 없이 로컬 디스크 저장 버전).

엔드포인트:
- GET  /api/health                    → 서버 상태 확인
- POST /api/protect                   → 이미지 보호 처리 + Firestore 저장 + 로컬 디스크 저장
- POST /api/compare                   → 두 이미지 비교
- GET  /api/customers/<name>/images   → 고객 이미지 목록 (옵션)
- GET  /files/<customer_id>/<filename> → 저장된 보호 이미지 다운로드

환경 변수:
- FIREBASE_KEY_PATH: 서비스 계정 JSON 키 경로 (기본: ./firebase-key.json)
- STORAGE_DIR:       이미지 저장 폴더 (기본: ./storage)
- PUBLIC_BASE_URL:   브라우저가 다운로드 받을 외부 URL (기본: http://localhost:8080)
- PORT:              서버 포트 (기본: 8080)
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

import bcrypt
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import firebase_admin
from firebase_admin import credentials, firestore

from watermark import (
    embed_watermark,
    extract_watermark,
    calculate_psnr,
    quality_score_from_psnr,
)
from fingerprint import (
    enhanced_fingerprint,
    fingerprint_to_dict,
    compare_fingerprints,
)

# 적대적 노이즈는 GPU 환경(AI_NOISE_ENABLED=1)에서만 동작.
# CPU 전용 환경에서도 import 자체로는 에러 안 남.
import adversarial

# TrustMark 학습 워터마크 + CLIP 의미 임베딩 (각각 환경변수로 활성화)
import trustmark_clip


# ============================================================
# 로깅 + Flask
# ============================================================
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("imageguard")

app = Flask(__name__)

# CORS — ALLOWED_ORIGINS 환경변수에서 콤마로 구분된 도메인 목록을 읽음.
# 비어있으면 전체 허용(개발용).
# 예: ALLOWED_ORIGINS="https://your-app.vercel.app,http://localhost:3000"
_allowed_origins_raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
if _allowed_origins_raw:
    _origins = [o.strip() for o in _allowed_origins_raw.split(",") if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": _origins}})
    log = logging.getLogger("imageguard")
    log.info("CORS 허용 도메인: %s", _origins)
else:
    CORS(app)  # 개발 모드: 전체 허용

app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20MB


# ============================================================
# Firebase 초기화 (Firestore만 사용, Storage 없음)
# ============================================================
FIREBASE_KEY_PATH = os.environ.get("FIREBASE_KEY_PATH", "./firebase-key.json")

# 로컬 저장 폴더 (Firebase Storage 대용)
STORAGE_DIR = os.path.abspath(os.environ.get("STORAGE_DIR", "./storage"))
os.makedirs(STORAGE_DIR, exist_ok=True)

# 브라우저가 이미지 다운로드 받으러 오는 외부 URL
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:8080")

cred = credentials.Certificate(FIREBASE_KEY_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()
log.info(f"Firestore 초기화 완료. 로컬 저장 경로: {STORAGE_DIR}")


# ============================================================
# 고객 인증 / 자동 등록
# ============================================================
def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def authenticate_or_register(name: str, password: str):
    """고객명+비밀번호로 인증.

    Returns:
        (customer_id, is_new): 성공 시
        (None, False): 비밀번호 불일치
    """
    customers_ref = db.collection("customers")
    existing = list(customers_ref.where("name", "==", name).limit(1).stream())

    if existing:
        doc = existing[0]
        if _check_password(password, doc.to_dict().get("passwordHash", "")):
            return doc.id, False
        return None, False

    # 신규 등록
    new_doc = customers_ref.add(
        {
            "name": name,
            "passwordHash": _hash_password(password),
            "createdAt": datetime.now(timezone.utc),
        }
    )
    customer_id = new_doc[1].id
    log.info(f"신규 고객 등록: {name} (id={customer_id})")
    return customer_id, True


# ============================================================
# 라우트: 헬스체크
# ============================================================
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


# ============================================================
# 라우트: 이미지 보호 처리
# ============================================================
@app.route("/api/protect", methods=["POST"])
def protect():
    """이미지 보호 처리 메인 엔드포인트.

    Form data:
    - image (required):              이미지 파일
    - customerName (required):       고객명
    - password (required):           비밀번호
    - applyWatermark:                "true" / "false"
    - generateFingerprint:           "true" / "false"
    - applyAINoise:                  "true" / "false" (현재 미구현)
    - strength:                      보호 강도 0~100 (참고용)
    - metadata:                      워터마크에 삽입할 자산 ID (옵션)
    """
    try:
        # 1) 입력 받기
        file = request.files.get("image")
        customer_name = (request.form.get("customerName") or "").strip()
        password = request.form.get("password") or ""
        apply_watermark = request.form.get("applyWatermark", "true").lower() == "true"
        apply_fingerprint = (
            request.form.get("generateFingerprint", "true").lower() == "true"
        )
        apply_ai_noise = request.form.get("applyAINoise", "false").lower() == "true"
        metadata = (request.form.get("metadata") or "").strip()

        # 2) 입력 검증
        if not file:
            return jsonify({"error": "이미지 파일이 없습니다"}), 400
        if not customer_name:
            return jsonify({"error": "고객명을 입력하세요"}), 400
        if not password or len(password) < 4:
            return jsonify({"error": "비밀번호는 4자 이상이어야 합니다"}), 400
        if not (apply_watermark or apply_fingerprint or apply_ai_noise):
            return jsonify({"error": "최소 하나 이상의 보호 옵션을 선택하세요"}), 400

        # 3) 고객 인증 / 자동 등록
        customer_id, is_new_customer = authenticate_or_register(
            customer_name, password
        )
        if customer_id is None:
            return jsonify({"error": "비밀번호가 일치하지 않습니다"}), 401

        # 4) 이미지 디코딩
        img_bytes = file.read()
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "이미지 형식이 올바르지 않습니다"}), 400

        if img.ndim == 3 and img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

        # 8의 배수로 정렬 (DCT 블록 정렬 필수)
        h, w = img.shape[:2]
        new_h, new_w = (h // 8) * 8, (w // 8) * 8
        if new_h < 128 or new_w < 128:
            return jsonify({"error": "이미지가 너무 작습니다 (최소 128×128)"}), 400
        if new_h != h or new_w != w:
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        original = img.copy()

        # 4-1) 적대적 노이즈 (GPU 환경에서만, 워터마크 이전 단계)
        ai_noise_actually_applied = False
        if apply_ai_noise:
            if not adversarial.is_available():
                log.warning(
                    "applyAINoise=true 요청됐지만 AI_NOISE_ENABLED=1 환경변수가 없거나 "
                    "PyTorch가 설치되지 않음 — 이 옵션은 건너뜁니다."
                )
            else:
                try:
                    from PIL import Image as PILImage
                    # cv2 BGR → PIL RGB
                    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    pil_in = PILImage.fromarray(rgb)
                    strength_val = int(request.form.get("strength", "50") or "50")
                    pil_out = adversarial.protect_image(pil_in, strength=strength_val)
                    # PIL RGB → cv2 BGR, 원본 해상도(8의 배수)에 맞춤
                    out_arr = np.array(pil_out)
                    out_bgr = cv2.cvtColor(out_arr, cv2.COLOR_RGB2BGR)
                    out_h, out_w = (img.shape[0] // 8) * 8, (img.shape[1] // 8) * 8
                    img = cv2.resize(out_bgr, (out_w, out_h), interpolation=cv2.INTER_AREA)
                    original = img.copy()  # 워터마크 PSNR 비교 기준도 갱신
                    ai_noise_actually_applied = True
                    log.info("적대적 노이즈 적용 완료")
                except Exception as e:
                    log.exception("AI 노이즈 처리 실패")
                    return jsonify({"error": f"AI 노이즈 실패: {e}"}), 500

        # 5) 워터마크 적용
        asset_id = metadata or f"ASSET-{uuid.uuid4().hex[:8].upper()}"
        watermarked = img
        watermark_id = None
        if apply_watermark:
            try:
                watermarked = embed_watermark(img, asset_id)
                watermark_id = asset_id
                log.info(f"워터마크 삽입 완료: {asset_id}")
            except ValueError as e:
                return jsonify({"error": f"워터마크 실패: {e}"}), 400

        # 5-1) TrustMark 학습 워터마크 (옵션, GPU 환경)
        # AI 재생성/스타일 변환에도 메시지가 살아남도록 학습된 워터마크.
        # DCT 워터마크 위에 한 번 더 입혀 이중 방어. 환경변수 TRUSTMARK_ENABLED=1 필요.
        trustmark_short_code: Optional[str] = None
        trustmark_applied = False
        if apply_watermark and trustmark_clip.trustmark_available():
            try:
                from PIL import Image as PILImage
                rgb = cv2.cvtColor(watermarked, cv2.COLOR_BGR2RGB)
                pil_in = PILImage.fromarray(rgb)
                pil_out, trustmark_short_code = trustmark_clip.trustmark_embed(
                    pil_in, asset_id
                )
                out_bgr = cv2.cvtColor(np.array(pil_out), cv2.COLOR_RGB2BGR)
                # 크기 8 정렬 보장
                oh, ow = (out_bgr.shape[0] // 8) * 8, (out_bgr.shape[1] // 8) * 8
                if oh != out_bgr.shape[0] or ow != out_bgr.shape[1]:
                    out_bgr = cv2.resize(out_bgr, (ow, oh), interpolation=cv2.INTER_AREA)
                watermarked = out_bgr
                trustmark_applied = True
                log.info(f"TrustMark 적용: code={trustmark_short_code}")
            except Exception as e:
                # 실패해도 DCT 워터마크는 살아있으니 치명적이진 않음 — 로그만 남기고 계속
                log.exception(f"TrustMark 처리 실패(무시): {e}")

        # 6) 지문 생성
        fingerprint_dict = None
        fingerprint_hash_short = None
        if apply_fingerprint:
            fp = enhanced_fingerprint(watermarked)
            fingerprint_dict = fingerprint_to_dict(fp)
            fingerprint_hash_short = fingerprint_dict["phash"]
            log.info(f"지문 생성 완료: {fingerprint_hash_short}")

        # 6-1) CLIP 의미 임베딩 (옵션, GPU 환경)
        # 픽셀이 다 바뀌어도 "의미"가 비슷하면 매칭됨. 768차원 float32 → Firestore에 저장.
        clip_embedding_list: Optional[list] = None
        if apply_fingerprint and trustmark_clip.clip_available():
            try:
                from PIL import Image as PILImage
                rgb = cv2.cvtColor(watermarked, cv2.COLOR_BGR2RGB)
                pil_in = PILImage.fromarray(rgb)
                emb = trustmark_clip.clip_embed(pil_in)
                clip_embedding_list = emb.tolist()  # 768개 float
                log.info(f"CLIP 임베딩 생성: dim={len(clip_embedding_list)}")
            except Exception as e:
                log.exception(f"CLIP 임베딩 실패(무시): {e}")

        # 7) 화질 점수
        if apply_watermark:
            psnr = calculate_psnr(original, watermarked)
            quality_score = quality_score_from_psnr(psnr)
        else:
            psnr = float("inf")
            quality_score = 100

        # 8) 로컬 디스크에 저장 (Firebase Storage 대용)
        image_id = str(uuid.uuid4())
        original_filename = file.filename or "image.png"
        safe_filename = f"{image_id}.png"

        customer_dir = os.path.join(STORAGE_DIR, customer_id)
        os.makedirs(customer_dir, exist_ok=True)
        file_path = os.path.join(customer_dir, safe_filename)

        ok, encoded = cv2.imencode(".png", watermarked)
        if not ok:
            return jsonify({"error": "이미지 인코딩 실패"}), 500
        with open(file_path, "wb") as f:
            f.write(encoded.tobytes())

        storage_path = f"protected/{customer_id}/{safe_filename}"  # 메타데이터용
        download_url = f"{PUBLIC_BASE_URL}/files/{customer_id}/{safe_filename}"
        log.info(f"로컬 저장: {file_path}")

        # 9) Firestore에 메타데이터 저장
        now = datetime.now(timezone.utc)
        record = {
            "id": image_id,
            "customerId": customer_id,
            "customerName": customer_name,
            "assetId": asset_id,
            "watermarkApplied": apply_watermark,
            "fingerprintApplied": apply_fingerprint,
            "aiNoiseApplied": ai_noise_actually_applied,
            "trustmarkApplied": trustmark_applied,
            "trustmarkCode": trustmark_short_code,
            "clipEmbedding": clip_embedding_list,  # 768 floats or None
            "watermarkId": watermark_id,
            "fingerprint": fingerprint_dict,
            "storagePath": storage_path,
            "downloadUrl": download_url,
            "originalFilename": original_filename,
            "imageSize": [int(watermarked.shape[1]), int(watermarked.shape[0])],
            "qualityScore": quality_score,
            "psnr": round(psnr, 2) if psnr != float("inf") else None,
            "createdAt": now,
        }
        db.collection("images").document(image_id).set(record)
        log.info(f"Firestore 저장: images/{image_id}")

        # 10) 응답
        return jsonify(
            {
                "id": image_id,
                "customerId": customer_id,
                "isNewCustomer": is_new_customer,
                "appliedAt": now.isoformat(),
                "noise": ai_noise_actually_applied,
                "watermark": apply_watermark,
                "fingerprint": apply_fingerprint,
                "fingerprintHash": fingerprint_hash_short,
                "watermarkId": watermark_id,
                "trustmark": trustmark_applied,
                "trustmarkCode": trustmark_short_code,
                "clipEmbedded": clip_embedding_list is not None,
                "qualityScore": quality_score,
                "downloadUrl": download_url,
                "filename": original_filename,
            }
        )

    except Exception as e:
        log.exception("처리 중 오류")
        return jsonify({"error": f"서버 오류: {str(e)}"}), 500


# ============================================================
# 라우트: 저장된 이미지 다운로드 (Firebase Storage 대용)
# ============================================================
@app.route("/files/<customer_id>/<filename>", methods=["GET"])
def serve_file(customer_id, filename):
    """저장된 보호 이미지를 서빙. ?download=1 이면 강제 다운로드."""
    safe_dir = os.path.abspath(os.path.join(STORAGE_DIR, customer_id))
    base_dir = os.path.abspath(STORAGE_DIR)
    # 경로 탈출 방지
    if not safe_dir.startswith(base_dir):
        return jsonify({"error": "잘못된 경로"}), 400
    
    # ?download=1 쿼리 있으면 attachment로 (자동 다운로드)
    as_attachment = request.args.get("download") == "1"
    try:
        return send_from_directory(safe_dir, filename, as_attachment=as_attachment)
    except FileNotFoundError:
        return jsonify({"error": "파일 없음"}), 404


# ============================================================
# 라우트: 표절 검증 (TrustMark + CLIP)
# ============================================================
@app.route("/api/verify", methods=["POST"])
def verify():
    """의심 이미지 한 장에서 TrustMark/CLIP을 추출/계산해
    같은 고객의 등록된 자산들과 매칭 검색.

    Form data:
    - image (required):       의심 이미지 (LLM이 변형한 결과 등)
    - customerName (required): 고객명
    - password (required):     비밀번호

    Returns:
    - matches: 상위 5개 후보 (assetId, watermarkMatch, cosineSimilarity, downloadUrl)
    - best: 가장 높은 점수의 자산에 대한 종합 판정 (judge 결과)
    """
    try:
        # 1) 입력
        file = request.files.get("image")
        customer_name = (request.form.get("customerName") or "").strip()
        password = request.form.get("password") or ""

        if not file:
            return jsonify({"error": "이미지 파일이 없습니다"}), 400
        if not customer_name or not password:
            return jsonify({"error": "고객명/비밀번호 누락"}), 400

        # 2) 고객 인증 (자동 등록 안 함 — 검증은 등록된 고객만)
        customers_ref = db.collection("customers")
        existing = list(
            customers_ref.where("name", "==", customer_name).limit(1).stream()
        )
        if not existing:
            return jsonify({"error": "고객을 찾을 수 없습니다"}), 404
        customer_doc = existing[0]
        if not _check_password(
            password, customer_doc.to_dict().get("passwordHash", "")
        ):
            return jsonify({"error": "비밀번호 불일치"}), 401
        customer_id = customer_doc.id

        # 3) 의심 이미지 디코딩 + PIL 변환
        suspect_bgr, err = _decode_and_align(file)
        if err:
            return jsonify({"error": err}), 400
        from PIL import Image as PILImage
        suspect_pil = PILImage.fromarray(
            cv2.cvtColor(suspect_bgr, cv2.COLOR_BGR2RGB)
        )

        # 4) TrustMark 추출 (가능하면)
        extracted_code = None
        wm_present = False
        if trustmark_clip.trustmark_available():
            try:
                extracted_code, wm_present = trustmark_clip.trustmark_decode(
                    suspect_pil
                )
                log.info(f"TrustMark 추출: code={extracted_code}, present={wm_present}")
            except Exception as e:
                log.exception(f"TrustMark 추출 실패(무시): {e}")

        # 5) CLIP 임베딩 (가능하면)
        suspect_embed = None
        if trustmark_clip.clip_available():
            try:
                suspect_embed = trustmark_clip.clip_embed(suspect_pil)
            except Exception as e:
                log.exception(f"CLIP 임베딩 실패(무시): {e}")

        # 6) 등록된 자산 조회 (최근 50개)
        images = list(
            db.collection("images")
            .where("customerId", "==", customer_id)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(50)
            .stream()
        )

        if not images:
            return jsonify(
                {"error": "이 고객 명의로 등록된 보호 이미지가 없습니다"}
            ), 404

        # 7) 각 자산과 비교 → 점수 매기기
        matches = []
        for img_doc in images:
            d = img_doc.to_dict()
            registered_code = d.get("trustmarkCode")
            registered_emb_list = d.get("clipEmbedding")

            cos_sim = None
            if suspect_embed is not None and registered_emb_list:
                reg_emb = np.array(registered_emb_list, dtype=np.float32)
                cos_sim = trustmark_clip.cosine_similarity(suspect_embed, reg_emb)

            wm_match_label = "no"
            if extracted_code and registered_code:
                if extracted_code == registered_code:
                    wm_match_label = "yes"
                else:
                    matching = sum(
                        a == b for a, b in zip(extracted_code, registered_code)
                    )
                    wm_match_label = (
                        "partial" if matching >= len(registered_code) - 2 else "no"
                    )

            # 매칭 점수: TrustMark yes=1.0, partial=0.7, no=0.0 + cos_sim 가중
            score = 0.0
            if wm_match_label == "yes":
                score += 1.0
            elif wm_match_label == "partial":
                score += 0.5
            if cos_sim is not None:
                score += cos_sim  # 0~1

            matches.append(
                {
                    "id": d.get("id"),
                    "assetId": d.get("assetId"),
                    "originalFilename": d.get("originalFilename"),
                    "downloadUrl": d.get("downloadUrl"),
                    "registeredCode": registered_code,
                    "watermarkMatch": wm_match_label,
                    "cosineSimilarity": cos_sim,
                    "score": score,
                    "createdAt": d.get("createdAt").isoformat()
                    if d.get("createdAt")
                    else None,
                }
            )

        # 점수 내림차순 정렬, 상위 5개만 반환
        matches.sort(key=lambda m: m["score"], reverse=True)
        top = matches[:5]

        # 8) 종합 판정 (best 후보 기준)
        if top:
            best_match = top[0]
            verdict = trustmark_clip.judge(
                extracted_code=extracted_code,
                expected_code=best_match["registeredCode"],
                cos_sim=best_match["cosineSimilarity"],
            )
        else:
            verdict = trustmark_clip.judge(
                extracted_code=extracted_code,
                expected_code=None,
                cos_sim=None,
            )

        return jsonify(
            {
                "extractedCode": extracted_code,
                "watermarkPresent": wm_present,
                "clipAvailable": suspect_embed is not None,
                "matches": top,
                "best": verdict,
            }
        )

    except Exception as e:
        log.exception("verify 처리 중 오류")
        return jsonify({"error": f"서버 오류: {str(e)}"}), 500


# ============================================================
# 라우트: 고객 이미지 목록 (옵션)
# ============================================================
@app.route("/api/customers/<customer_name>/images", methods=["GET"])
def list_customer_images(customer_name):
    """특정 고객의 이미지 목록 (비밀번호 헤더 인증)."""
    password = request.headers.get("X-Customer-Password", "")
    if not customer_name or not password:
        return jsonify({"error": "고객명/비밀번호 누락"}), 400

    customers_ref = db.collection("customers")
    existing = list(customers_ref.where("name", "==", customer_name).limit(1).stream())
    if not existing:
        return jsonify({"error": "고객을 찾을 수 없습니다"}), 404

    customer_doc = existing[0]
    if not _check_password(password, customer_doc.to_dict().get("passwordHash", "")):
        return jsonify({"error": "비밀번호 불일치"}), 401

    customer_id = customer_doc.id
    images = list(
        db.collection("images")
        .where("customerId", "==", customer_id)
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(50)
        .stream()
    )

    result = []
    for img in images:
        d = img.to_dict()
        result.append(
            {
                "id": d.get("id"),
                "assetId": d.get("assetId"),
                "downloadUrl": d.get("downloadUrl"),
                "originalFilename": d.get("originalFilename"),
                "createdAt": d.get("createdAt").isoformat()
                if d.get("createdAt")
                else None,
                "qualityScore": d.get("qualityScore"),
            }
        )
    return jsonify({"customerName": customer_name, "images": result})


# ============================================================
# 이미지 비교 헬퍼
# ============================================================
def _decode_and_align(file_storage):
    """업로드된 파일을 BGR ndarray로 디코딩하고 8의 배수로 정렬.

    Returns:
        (img, error_message): 둘 중 하나만 None이 아님.
    """
    img_bytes = file_storage.read()
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        return None, "이미지 형식이 올바르지 않습니다"

    if img.ndim == 3 and img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

    h, w = img.shape[:2]
    new_h, new_w = (h // 8) * 8, (w // 8) * 8
    if new_h < 128 or new_w < 128:
        return None, "이미지가 너무 작습니다 (최소 128×128)"
    if new_h != h or new_w != w:
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    return img, None


def _judge_similarity(overall_pct: int, watermark_match: str) -> tuple:
    """유사도 점수와 워터마크 일치 여부로 최종 판정."""
    if watermark_match:
        return "exact", "동일 자산 (워터마크 일치)"
    if overall_pct >= 90:
        return "exact", "거의 동일한 이미지"
    if overall_pct >= 75:
        return "likely", "유사 (변형된 같은 이미지로 추정)"
    if overall_pct >= 60:
        return "possibly", "일부 유사"
    return "different", "다른 이미지"


# ============================================================
# 라우트: 이미지 비교
# ============================================================
@app.route("/api/compare", methods=["POST"])
def compare():
    """두 이미지를 비교하여 유사도 점수를 반환.

    Form data:
    - image1 (required): 내 이미지
    - image2 (required): 비교 대상 이미지

    응답:
    - similarity: 종합 유사도 0~100
    - details: 각 해시별 유사도 (phash, dhash, chash, block4, block8)
    - watermark1, watermark2: 각 이미지에서 추출된 워터마크 (없으면 null)
    - watermarkMatch: 두 이미지 모두 같은 워터마크가 추출됐을 때 그 값
    - verdict: "exact" | "likely" | "possibly" | "different"
    - verdictLabel: 사용자에게 보여줄 한국어 라벨
    """
    try:
        file1 = request.files.get("image1")
        file2 = request.files.get("image2")

        if not file1 or not file2:
            return jsonify({"error": "두 이미지가 모두 필요합니다"}), 400

        img1, err1 = _decode_and_align(file1)
        if err1:
            return jsonify({"error": f"내 이미지: {err1}"}), 400
        img2, err2 = _decode_and_align(file2)
        if err2:
            return jsonify({"error": f"비교 이미지: {err2}"}), 400

        # 지문 생성
        fp1 = enhanced_fingerprint(img1)
        fp2 = enhanced_fingerprint(img2)
        sim = compare_fingerprints(fp1, fp2)

        # 워터마크 추출 시도 (실패해도 무방)
        wm1 = extract_watermark(img1) or None
        wm2 = extract_watermark(img2) or None
        watermark_match = wm1 if (wm1 and wm2 and wm1 == wm2) else None

        # 점수 변환 (0~100 정수) + 판정
        overall_pct = int(round(sim["overall"] * 100))
        verdict, verdict_label = _judge_similarity(overall_pct, watermark_match)

        log.info(
            f"비교 완료: similarity={overall_pct}% verdict={verdict} "
            f"wm1={wm1!r} wm2={wm2!r}"
        )

        return jsonify(
            {
                "similarity": overall_pct,
                "details": {
                    "phash": int(round(sim["phash"] * 100)),
                    "dhash": int(round(sim["dhash"] * 100)),
                    "chash": int(round(sim["chash"] * 100)),
                    "block4": int(round(sim["block4"] * 100)),
                    "block8": int(round(sim["block8"] * 100)),
                },
                "watermark1": wm1,
                "watermark2": wm2,
                "watermarkMatch": watermark_match,
                "verdict": verdict,
                "verdictLabel": verdict_label,
            }
        )

    except Exception as e:
        log.exception("비교 중 오류")
        return jsonify({"error": f"서버 오류: {str(e)}"}), 500


# ============================================================
# 메인
# ============================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    log.info(f"서버 시작: http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)