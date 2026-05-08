"""4단계 타일 기반 워터마크.

이미지를 16개 타일로 분할하고 각 타일에 메시지를 독립적으로 삽입.
50% 크롭에도 살아남도록 redundancy를 갖는다.

핵심 함수:
- embed_watermark(img, message)      → 워터마크 삽입된 이미지 반환
- extract_watermark(img)             → 메시지 추출, 실패 시 빈 문자열
- calculate_psnr(original, modified) → 화질 측정 (dB)
- quality_score_from_psnr(psnr)      → 0~100 화질 점수
"""
import cv2
import numpy as np
from scipy.fftpack import dct, idct


# ===== 파라미터 =====
BLOCK = 8
COEF = (4, 3)                              # DCT 중간 주파수 계수 위치
TILE_ALPHA = 40.0                          # 워터마크 강도 (높을수록 강건성↑, 화질↓)
TILE_BLOCKS = 16                           # 타일 한 변의 블록 수
TILE_PIXELS = TILE_BLOCKS * BLOCK          # 128 픽셀
TILE_CAPACITY = TILE_BLOCKS * TILE_BLOCKS  # 256 비트

TILE_LEN_BITS = 8                          # 메시지 길이 헤더
TILE_MAGIC = 0xCAFE                        # 16비트 매직 (타일 식별자)
TILE_MAGIC_BITS = np.array(
    [int(b) for b in format(TILE_MAGIC, "016b")]
)


# ============================================================
# 비트 변환
# ============================================================
def _text_to_bits(text: str) -> list:
    return [int(b) for byte in text.encode("utf-8") for b in format(byte, "08b")]


def _bits_to_text(bits) -> str:
    out = bytearray()
    for i in range(0, len(bits) - 7, 8):
        out.append(int("".join(str(b) for b in bits[i : i + 8]), 2))
    return out.decode("utf-8", errors="ignore")


def _encode_payload(message: str) -> list:
    payload = _text_to_bits(message)
    if len(payload) > 255:
        raise ValueError(f"메시지가 너무 깁니다 ({len(payload)}비트, 최대 255)")
    header = list(TILE_MAGIC_BITS) + [
        int(b) for b in format(len(payload), f"0{TILE_LEN_BITS}b")
    ]
    bits = header + payload
    if len(bits) > TILE_CAPACITY:
        raise ValueError(f"용량 초과: {len(bits)} > {TILE_CAPACITY}")
    return bits + [0] * (TILE_CAPACITY - len(bits))


# ============================================================
# 임베딩
# ============================================================
def embed_watermark(img_bgr: np.ndarray, message: str) -> np.ndarray:
    """이미지에 메시지를 4단계 타일 워터마크로 삽입한다.

    Args:
        img_bgr: BGR 이미지 (cv2 형식). 최소 128×128 이상.
        message: 삽입할 텍스트 (최대 약 30자).

    Returns:
        워터마크가 삽입된 BGR 이미지.
    """
    bits = _encode_payload(message)
    ycc = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb).astype(np.float32)
    Y = ycc[:, :, 0].copy()
    h, w = Y.shape
    n_ty, n_tx = h // TILE_PIXELS, w // TILE_PIXELS
    if n_ty < 1 or n_tx < 1:
        raise ValueError(
            f"이미지가 너무 작음: 최소 {TILE_PIXELS}×{TILE_PIXELS} 픽셀 필요"
        )

    for ty_idx in range(n_ty):
        for tx_idx in range(n_tx):
            ty = ty_idx * TILE_PIXELS
            tx = tx_idx * TILE_PIXELS
            for i in range(TILE_BLOCKS):
                for j in range(TILE_BLOCKS):
                    idx = i * TILE_BLOCKS + j
                    block = Y[
                        ty + i * BLOCK : ty + (i + 1) * BLOCK,
                        tx + j * BLOCK : tx + (j + 1) * BLOCK,
                    ]
                    d = dct(dct(block, axis=0, norm="ortho"), axis=1, norm="ortho")
                    sign = 1.0 if bits[idx] == 1 else -1.0
                    d[COEF] = sign * (abs(d[COEF]) + TILE_ALPHA)
                    Y[
                        ty + i * BLOCK : ty + (i + 1) * BLOCK,
                        tx + j * BLOCK : tx + (j + 1) * BLOCK,
                    ] = idct(idct(d, axis=1, norm="ortho"), axis=0, norm="ortho")

    ycc[:, :, 0] = np.clip(Y, 0, 255)
    return cv2.cvtColor(ycc.astype(np.uint8), cv2.COLOR_YCrCb2BGR)


