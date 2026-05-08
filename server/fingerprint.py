"""강화 이미지 지문 — 다중 해시 결합.

핵심 함수:
- enhanced_fingerprint(img)        → dict 형태의 지문
- fingerprint_to_dict(fp)          → Firestore 저장용 (16진수 직렬화)
"""
import cv2
import numpy as np
from PIL import Image
from scipy.fftpack import dct


# ============================================================
# 기본 헬퍼
# ============================================================
def _gray_pil(img):
    if isinstance(img, np.ndarray):
        if img.ndim == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        return Image.fromarray(img).convert("L")
    return img.convert("L")


def phash(img, size=8, hf=4):
    """Perceptual Hash (DCT 저주파 기반)."""
    n = size * hf
    pil = _gray_pil(img).resize((n, n), Image.LANCZOS)
    arr = np.asarray(pil, dtype=np.float32)
    d = dct(dct(arr, axis=0, norm="ortho"), axis=1, norm="ortho")
    low = d[:size, :size]
    return (low > np.median(low)).flatten()


def dhash(img, size=8):
    """Difference Hash (인접 픽셀 그래디언트 기반)."""
    pil = _gray_pil(img).resize((size + 1, size), Image.LANCZOS)
    arr = np.asarray(pil, dtype=np.int16)
    return (arr[:, 1:] > arr[:, :-1]).flatten()


