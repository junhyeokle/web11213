"""TrustMark 학습 워터마크 + OpenCLIP 의미 임베딩 모듈.

팀원이 보낸 `clip_trustmark_test.ipynb`의 핵심 로직을 서버에서 import 가능한 형태로 정리.

용도:
- AI 재생성(img2img / style transfer) 처럼 픽셀이 거의 다 바뀌는 변형에서도
  메시지 추출(TrustMark) 또는 의미 매칭(CLIP)으로 표절 잡기.
- 기존 DCT 워터마크/지문은 그대로 두고 위에 추가 — 서로 보완.

환경 변수:
- TRUSTMARK_ENABLED=1     → TrustMark 사용 (기본 0).
- CLIP_ENABLED=1          → CLIP 임베딩 사용 (기본 0).
- TRUSTMARK_MODEL_TYPE    → 'Q'(화질, 기본) 또는 'B'(강건성).
- CLIP_MODEL              → 'ViT-L-14' (기본).
- CLIP_PRETRAINED         → 'openai' (기본).
"""
from __future__ import annotations

import hashlib
import logging
import os
import threading
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image

log = logging.getLogger("imageguard.trustmark_clip")

TRUSTMARK_MODEL_TYPE = os.environ.get("TRUSTMARK_MODEL_TYPE", "Q")
CLIP_MODEL = os.environ.get("CLIP_MODEL", "ViT-L-14")
CLIP_PRETRAINED = os.environ.get("CLIP_PRETRAINED", "openai")

# 짧은 워터마크 코드 길이 (TrustMark BCH_5 기준 7글자 권장)
SHORT_CODE_LEN = 7


# ============================================================
# 가용성 체크
# ============================================================
def trustmark_available() -> bool:
    if os.environ.get("TRUSTMARK_ENABLED", "0") != "1":
        return False
    try:
        import trustmark  # noqa: F401
    except ImportError:
        return False
    return True


def clip_available() -> bool:
    if os.environ.get("CLIP_ENABLED", "0") != "1":
        return False
    try:
        import open_clip  # noqa: F401
        import torch  # noqa: F401
    except ImportError:
        return False
    return True


# ============================================================
# Short code (긴 ID → 7자 BCH_5 호환 코드)
# ============================================================
def make_short_code(long_id: str, length: int = SHORT_CODE_LEN) -> str:
    """긴 자산 ID(예: 'ASSET-A3F7B2C9')를 7자 base32 코드로 변환.
    같은 입력 → 같은 출력 (deterministic). 검증 단계에서 매핑 복원 가능.
    """
    h = hashlib.sha256(long_id.encode("utf-8")).digest()
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUV"
    code = ""
    val = int.from_bytes(h[:8], "big")
    for _ in range(length):
        code += chars[val & 0x1F]
        val >>= 5
    return code


# ============================================================
# TrustMark — lazy-load 싱글톤
# ============================================================
_tm = None
_tm_lock = threading.Lock()
_tm_load_error: Optional[str] = None


def _ensure_trustmark():
    global _tm, _tm_load_error
    if _tm is not None:
        return _tm
    if _tm_load_error is not None:
        raise RuntimeError(_tm_load_error)
    with _tm_lock:
        if _tm is not None:
            return _tm
        try:
            from trustmark import TrustMark
        except ImportError as e:
            _tm_load_error = (
                f"trustmark이 설치되지 않았습니다: {e}. "
                "GPU 환경에서 `pip install trustmark`로 설치하세요."
            )
            raise RuntimeError(_tm_load_error)
        log.info(f"TrustMark 로딩: model_type={TRUSTMARK_MODEL_TYPE}")
        _tm = TrustMark(
            verbose=False,
            model_type=TRUSTMARK_MODEL_TYPE,
            encoding_type=TrustMark.Encoding.BCH_5,
        )
        log.info("TrustMark 로드 완료")
        return _tm


def trustmark_embed(pil_image: Image.Image, asset_id: str) -> Tuple[Image.Image, str]:
    """원본 PIL 이미지에 TrustMark를 삽입.

    Returns:
        (protected_pil, short_code) — short_code는 추출 시 매칭에 사용.
    """
    tm = _ensure_trustmark()
    short_code = make_short_code(asset_id)
    rgb = pil_image.convert("RGB")
    protected = tm.encode(rgb, short_code)
    log.info(f"TrustMark 삽입: id={asset_id}, code={short_code}")
    return protected, short_code


def trustmark_decode(pil_image: Image.Image) -> Tuple[Optional[str], bool]:
    """이미지에서 TrustMark 메시지 추출 시도.

    Returns:
        (extracted_code or None, present_flag).
    """
    tm = _ensure_trustmark()
    rgb = pil_image.convert("RGB")
    extracted, present, _ = tm.decode(rgb)
    if not present:
        extracted = None
    return extracted, bool(present)


# ============================================================
# OpenCLIP — lazy-load 싱글톤
# ============================================================
_clip_model = None
_clip_preprocess = None
_clip_device = None
_clip_lock = threading.Lock()
_clip_load_error: Optional[str] = None


