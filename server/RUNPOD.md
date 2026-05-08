# RunPod Pod에 Flask + 적대적 노이즈 서버 배포

GCP에서 T4 GPU 못 쓸 때 가장 빠른 대안. PyTorch가 미리 깔린 RunPod PyTorch 템플릿 위에서 30분 안에 띄울 수 있습니다.

> 비용 안내: RTX A4000(16GB) 기준 ~$0.17/h, T4 ~$0.19/h. 시연 며칠 짜리면 $5~10.
> 사용 안 할 때 **Stop**하면 디스크 비용 시간당 $0.01 정도만 부과됨.

## 1. RunPod 가입 및 결제

1. https://runpod.io 가입 (Google/GitHub 로그인 가능)
2. **Billing**에 $10 충전 (Stripe 카드 결제)

## 2. Pod 생성

1. **Pods** → **+ Deploy** 클릭
2. 설정:
   - **GPU**: `RTX A4000` 추천 (16GB VRAM, T4보다 빠르고 비슷한 가격) — 없으면 `RTX 3070` / `T4`
   - **Pod Type**: `On-Demand` (Spot은 갑자기 종료 위험)
   - **Template**: `RunPod Pytorch 2.1` (Ubuntu 22.04 + Python 3.10 + CUDA 12.1 + PyTorch)
   - **Container Disk**: 20GB
   - **Volume Disk**: 30GB (Stable Diffusion 가중치 ~4GB + 마진)
   - **Expose HTTP Ports**: `8080` ← **반드시 추가**
3. **Deploy On-Demand** → 1~3분 대기

## 3. SSH/Web Terminal 접속

Pod가 Running 되면 카드의 **Connect** 버튼:
- 처음엔 **Connect to Web Terminal**이 가장 쉬움 (브라우저 안에서 바로 사용)
- 익숙해지면 **SSH over exposed TCP** 권장

## 4. 코드 배포

Web Terminal에서:

```bash
# 작업 폴더 (재시작해도 보존되는 /workspace 사용)
cd /workspace
git clone https://github.com/junhyeokle/web11213.git
cd web11213/server

# 시스템 라이브러리 (OpenCV가 필요)
apt update -qq
apt install -y -qq libgl1 libglib2.0-0

# Python 의존성 — torch는 템플릿에 이미 있으니 나머지만
pip install -r requirements.txt -q
pip install -r requirements-gpu.txt -q
```

(약 3~5분 걸림)

## 5. Firebase 키 업로드

`firebase-key.json` 파일을 Pod 안에 넣어야 합니다. 두 가지 방법:

### 방법 A: Jupyter Lab UI 드래그앤드롭 (쉬움)
1. RunPod 콘솔의 Pod **Connect** → `Connect to Jupyter Lab`
2. 좌측 파일 트리에서 `/workspace/web11213/server/` 진입
3. 로컬 PC의 `firebase-key.json`을 드래그해서 업로드

### 방법 B: 터미널에 붙여넣기
```bash
cat > /workspace/web11213/server/firebase-key.json << 'EOF'
{여기에 firebase-key.json 내용 통째로 붙여넣기}
EOF
chmod 600 /workspace/web11213/server/firebase-key.json
```

## 6. 환경변수 설정 + 서버 실행

```bash
cd /workspace/web11213/server

# Vercel 도메인은 본인 거로 교체. Pod ID는 RunPod 콘솔에서 확인.
cat > .env << 'EOF'
FIREBASE_KEY_PATH=./firebase-key.json
FIREBASE_BUCKET=your-project-id.appspot.com
ALLOWED_ORIGINS=https://web11213.vercel.app,http://localhost:3000
PORT=8080

# === 적대적 노이즈 활성화 ===
AI_NOISE_ENABLED=1
SD_MODEL_ID=runwayml/stable-diffusion-v1-5
AI_NOISE_STEPS=50
AI_NOISE_EPS=16

# === TrustMark + CLIP 활성화 (AI 재생성 표절 탐지) ===
TRUSTMARK_ENABLED=1
TRUSTMARK_MODEL_TYPE=Q
CLIP_ENABLED=1
CLIP_MODEL=ViT-L-14
CLIP_PRETRAINED=openai

# Pod의 외부 HTTP 프록시 URL — 콘솔 Connect 메뉴에서 확인
# 예: https://abc123-8080.proxy.runpod.net
PUBLIC_BASE_URL=https://YOUR-POD-ID-8080.proxy.runpod.net
EOF

set -a; source .env; set +a

# 첫 실행 — Stable Diffusion 모델이 자동 다운로드됩니다 (3~5분, ~4GB).
# timeout 600은 첫 요청 처리 중 모델 로드 + perturbation 60~90초 여유.
gunicorn -w 1 -b 0.0.0.0:8080 --timeout 600 app:app
```