def chash(img_bgr, h_bins=12, s_bins=10, v_bins=8):
    """Color Hash (HSV 히스토그램 기반). 크롭/회전에 강함."""
    if isinstance(img_bgr, Image.Image):
        img_bgr = cv2.cvtColor(np.array(img_bgr), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    hs = cv2.calcHist([hsv], [0, 1], None, [h_bins, s_bins], [0, 180, 0, 256])
    sv = cv2.calcHist([hsv], [1, 2], None, [s_bins, v_bins], [0, 256, 0, 256])
    return np.concatenate(
        [
            (hs > np.median(hs)).flatten(),
            (sv > np.median(sv)).flatten(),
        ]
    )


def block_phash(img_bgr, grid=4):
    """이미지를 grid×grid 블록으로 나눠 각 블록의 pHash 추출.

    크롭으로 일부 블록이 잘려도 살아남은 블록은 매칭 가능.
    """
    if isinstance(img_bgr, np.ndarray):
        rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        pil = Image.fromarray(rgb)
    else:
        pil = img_bgr
    w, h = pil.size
    bh, bw = h // grid, w // grid
    blocks = []
    for gy in range(grid):
        for gx in range(grid):
            sub = pil.crop((gx * bw, gy * bh, (gx + 1) * bw, (gy + 1) * bh))
            blocks.append(phash(sub))
    return np.array(blocks)


# ============================================================
# 강화 지문 = 모든 해시 묶음
# ============================================================
def enhanced_fingerprint(img_bgr) -> dict:
    """다중 해시를 결합한 강화 지문.

    각 해시의 약점을 다른 해시가 보완:
    - phash: 압축/색조정에 강함
    - dhash: 밝기 변화에 강함
    - chash: 크롭/회전에 강함
    - block4/8: 부분 매칭 가능
    """
    return {
        "phash": phash(img_bgr),
        "dhash": dhash(img_bgr),
        "chash": chash(img_bgr),
        "block4": block_phash(img_bgr, grid=4),
        "block8": block_phash(img_bgr, grid=8),
    }


# ============================================================
# 직렬화 (Firestore 저장용)
# ============================================================
def hash_to_hex(h: np.ndarray) -> str:
    """numpy boolean 해시 → 16진수 문자열."""
    bits = "".join("1" if b else "0" for b in h)
    if not bits:
        return ""
    return f"{int(bits, 2):0{(len(bits) + 3) // 4}x}"


def fingerprint_to_dict(fp: dict) -> dict:
    """강화 지문을 Firestore에 저장 가능한 dict로 변환."""
    return {
        "phash": hash_to_hex(fp["phash"]),
        "dhash": hash_to_hex(fp["dhash"]),
        "chash": hash_to_hex(fp["chash"]),
        "block4": [hash_to_hex(b) for b in fp["block4"]],
        "block8": [hash_to_hex(b) for b in fp["block8"]],
    }


# ============================================================
# 비교 (두 지문 간 유사도 계산)
# ============================================================
def hash_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """두 boolean 해시 간 유사도 (0~1, 1=완전 동일)."""
    if a.size != b.size:
        return 0.0
    return float(1.0 - np.count_nonzero(a != b) / a.size)


def block_similarity(blocks_a: np.ndarray, blocks_b: np.ndarray) -> float:
    """블록 해시 묶음의 평균 유사도."""
    if blocks_a.shape != blocks_b.shape:
        return 0.0
    sims = [hash_similarity(blocks_a[i], blocks_b[i]) for i in range(len(blocks_a))]
    return float(np.mean(sims)) if sims else 0.0


# 종합 유사도 가중치
WEIGHTS = {
    "phash": 0.30,
    "dhash": 0.20,
    "chash": 0.10,
    "block4": 0.20,
    "block8": 0.20,
}


def compare_fingerprints(fp_a: dict, fp_b: dict) -> dict:
    """두 강화 지문 간 종합 + 해시별 유사도 계산.

    Returns:
        {
          "overall": 0.0~1.0,
          "phash": ..., "dhash": ..., "chash": ...,
          "block4": ..., "block8": ...,
        }
    """
    sims = {
        "phash": hash_similarity(fp_a["phash"], fp_b["phash"]),
        "dhash": hash_similarity(fp_a["dhash"], fp_b["dhash"]),
        "chash": hash_similarity(fp_a["chash"], fp_b["chash"]),
        "block4": block_similarity(fp_a["block4"], fp_b["block4"]),
        "block8": block_similarity(fp_a["block8"], fp_b["block8"]),
    }
    overall = sum(sims[k] * WEIGHTS[k] for k in WEIGHTS)
    return {"overall": overall, **sims}


def verdict_from_similarity(overall: float) -> tuple:
    """종합 유사도 → 판정 라벨 + 한글 설명.

    Returns: (verdict_id, verdict_label_kr)
    """
    if overall >= 0.95:
        return "identical", "거의 동일한 이미지"
    if overall >= 0.80:
        return "similar", "변형된 같은 이미지로 추정"
    if overall >= 0.60:
        return "modified", "일부 유사 — 검토 필요"
    return "different", "다른 이미지"


# ============================================================
# 두 지문 비교 (이미지 검사용)
# ============================================================
def _hash_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """두 boolean 해시의 유사도 0~1."""
    if a.size != b.size or a.size == 0:
        return 0.0
    return 1.0 - float(np.count_nonzero(a != b)) / a.size


def _block_similarity(blocks1: np.ndarray, blocks2: np.ndarray) -> float:
    """블록 단위 해시 묶음 비교. 같은 위치 블록끼리 평균."""
    if blocks1.shape != blocks2.shape:
        return 0.0
    sims = [_hash_similarity(b1, b2) for b1, b2 in zip(blocks1, blocks2)]
    return float(np.mean(sims)) if sims else 0.0


def compare_fingerprints(fp1: dict, fp2: dict) -> dict:
    """두 강화 지문 간 유사도 계산.

    각 해시별 유사도와 가중 평균 종합 점수 반환.
    """
    phash_sim = _hash_similarity(fp1["phash"], fp2["phash"])
    dhash_sim = _hash_similarity(fp1["dhash"], fp2["dhash"])
    chash_sim = _hash_similarity(fp1["chash"], fp2["chash"])
    block4_sim = _block_similarity(fp1["block4"], fp2["block4"])
    block8_sim = _block_similarity(fp1["block8"], fp2["block8"])

    # 노트북에서 검증한 가중치 그대로 사용
    overall = (
        0.30 * phash_sim
        + 0.20 * dhash_sim
        + 0.10 * chash_sim
        + 0.20 * block4_sim
        + 0.20 * block8_sim
    )

    return {
        "overall": overall,
        "phash": phash_sim,
        "dhash": dhash_sim,
        "chash": chash_sim,
        "block4": block4_sim,
        "block8": block8_sim,
    }