def _ensure_clip():
    global _clip_model, _clip_preprocess, _clip_device, _clip_load_error
    if _clip_model is not None:
        return _clip_model, _clip_preprocess, _clip_device
    if _clip_load_error is not None:
        raise RuntimeError(_clip_load_error)
    with _clip_lock:
        if _clip_model is not None:
            return _clip_model, _clip_preprocess, _clip_device
        try:
            import torch
            import open_clip
        except ImportError as e:
            _clip_load_error = (
                f"open_clip_torch / torch가 설치되지 않았습니다: {e}. "
                "GPU 환경에서 `pip install open_clip_torch`로 설치하세요."
            )
            raise RuntimeError(_clip_load_error)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        log.info(f"CLIP 로딩: {CLIP_MODEL} / {CLIP_PRETRAINED} ({device})")
        model, _, preprocess = open_clip.create_model_and_transforms(
            CLIP_MODEL, pretrained=CLIP_PRETRAINED
        )
        model = model.to(device).eval()
        _clip_model = model
        _clip_preprocess = preprocess
        _clip_device = device
        log.info("CLIP 로드 완료")
        return _clip_model, _clip_preprocess, _clip_device


def clip_embed(pil_image: Image.Image) -> np.ndarray:
    """PIL → L2 정규화된 768차원 numpy float32 벡터."""
    import torch

    model, preprocess, device = _ensure_clip()
    rgb = pil_image.convert("RGB")
    tensor = preprocess(rgb).unsqueeze(0).to(device)
    with torch.no_grad():
        feat = model.encode_image(tensor)
        feat = feat / feat.norm(dim=-1, keepdim=True)
    return feat.cpu().numpy().flatten().astype(np.float32)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """이미 L2 정규화된 두 벡터의 코사인 유사도."""
    return float(np.dot(a, b))


# ============================================================
# 종합 판정 — 노트북의 결합 로직을 그대로
# ============================================================
def judge(
    extracted_code: Optional[str],
    expected_code: Optional[str],
    cos_sim: Optional[float],
) -> dict:
    """워터마크 + CLIP 결과로부터 종합 판정.

    Returns dict with keys: verdict (en), label (ko), confidence (ko), reason (ko).
    """
    # 워터마크 일치도
    if extracted_code and expected_code and extracted_code == expected_code:
        wm_match = "yes"
    elif extracted_code and expected_code:
        matching = sum(a == b for a, b in zip(extracted_code, expected_code))
        wm_match = "partial" if matching >= len(expected_code) - 2 else "no"
    else:
        wm_match = "no"

    # CLIP 등급
    if cos_sim is None:
        clip_verdict = "unknown"
    elif cos_sim >= 0.95:
        clip_verdict = "high"
    elif cos_sim >= 0.85:
        clip_verdict = "match"
    elif cos_sim >= 0.75:
        clip_verdict = "review"
    else:
        clip_verdict = "no"

    # 결합
    if wm_match == "yes":
        return {
            "verdict": "plagiarism_confirmed",
            "label": "표절 확정",
            "confidence": "매우 높음",
            "reason": "TrustMark 메시지 정확히 일치",
            "wmMatch": wm_match,
            "clipVerdict": clip_verdict,
            "cosineSimilarity": cos_sim,
        }
    if wm_match == "partial" and clip_verdict in ("high", "match"):
        return {
            "verdict": "plagiarism_confirmed",
            "label": "표절 확정",
            "confidence": "매우 높음",
            "reason": "TrustMark 부분 일치 + CLIP 매칭",
            "wmMatch": wm_match,
            "clipVerdict": clip_verdict,
            "cosineSimilarity": cos_sim,
        }
    if clip_verdict == "high":
        return {
            "verdict": "highly_suspicious",
            "label": "표절 의심",
            "confidence": "높음",
            "reason": f"CLIP 유사도 {cos_sim:.3f} — 거의 동일",
            "wmMatch": wm_match,
            "clipVerdict": clip_verdict,
            "cosineSimilarity": cos_sim,
        }
    if clip_verdict == "match":
        return {
            "verdict": "ai_regenerated_suspicious",
            "label": "AI 재생성 의심",
            "confidence": "높음",
            "reason": f"CLIP 유사도 {cos_sim:.3f} — AI 변형 전형 패턴",
            "wmMatch": wm_match,
            "clipVerdict": clip_verdict,
            "cosineSimilarity": cos_sim,
        }
    if clip_verdict == "review":
        return {
            "verdict": "manual_review",
            "label": "검토 필요",
            "confidence": "중간",
            "reason": f"CLIP 유사도 {cos_sim:.3f} — 같은 주제일 수 있음",
            "wmMatch": wm_match,
            "clipVerdict": clip_verdict,
            "cosineSimilarity": cos_sim,
        }
    return {
        "verdict": "not_plagiarism",
        "label": "표절 아님",
        "confidence": "높음",
        "reason": "두 증거 모두 부정",
        "wmMatch": wm_match,
        "clipVerdict": clip_verdict,
        "cosineSimilarity": cos_sim,
    }