# ============================================================
# 추출 (빠른 슬라이딩 검색 + DCT 미리 계산)
# ============================================================
def _precompute_dct_signs(Y: np.ndarray) -> dict:
    """8×8=64가지 픽셀 시프트에 대해 모든 격자 블록의 DCT 부호 미리 계산."""
    sign_grid = {}
    for dy in range(BLOCK):
        for dx in range(BLOCK):
            Ys = Y[dy:, dx:]
            sh, sw = Ys.shape
            nh, nw = sh // BLOCK, sw // BLOCK
            if nh < TILE_BLOCKS or nw < TILE_BLOCKS:
                sign_grid[(dy, dx)] = None
                continue
            blocks = (
                Ys[: nh * BLOCK, : nw * BLOCK]
                .reshape(nh, BLOCK, nw, BLOCK)
                .transpose(0, 2, 1, 3)
            )
            d = dct(dct(blocks, axis=2, norm="ortho"), axis=3, norm="ortho")
            sign_grid[(dy, dx)] = (d[:, :, COEF[0], COEF[1]] > 0).astype(np.int8)
    return sign_grid


def _read_tile_at(sign_grid, ty, tx):
    dy, dx = ty % BLOCK, tx % BLOCK
    by, bx = ty // BLOCK, tx // BLOCK
    grid = sign_grid.get((dy, dx))
    if grid is None:
        return None
    nh, nw = grid.shape
    if by + TILE_BLOCKS > nh or bx + TILE_BLOCKS > nw:
        return None
    return grid[by : by + TILE_BLOCKS, bx : bx + TILE_BLOCKS].flatten()


def _decode_tile_bits(bits, magic_tolerance=4):
    bits = np.asarray(bits)
    if len(bits) < 16 + TILE_LEN_BITS:
        return None, 0
    magic_diff = int(np.sum(bits[:16] != TILE_MAGIC_BITS))
    if magic_diff > magic_tolerance:
        return None, 0
    msg_len = int("".join(str(b) for b in bits[16 : 16 + TILE_LEN_BITS]), 2)
    if msg_len <= 0 or msg_len > 255:
        return None, 0
    payload = bits[16 + TILE_LEN_BITS : 16 + TILE_LEN_BITS + msg_len]
    if len(payload) < msg_len:
        return None, 0
    text = _bits_to_text(list(payload))
    if not text.isprintable():
        return None, 0
    return text, 16 - magic_diff


def extract_watermark(img_bgr: np.ndarray) -> str:
    """이미지에서 워터마크 메시지를 추출. 실패 시 빈 문자열 반환.

    같은 메시지가 여러 타일 위치에서 일관되게 발견될수록 신뢰도 점수↑.
    """
    Y = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb).astype(np.float32)[:, :, 0]
    h, w = Y.shape
    if h < TILE_PIXELS or w < TILE_PIXELS:
        return ""

    sign_grid = _precompute_dct_signs(Y)

    # 매직 매칭 후보 수집
    magic_candidates = []
    for dy in range(BLOCK):
        for dx in range(BLOCK):
            grid = sign_grid.get((dy, dx))
            if grid is None:
                continue
            nh, nw = grid.shape
            for by in range(nh - TILE_BLOCKS + 1):
                for bx in range(nw - TILE_BLOCKS + 1):
                    magic_bits = grid[by, bx : bx + 16]
                    magic_diff = int(np.sum(magic_bits != TILE_MAGIC_BITS))
                    if magic_diff <= 5:
                        ty, tx = by * BLOCK + dy, bx * BLOCK + dx
                        magic_candidates.append((ty, tx, magic_diff))

    magic_candidates.sort(key=lambda x: x[2])
    magic_candidates = magic_candidates[:80]

    text_stats = {}
    for ty, tx, magic_diff in magic_candidates:
        bits = _read_tile_at(sign_grid, ty, tx)
        if bits is None:
            continue
        text, _ = _decode_tile_bits(bits, magic_tolerance=4)
        if text is not None:
            stats = text_stats.setdefault(text, {"count": 0, "magic_sum": 0})
            stats["count"] += 1
            stats["magic_sum"] += magic_diff

    if not text_stats:
        return ""

    def _score(text, stats):
        count = stats["count"]
        avg_magic = stats["magic_sum"] / count
        return count * (16 - avg_magic) * (len(text) ** 0.5)

    return max(text_stats.items(), key=lambda x: _score(x[0], x[1]))[0]


# ============================================================
# 화질 측정
# ============================================================
def calculate_psnr(original: np.ndarray, modified: np.ndarray) -> float:
    """두 이미지 간 PSNR (dB). 높을수록 화질 좋음."""
    mse = np.mean((original.astype(np.float32) - modified.astype(np.float32)) ** 2)
    if mse <= 0:
        return float("inf")
    return float(20 * np.log10(255.0 / np.sqrt(mse)))


def quality_score_from_psnr(psnr: float) -> int:
    """PSNR을 0~100 화질 점수로 변환 (UI 표시용).

    50dB 이상 → 100점
    20dB 이하 → 50점
    그 사이 → 선형 보간
    """
    if psnr == float("inf"):
        return 100
    if psnr >= 50:
        return 100
    if psnr <= 20:
        return 50
    return int(50 + (psnr - 20) / 30 * 50)
