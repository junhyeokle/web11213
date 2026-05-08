"""Stable Diffusion 기반 적대적 노이즈 모듈.

업로드된 노트북(`sd_adversarial_perturbation_mvp.ipynb`)의 핵심 로직을
서버에서 import 가능한 형태로 정리한 버전.

핵심:
- VAE latent 공간에서 원본 → 임의 noise 타겟으로 끌어가는 PGD-style attack
- delta는 [-EPS, EPS]로 clamp → 사람 눈엔 거의 안 보임
- 첫 호출에 모델 로드 (~30초, ~4GB VRAM 점유). 이후 호출은 즉시 사용

환경 변수:
- AI_NOISE_ENABLED=1   → 활성화 (기본 0). GPU 없는 환경에서 import 만으로도
                         에러나지 않게 막기 위함.
- SD_MODEL_ID          → 기본 "runwayml/stable-diffusion-v1-5"
- AI_NOISE_STEPS       → 기본 50 (시연 속도/품질 트레이드오프)
- AI_NOISE_EPS         → 기본 16 (단위: /255)
- AI_NOISE_LR          → 기본 0.01
- AI_NOISE_LAMBDA      → 기본 0.01
"""
from __future__ import annotations

import logging
import os
import threading
from typing import Optional

import numpy as np
from PIL import Image

log = logging.getLogger("imageguard.adversarial")


# ============================================================
# 설정값 — 환경변수로 오버라이드 가능
# ============================================================
def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


SD_MODEL_ID = os.environ.get("SD_MODEL_ID", "runwayml/stable-diffusion-v1-5")
IMG_SIZE = 512  # SD 1.x base 해상도 — 고정
VAE_SCALE = 0.18215  # SD 1.x / 2.x base 공통

DEFAULT_STEPS = _env_int("AI_NOISE_STEPS", 50)
DEFAULT_EPS_255 = _env_float("AI_NOISE_EPS", 16.0)  # /255
DEFAULT_LR = _env_float("AI_NOISE_LR", 0.01)
DEFAULT_LAMBDA = _env_float("AI_NOISE_LAMBDA", 0.01)


# ============================================================
# 싱글톤 모델 컨테이너 (lazy-load + thread-safe)
# ============================================================
_pipe = None
_lock = threading.Lock()
_load_error: Optional[str] = None


def is_available() -> bool:
    """AI 노이즈 기능을 사용할 수 있는지(GPU 있고 환경변수 켜져있는지)."""
    if os.environ.get("AI_NOISE_ENABLED", "0") != "1":
        return False
    try:
        import torch  # noqa: F401
    except ImportError:
        return False
    return True


def _ensure_loaded():
    """SD 파이프라인을 처음 호출 시 한 번만 로드."""
    global _pipe, _load_error
    if _pipe is not None:
        return _pipe
    if _load_error is not None:
        # 이전에 로드 실패했으면 같은 에러 재발생 안 시킴
        raise RuntimeError(_load_error)

    with _lock:
        if _pipe is not None:
            return _pipe
        try:
            import torch
            from diffusers import (
                StableDiffusionImg2ImgPipeline,
                DPMSolverMultistepScheduler,
            )
        except ImportError as e:
            _load_error = (
                f"diffusers/torch가 설치되지 않았습니다: {e}. "
                "GPU 환경에서 `pip install torch diffusers transformers accelerate safetensors`로 설치하세요."
            )
            raise RuntimeError(_load_error)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        if device == "cpu":
            log.warning(
                "GPU가 감지되지 않아 CPU 모드로 동작합니다. "
                "이 모드는 시연용으론 너무 느립니다 — RunPod GPU Pod 권장."
            )
        dtype = torch.float16 if device == "cuda" else torch.float32

        log.info(f"Stable Diffusion 로딩 시작: {SD_MODEL_ID} ({device}, {dtype})")
        pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            SD_MODEL_ID,
            torch_dtype=dtype,
            safety_checker=None,
            requires_safety_checker=False,
        ).to(device)
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            pipe.scheduler.config
        )
        if device == "cuda":
            pipe.enable_attention_slicing()
            try:
                pipe.enable_xformers_memory_efficient_attention()
                log.info("xformers 활성화됨")
            except Exception as e:
                log.info(f"xformers 미사용: {str(e)[:100]}")

        _pipe = pipe
        log.info("SD 로드 완료")
        return _pipe


