# ImageGuard 서버 — GCP VM + Firebase 배포 가이드

이 문서는 Python Flask 서버를 Google Cloud VM에 배포하고 Firebase와 연동하는 단계별 가이드입니다.

## 전체 흐름

```
[Next.js 프론트엔드]   ──HTTPS──→   [GCP VM Flask 서버]   ──Admin SDK──→   [Firestore + Storage]
                                          ↑
                                   워터마크 + 지문 처리
                                   고객 인증 (bcrypt)
```

---

## 1단계 — Firebase 프로젝트 만들기

### 1-1. 프로젝트 생성
https://console.firebase.google.com 에서 새 프로젝트 생성

### 1-2. Firestore 활성화
- 좌측 메뉴 → **Firestore Database** → **데이터베이스 만들기**
- **프로덕션 모드**로 시작
- 위치: `asia-northeast3` (서울) 권장

### 1-3. Storage 활성화
- 좌측 메뉴 → **Storage** → **시작하기**
- 프로덕션 모드, 같은 위치
- 상단의 `gs://your-project-id.appspot.com` 형식 버킷 이름 메모

### 1-4. 서비스 계정 키 다운로드
- 프로젝트 설정(⚙️) → **서비스 계정** 탭
- **새 비공개 키 생성** → JSON 다운로드
- 파일명을 `firebase-key.json`으로 저장

> ⚠️ 이 파일은 절대 GitHub에 올리지 마세요. (.gitignore에 이미 등록됨)

### 1-5. 보안 규칙
서버가 Admin SDK로만 접근하므로 클라이언트는 차단:

**Firestore 규칙**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

**Storage 규칙**:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;       // 보호 이미지 다운로드용 (public)
      allow write: if false;     // 서버만 쓰기 가능
    }
  }
}
```

---

## 2단계 — GCP VM 인스턴스 생성

### 2-1. VM 만들기
GCP 콘솔 → **Compute Engine** → **VM 인스턴스 만들기**

| 항목 | 권장 값 |
|---|---|
| 이름 | `imageguard-server` |
| 리전 | `asia-northeast3` |
| 머신 유형 | `e2-small` (시연) / `e2-medium` (운영) |
| 부팅 디스크 | **Ubuntu 22.04 LTS**, 20GB |
| 방화벽 | HTTP/HTTPS 트래픽 둘 다 체크 |

### 2-2. 8080 포트 열기
**VPC 네트워크** → **방화벽** → **방화벽 규칙 만들기**:
- 이름: `allow-flask-8080`
- 트래픽 방향: **수신**
- 대상: 네트워크의 모든 인스턴스
- 소스 IPv4 범위: `0.0.0.0/0`
- TCP, **8080**

---

## 3단계 — VM에 서버 배포

### 3-1. SSH 접속
VM 목록에서 **SSH** 버튼 클릭 → 브라우저 SSH 창 열림

### 3-2. 시스템 패키지
```bash
sudo apt update
sudo apt install -y python3-pip python3-venv libgl1 libglib2.0-0 git
```

### 3-3. 코드 업로드
**방법 A: GitHub**
```bash
git clone https://github.com/yourname/copyright-protection-web.git
cd copyright-protection-web/server
```

**방법 B: 직접 업로드**
SSH 창 우측 ⚙️ → 파일 업로드로 `server/` 폴더 안 모든 파일 업로드:
```bash
mkdir ~/server && cd ~/server
# 업로드 후
```

### 3-4. Python 가상환경 + 의존성
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

(5분 정도 걸림)

### 3-5. Firebase 키 + 환경변수
```bash
# firebase-key.json 업로드 후
chmod 600 firebase-key.json

cp .env.example .env
nano .env
```

`.env` 내용 수정:
```
FIREBASE_KEY_PATH=./firebase-key.json
FIREBASE_BUCKET=your-project-id.appspot.com
ALLOWED_ORIGINS=http://localhost:3000
PORT=8080
```

### 3-6. 테스트 실행
```bash
source venv/bin/activate
python app.py
```

다음 메시지 확인:
```
Firebase 초기화 완료 — bucket: ...
서버 시작: http://0.0.0.0:8080
```

다른 SSH 창:
```bash
curl http://localhost:8080/api/health
```

`{"status":"ok",...}` 응답이 오면 정상.

---

## 4단계 — 백그라운드 실행 (운영용)

### 4-1. systemd 서비스 등록
```bash
sudo nano /etc/systemd/system/imageguard.service
```

내용 (`ubuntu`는 본인 사용자명, `whoami`로 확인):
```ini
[Unit]
Description=ImageGuard Flask Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/server
EnvironmentFile=/home/ubuntu/server/.env
ExecStart=/home/ubuntu/server/venv/bin/gunicorn -w 2 -b 0.0.0.0:8080 --timeout 120 app:app
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 4-2. 서비스 시작
```bash
sudo systemctl daemon-reload
sudo systemctl enable imageguard
sudo systemctl start imageguard
sudo systemctl status imageguard
```

