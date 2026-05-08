# ImageGuard VM 서버

Flask 기반 이미지 보호 처리 서버. Google Cloud VM Instance에서 실행합니다.

## 핵심 기능

- 워터마크 4단계 (타일 기반, 50% 크롭에도 살아남음)
- 강화 지문 생성 (pHash + dHash + chash + block hash)
- Firebase Storage에 보호 이미지 업로드
- Firestore에 메타데이터 저장
- 고객 자동 등록 (간이 인증)

## 1. Firebase 프로젝트 설정

### 1-1. 프로젝트 만들기

1. https://console.firebase.google.com 접속
2. **프로젝트 추가** → 이름 입력 → 만들기
3. 좌측 메뉴에서 **Firestore Database** 활성화 (테스트 모드로 시작)
4. **Storage** 활성화 (테스트 모드로 시작)

### 1-2. 서비스 계정 키 발급

1. 프로젝트 설정(⚙️) → **서비스 계정** 탭
2. **새 비공개 키 생성** 클릭 → JSON 파일 다운로드
3. 파일명을 `firebase-key.json` 으로 변경

### 1-3. Storage 버킷 이름 확인

Firebase Console 좌측 **Storage** → 상단에 표시되는 `gs://your-project.appspot.com` 형식의 이름 기억

### 1-4. Firestore 보안 규칙 (선택, 운영 환경)

테스트 단계에선 그대로 두고, 운영 시:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // 클라이언트 직접 접근 차단
    }
  }
}
```

서버는 Admin SDK를 쓰니 규칙 무시하고 동작합니다.

## 2. Google Cloud VM Instance 생성

### 2-1. VM 만들기

1. https://console.cloud.google.com → **Compute Engine → VM 인스턴스**
2. **인스턴스 만들기** 클릭
3. 권장 사양:
   - **이름**: `imageguard-server`
   - **리전**: `asia-northeast3` (서울)
   - **머신 유형**: `e2-small` (2 vCPU, 2GB) — 시연용. 운영은 `e2-medium` 이상
   - **부팅 디스크**: Ubuntu 22.04 LTS, 20GB
   - **방화벽**: ✅ HTTP / HTTPS 트래픽 허용

### 2-2. 8080번 포트 방화벽 규칙 추가

VPC 네트워크 → 방화벽 → **방화벽 규칙 만들기**:

- **이름**: `allow-flask-8080`
- **트래픽 방향**: 수신
- **대상**: 네트워크의 모든 인스턴스
- **소스 IP**: `0.0.0.0/0` (시연용. 운영 시 본인 IP만)
- **프로토콜/포트**: TCP `8080`

### 2-3. VM에 SSH 접속

VM 인스턴스 목록에서 **SSH** 버튼 클릭 → 브라우저 SSH 창이 열립니다.

## 3. 서버 코드 배포

### 3-1. 시스템 패키지 설치

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv libgl1 libglib2.0-0
```

> `libgl1`, `libglib2.0-0` 은 OpenCV가 필요로 하는 시스템 라이브러리.

### 3-2. 코드 업로드

VM SSH 창에서 화면 우상단 **⚙️ → 파일 업로드** 사용해서 다음 파일 업로드:

- `app.py`
- `watermark.py`
- `requirements.txt`
- `firebase-key.json` (Firebase에서 받은 서비스 계정 키)

### 3-3. 가상환경 + 의존성

```bash
mkdir -p ~/imageguard && cd ~/imageguard
mv ~/app.py ~/watermark.py ~/requirements.txt ~/firebase-key.json .

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3-4. 환경 변수 설정

```bash
export FIREBASE_KEY_PATH=./firebase-key.json
export FIREBASE_BUCKET="your-project-id.appspot.com"   # ← 본인 버킷명으로
```

영구 설정하려면 `~/.bashrc` 끝에 추가:

```bash
echo 'export FIREBASE_BUCKET="your-project-id.appspot.com"' >> ~/.bashrc
echo 'export FIREBASE_KEY_PATH=/home/$USER/imageguard/firebase-key.json' >> ~/.bashrc
source ~/.bashrc
```

### 3-5. 서버 실행 (개발용 — Flask 내장)

```bash
cd ~/imageguard
source venv/bin/activate
python app.py
```

다음 메시지가 나오면 성공:

```
Firebase 초기화 완료 — bucket: your-project-id.appspot.com
서버 시작: http://0.0.0.0:8080
```

다른 터미널에서 테스트:

```bash
curl http://localhost:8080/api/health
# {"status": "ok", "timestamp": "..."}
```

### 3-6. 외부 접속 확인

VM의 **외부 IP** (인스턴스 목록에서 확인) 로 브라우저 접속:

```
http://YOUR_VM_EXTERNAL_IP:8080/api/health
```

`{"status": "ok", ...}` 가 보이면 외부에서 접근 가능.

## 4. 운영 모드 (gunicorn + 백그라운드)

### 4-1. gunicorn으로 실행

```bash
cd ~/imageguard
source venv/bin/activate
gunicorn -w 2 -b 0.0.0.0:8080 --timeout 120 app:app
```

- `-w 2`: 워커 2개 (CPU 코어 × 2 + 1 권장)
- `--timeout 120`: 워터마크 처리에 시간이 걸리니 여유 있게

### 4-2. systemd 서비스로 등록 (자동 시작)

`/etc/systemd/system/imageguard.service` 파일 작성:

```ini
[Unit]
Description=ImageGuard Flask Server
After=network.target