# ============================================================
# 메인 함수
# ============================================================
def protect_image(
    pil_image: Image.Image,
    strength: int = 50,
    steps: Optional[int] = None,
    eps_255: Optional[float] = None,
) -> Image.Image:
    """원본 이미지에 적대적 노이즈를 입혀 반환.

    Args:
        pil_image: 원본 PIL 이미지 (RGB).
        strength: 0~100. 100에 가까울수록 perturbation 강함 (eps 비례).
        steps:    PGD 스텝 수. None이면 환경변수 / 기본값 사용.
        eps_255:  perturbation 상한(/255). None이면 strength로 계산.

    Returns:
        보호된 PIL 이미지 (입력과 같은 해상도, RGB).

    Raises:
        RuntimeError: 모델 로드 실패 시.
    """
    import torch
    import torch.nn.functional as F
    from torchvision import transforms

    pipe = _ensure_loaded()
    device = pipe.device
    vae = pipe.vae

    # strength → eps 매핑: 0=4/255 (거의 안 보임), 100=24/255 (강함)
    if eps_255 is None:
        s = max(0, min(100, strength))
        eps_255 = 4.0 + (24.0 - 4.0) * (s / 100.0)
    eps = float(eps_255) / 255.0
    n_steps = steps if steps is not None else DEFAULT_STEPS

    log.info(f"적대적 노이즈 시작: steps={n_steps}, eps={eps_255:.1f}/255")

    # 원본 해상도 기억 후 512×512로 center-crop & resize
    orig_w, orig_h = pil_image.size
    s_min = min(orig_w, orig_h)
    left = (orig_w - s_min) // 2
    top = (orig_h - s_min) // 2
    cropped = pil_image.crop((left, top, left + s_min, top + s_min)).convert("RGB")
    work_pil = cropped.resize((IMG_SIZE, IMG_SIZE), Image.LANCZOS)

    to_tensor = transforms.ToTensor()
    work_tensor = to_tensor(work_pil).unsqueeze(0).to(device, torch.float32)

    # VAE는 fp32로 (gradient 안정성)
    vae_orig_dtype = next(vae.parameters()).dtype
    vae.to(torch.float32)

    try:
        # 원본 latent
        with torch.no_grad():
            x_in = work_tensor * 2.0 - 1.0
            z_orig = vae.encode(x_in).latent_dist.mean * VAE_SCALE
            z_orig = z_orig.detach()

        # 타겟: 강한 noise (원본 latent의 std × 2)
        torch.manual_seed(7)
        z_target = (
            torch.randn_like(z_orig) * z_orig.std() * 2.0
        ).detach()

        delta = torch.zeros_like(work_tensor, requires_grad=True)
        opt = torch.optim.Adam([delta], lr=DEFAULT_LR)

        for step in range(n_steps):
            opt.zero_grad()
            prot = (work_tensor + delta).clamp(0, 1)
            x_in = prot * 2.0 - 1.0
            z_prot = vae.encode(x_in).latent_dist.mean * VAE_SCALE

            loss_adv = F.mse_loss(z_prot, z_target)
            loss_reg = delta.abs().mean()
            loss = loss_adv + DEFAULT_LAMBDA * loss_reg

            if not torch.isfinite(loss):
                log.warning(f"loss NaN/Inf at step {step} — 조기 종료")
                break

            loss.backward()
            opt.step()

            with torch.no_grad():
                delta.data.clamp_(-eps, eps)
                delta.data = (work_tensor + delta.data).clamp(0, 1) - work_tensor

        with torch.no_grad():
            final = (work_tensor + delta).clamp(0, 1)
        arr = (final[0].cpu().numpy().transpose(1, 2, 0) * 255).clip(0, 255).astype(
            np.uint8
        )
        protected_512 = Image.fromarray(arr)

        # 원본 해상도로 복원: 단, center-crop 했으므로 정사각형으로 돌려줌.
        # 원본이 이미 정사각형이었다면 size 그대로, 아니라면 짧은 변 기준 정사각.
        target_size = s_min
        protected_full = protected_512.resize(
            (target_size, target_size), Image.LANCZOS
        )

        log.info("적대적 노이즈 완료")
        return protected_full

    finally:
        vae.to(vae_orig_dtype)
        if device.type == "cuda":
            torch.cuda.empty_cache()