`active (running)` 확인.

### 4-3. 로그 확인
```bash
sudo journalctl -u imageguard -f
```

---

## 5단계 — 외부 접속 확인

VM의 **외부 IP** 확인 (예: `34.64.123.45`).

```bash
curl http://34.64.123.45:8080/api/health
```

`{"status":"ok"}` 응답이 외부에서도 오면 OK.

---

## 6단계 — Next.js와 연결

`copyright-protection-web/.env.local` 파일 생성:
```
NEXT_PUBLIC_API_BASE=http://34.64.123.45:8080
```

Next.js 재시작:
```bash
npm run dev
```

`/protect` 페이지에서 이미지 + 고객 정보 입력 후 처리하면 VM 서버 → Firebase에 저장됩니다.

---

## 트러블슈팅

| 증상 | 해결 |
|---|---|
| `Connection refused` | 방화벽 8080 포트 확인 / `systemctl status imageguard` |
| `Firebase 초기화 실패` | `firebase-key.json` 경로, `FIREBASE_BUCKET` 값 확인 |
| CORS 오류 | `.env`의 `ALLOWED_ORIGINS`에 프론트엔드 도메인 추가 → `systemctl restart imageguard` |
| 이미지가 너무 작음 | 4단계 워터마크는 최소 128×128 필요 |
| `libGL.so.1` 오류 | `sudo apt install -y libgl1 libglib2.0-0` |
| OOM (메모리 부족) | VM을 `e2-medium` 이상으로 업그레이드 |

---

## 비용 안내

**시연/개발** (e2-small, 시간당 ~25원):
- 24시간 가동: 월 약 18,000원
- 시연만 켜두면: 시간당 25원
- 사용 안 할 때 VM **중지**: 디스크 비용만 (월 ~2,000원)

**Firebase**:
- Spark 플랜(무료): Firestore 20K reads/day, Storage 5GB까지 무료
- Blaze 플랜(종량제): 사용량만큼 과금

---

## API 명세

### POST /api/protect
이미지 보호 처리.

**Form data**:
| 필드 | 필수 | 타입 | 설명 |
|---|---|---|---|
| image | ✓ | File | 이미지 파일 (PNG/JPG/WEBP) |
| customerName | ✓ | string | 고객명 |
| password | ✓ | string | 비밀번호 (4자 이상) |
| applyAINoise | | "true"/"false" | AI 노이즈 (현재 placeholder) |
| applyWatermark | | "true"/"false" | 워터마크 적용 (default true) |
| generateFingerprint | | "true"/"false" | 지문 생성 (default true) |
| strength | | 10~100 | 보호 강도 |
| metadata | | string | 워터마크 ID 텍스트 |

**응답** (200):
```json
{
  "id": "img_abc123",
  "customerId": "customer_xyz",
  "isNewCustomer": true,
  "appliedAt": "2026-05-08T12:34:56Z",
  "noise": false,
  "watermark": true,
  "fingerprint": true,
  "watermarkId": "WM-12345678",
  "fingerprintHash": "a3f7b2c91e4d8f06",
  "downloadUrl": "https://storage.googleapis.com/.../image.png",
  "qualityScore": 90,
  "filename": "photo.jpg"
}
```

### GET /api/health
서버 상태 확인.

### GET /api/customers/{name}/images
고객의 이미지 목록. 헤더 `X-Customer-Password` 필요.

---

## Firestore 데이터 구조

```
customers/{customerId}
  - name: string
  - passwordHash: string (bcrypt)
  - createdAt: timestamp

images/{imageId}
  - id: string
  - customerId: string
  - customerName: string
  - watermarkId: string | null
  - fingerprint: { phash, dhash, chash, block4, block8 }
  - storagePath: string
  - downloadUrl: string
  - originalFilename: string
  - imageSize: [width, height]
  - options: { applyAINoise, applyWatermark, generateFingerprint, strength }
  - qualityScore: number (0-100)
  - psnr: number | null
  - createdAt: timestamp
```