> **`-w 1` 워커 1개** 가 중요: SD 모델은 워커당 4GB VRAM을 쓰므로 16GB GPU에서 워커 2개면 OOM 위험.

뜨면 다음 줄들이 보일 겁니다:
```
[INFO] Firestore 초기화 완료. 로컬 저장 경로: /workspace/web11213/server/storage
[INFO] CORS 허용 도메인: ['https://web11213.vercel.app', 'http://localhost:3000']
[INFO] Listening at: http://0.0.0.0:8080
```

## 7. 헬스체크 + 외부 URL 확인

다른 터미널 창에서:
```bash
curl http://localhost:8080/api/health
# → {"status": "ok", "timestamp": "..."}
```

RunPod 콘솔의 Pod 카드에서 **Connect → HTTP Service [Port 8080]** 클릭하면 자동 발급된 외부 URL이 열립니다. 형태:
```
https://{podid}-8080.proxy.runpod.net
```

브라우저에서:
```
https://{podid}-8080.proxy.runpod.net/api/health
```

`{"status":"ok"}` 응답 = 외부에서 접근 가능 = Vercel에 넣을 수 있는 백엔드 URL.

## 8. Vercel에 백엔드 URL 등록

1. https://vercel.com → 본인 프로젝트 → **Settings → Environment Variables**
2. 추가:
   - **Key**: `NEXT_PUBLIC_API_BASE`
   - **Value**: `https://{podid}-8080.proxy.runpod.net`  ← 7단계의 URL
   - **Environments**: Production, Preview, Development 모두 체크
3. **Save**
4. **Deployments → 최신 배포 ⋯ → Redeploy** (환경변수 반영용)

이후 `https://web11213.vercel.app/protect` 에서 이미지 업로드하면 RunPod의 Flask가 호출됩니다.

## 9. 백그라운드 실행 (선택)

Web Terminal 닫으면 gunicorn도 같이 종료됩니다. 시연 동안 계속 띄우려면:

```bash
cd /workspace/web11213/server
set -a; source .env; set +a
nohup gunicorn -w 1 -b 0.0.0.0:8080 --timeout 600 app:app > server.log 2>&1 &
echo "PID: $!"
```

로그 확인: `tail -f server.log`
종료: `pkill gunicorn`

## 10. 첫 호출 — 모델 다운로드 워밍업

`/api/protect`에 `applyAINoise=true` 첫 요청은 **2~5분** 걸립니다 (SD 모델 다운로드 + 첫 inference 컴파일). 시연 직전에 미리 한 번 호출해서 워밍업 해두세요. 이후 호출은 30~60초.

## 11. 시연 끝나면 — 비용 절감

RunPod 콘솔에서 Pod 카드의:
- **Stop**: 컴퓨팅 정지, 디스크만 보존 (시간당 ~$0.01). 다시 Start하면 1분 안에 그대로.
- **Terminate**: 완전 삭제. 다시 처음부터 세팅 필요.

며칠 시연이면 **Stop** 추천.

## 트러블슈팅

| 증상 | 해결 |
|---|---|
| `OutOfMemoryError: CUDA out of memory` | `gunicorn -w 1` 인지 확인. `AI_NOISE_STEPS=30`으로 낮춰 보기. |
| 첫 요청이 영원히 안 끝남 | 모델 다운로드 중. `tail -f server.log`로 확인. 5분 기다려보기. |
| 502 Bad Gateway from RunPod proxy | gunicorn timeout 짧음. `--timeout 600` 인지 확인. |
| CORS 에러 (브라우저 콘솔) | `.env`의 `ALLOWED_ORIGINS`에 본인 Vercel 도메인 정확히 들어갔는지 확인. 프로토콜(`https://`)도 포함. |
| `applyAINoise=true` 무시됨 | `.env`의 `AI_NOISE_ENABLED=1` + `set -a; source .env; set +a` 다시 실행 후 서버 재시작. |
| Pod 재시작 후 의존성 사라짐 | `pip install`은 컨테이너 디스크에 깔리고 Stop/Start하면 그대로. Terminate 후 재생성하면 다시 깔아야 함. |
| `cuda: False` 또는 `torch 2.11.0+cu130` | trustmark/open_clip이 새 torch 끌어옴. 원복: `pip install --force-reinstall "torch==2.8.0" "torchvision==0.23.0" --index-url https://download.pytorch.org/whl/cu128` |
| `cv2 FAIL: numpy._core.multiarray failed` | opencv 4.13이 numpy 2 요구. 원복: `pip install --force-reinstall "opencv-python-headless<4.11" "numpy<2"` |