[Service]
User=YOUR_LINUX_USERNAME
WorkingDirectory=/home/YOUR_LINUX_USERNAME/imageguard
Environment="FIREBASE_KEY_PATH=/home/YOUR_LINUX_USERNAME/imageguard/firebase-key.json"
Environment="FIREBASE_BUCKET=your-project-id.appspot.com"
ExecStart=/home/YOUR_LINUX_USERNAME/imageguard/venv/bin/gunicorn -w 2 -b 0.0.0.0:8080 --timeout 120 app:app
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable imageguard
sudo systemctl start imageguard
sudo systemctl status imageguard   # 상태 확인
```

로그 확인:

```bash
sudo journalctl -u imageguard -f
```

## 5. Next.js 클라이언트 연결

Next.js 프로젝트 루트에 `.env.local` 파일 생성:

```
NEXT_PUBLIC_API_BASE=http://YOUR_VM_EXTERNAL_IP:8080
```

`npm run dev` 재실행하면 적용됩니다.

## 6. 테스트

```bash
curl -X POST http://YOUR_VM_EXTERNAL_IP:8080/api/protect \
  -F "file=@test.jpg" \
  -F "customerName=홍길동" \
  -F "password=test1234" \
  -F "applyWatermark=true" \
  -F "generateFingerprint=true"
```

응답 예시:
```json
{
  "success": true,
  "imageId": "abc123...",
  "assetId": "ASSET-A3F7B2C9",
  "downloadUrl": "https://storage.googleapis.com/.../protected/.../abc123.png",
  "watermarkId": "ASSET-A3F7B2C9",
  "fingerprintHash": "a3f7b2c91e4d8f06",
  "qualityScore": 87,
  "psnr": 32.94,
  "customerStatus": "new"
}
```

## 7. 비용 안내 (참고)

- **VM e2-small**: 월 약 $13 (서울 리전, 24/7 가동 시)
- **Firestore 무료 한도**: 일 5만 read / 2만 write — 시연엔 충분
- **Storage 무료 한도**: 5GB / 다운로드 1GB/일 — 시연엔 충분

운영 시 **VM은 사용 안 할 때 정지**해두면 비용 절약됩니다 (정지 중엔 디스크 비용만 발생, 약 $1~2/월).

## 8. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `ImportError: libGL.so.1` | `sudo apt install libgl1 libglib2.0-0` |
| `FileNotFoundError: firebase-key.json` | `FIREBASE_KEY_PATH` 환경변수 확인 |
| `403 Forbidden` from Firebase | 서비스 계정 키가 잘못됐거나 Storage 활성화 안 됨 |
| Next.js에서 CORS 에러 | Flask CORS는 활성화돼있음. 방화벽 8080번 포트 확인 |
| 외부 IP로 접속 안 됨 | GCP 방화벽 규칙 추가 확인 (8080번 TCP) |
| 처리 시간이 너무 오래 걸림 | VM 사양 올리기 (e2-medium 이상) 또는 워커 수 조정 |

## 9. 확장 가이드

- **인증 강화**: Firebase Auth로 교체 → 토큰 검증
- **사이트 스캔 기능 추가**: `/api/scan` 엔드포인트 추가, BeautifulSoup 사용
- **자동 모니터링**: Cloud Scheduler + Pub/Sub 트리거로 주기 실행
- **HTTPS**: 도메인 + Let's Encrypt 인증서 또는 Cloud Load Balancer
