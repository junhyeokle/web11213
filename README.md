# ImageGuard — AI 시대의 이미지 저작권 보호 플랫폼

Next.js 14 (App Router) + TypeScript + Tailwind + Flask + Firebase 기반의 풀스택 프로토타입.

## 구성

| 부분 | 위치 | 기술 |
|---|---|---|
| 프론트엔드 | `app/`, `components/`, `lib/` | Next.js 14, TypeScript, Tailwind, Framer Motion |
| 백엔드 (이미지 처리) | `server/` | Python Flask, OpenCV, Firebase Admin SDK |
| 데이터베이스 | Firebase Firestore | 고객 정보 + 이미지 메타데이터 |
| 파일 저장소 | Firebase Storage | 보호 처리된 이미지 |

## 데이터 흐름

```
[브라우저: Next.js]
   │
   │ 이미지 + 고객명/비밀번호 + 옵션
   ▼
[VM Instance: Flask 서버]
   ① 고객 인증 (Firestore의 customers 컬렉션 조회 + bcrypt 검증)
      └─ 신규 고객이면 자동 등록
   ② 워터마크 4단계 + 강화 지문 적용
   ③ 보호 이미지 → Firebase Storage 업로드
   ④ 메타데이터 → Firestore의 images 컬렉션 저장
   │
   │ 다운로드 URL 응답
   ▼
[브라우저] 다운로드 가능
```

## Firestore 컬렉션

```
customers/{customerId}        # 고객 정보 (자동 ID)
  - name: string              # 고객명
  - passwordHash: string      # bcrypt 해시
  - createdAt: timestamp

images/{imageId}              # 이미지 메타데이터 (UUID)
  - id: string
  - customerId: string        # 고객 참조
  - customerName: string
  - assetId: string           # 워터마크에 삽입된 ID
  - watermarkApplied: bool
  - fingerprintApplied: bool
  - watermarkId: string
  - fingerprint: { phash, dhash, chash, block4[], block8[] }
  - storagePath: string       # Storage 경로
  - downloadUrl: string       # 다운로드 URL
  - originalFilename: string
  - imageSize: [w, h]
  - qualityScore: int
  - psnr: float
  - createdAt: timestamp
```

## 실행 순서

전체를 작동시키려면 (1) Firebase 설정 → (2) VM 서버 배포 → (3) Next.js 실행 순서로 진행합니다.

### 1. Firebase 설정

`server/README.md`의 **1번 섹션** 참고. 요약:
- Firebase 프로젝트 생성
- Firestore Database + Storage 활성화
- 서비스 계정 키 (`firebase-key.json`) 다운로드

### 2. 백엔드 서버 배포

GPU 사용 여부에 따라 두 가지 경로:

**A. CPU만 (워터마크/지문만, AI 노이즈 OFF)** — `server/README.md`의 GCP VM 가이드.
- e2-small 정도면 충분
- `.env`에서 `AI_NOISE_ENABLED=0` (또는 미설정)

**B. GPU 포함 (적대적 노이즈 ON)** — `server/RUNPOD.md` 참고.
- RunPod RTX A4000 / T4 Pod
- HTTPS URL 자동 발급 (`https://{podid}-8080.proxy.runpod.net`)
- `.env`에서 `AI_NOISE_ENABLED=1` + `pip install -r requirements-gpu.txt`

### 3. Next.js 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# .env.local 편집해서 NEXT_PUBLIC_API_BASE를 VM IP로 변경

# 개발 서버 실행
npm run dev
```

브라우저: http://localhost:3000

## 주요 페이지

| 경로 | 설명 |
|---|---|
| `/` | 메인 랜딩 |
| `/protect` | 이미지 보호 — 고객명/비밀번호 + 워터마크/지문 옵션 + 처리 |
| `/compare` | 이미지 비교 — 두 이미지 유사도 + 워터마크 추출 (실제 동작) |
| `/scan` | 사이트 검사 — URL 입력 후 매칭 (mock) |
| `/monitor` | 자동 모니터링 — 사이트 등록/관리 (mock) |

> `/scan`, `/monitor`는 아직 mock 데이터입니다. 백엔드 연결되어 있는 건 `/protect`와 `/compare`.

## 폴더 구조

```
copyright-protection-web/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # 메인 랜딩
│   ├── globals.css
│   ├── protect/page.tsx          # 이미지 보호 (실제 백엔드 연결)
│   ├── scan/page.tsx             # 사이트 검사 (mock)
│   └── monitor/page.tsx          # 자동 모니터링 (mock)
├── components/
│   ├── ui/                       # 기본 UI (Button, Card, Input 등)
│   ├── landing/                  # 랜딩 섹션들
│   ├── protect/                  # 이미지 보호 페이지
│   │   ├── customer-info.tsx     # 고객명/비밀번호 입력
│   │   ├── upload-area.tsx
│   │   ├── protection-options.tsx
│   │   └── result-card.tsx       # 다운로드 버튼 포함
│   ├── scan/
│   ├── monitor/
│   ├── navbar.tsx
│   ├── footer.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── api.ts                    # 실제 VM 서버 호출
│   ├── mock-api.ts               # mock (scan/monitor용)
│   ├── types.ts
│   └── utils.ts
├── server/                       # ⭐ Python Flask 서버 (VM에 배포)
│   ├── app.py                    # Flask 메인
│   ├── watermark.py              # 4단계 워터마크
│   ├── fingerprint.py            # 강화 지문
│   ├── requirements.txt
│   └── README.md                 # VM 배포 가이드
├── tailwind.config.ts
├── next.config.mjs
├── package.json
└── .env.local.example            # NEXT_PUBLIC_API_BASE 설정
```

## 환경 변수

`.env.local` 에 다음 한 줄:

```
NEXT_PUBLIC_API_BASE=http://YOUR_VM_IP:8080
```

기본값은 `http://localhost:8080` 이라 같은 PC에서 Flask를 띄우면 그대로 됩니다.

## Vercel 배포 가이드

> 핵심: **Vercel = 프론트엔드(Next.js)만**, **Flask 서버는 GCP에서 별도 호스팅**.
> 한 Vercel 프로젝트 안에 둘 다 넣으려는 시도는 OpenCV / Firebase Admin / 처리 시간 제약 때문에 작동하지 않습니다.

### 0. 사전 준비
- Flask 서버가 GCP VM(또는 Cloud Run)에 떠 있고 `https://`로 접근 가능해야 함
  - HTTP만 있으면 Vercel(HTTPS)에서 mixed-content로 차단됩니다
  - 가장 쉬운 방법은 **Cloud Run**에 컨테이너로 올리면 자동 HTTPS가 붙습니다
  - VM을 쓴다면 도메인 + Let's Encrypt 또는 Cloud Load Balancer로 HTTPS 종단 설정
- Firebase 키(`firebase-key.json`)는 **Vercel에 올라가면 안 됨** — Flask 쪽 환경에만 둠

### 1. GitHub에 푸시
이 저장소를 통째로 GitHub에 올립니다. `.vercelignore`가 `server/` 폴더를 빌드 단계에서 제외해주므로 Flask 코드가 Vercel 함수로 변환되는 일은 없습니다.

### 2. Vercel에 프로젝트 연결
1. https://vercel.com → **Add New… → Project** → GitHub 저장소 선택
2. Framework Preset: `Next.js` (자동 감지됨)
3. Root Directory: 저장소 루트 그대로 둠 (Next.js가 루트에 있음)
4. Build & Output settings는 기본값 유지 (`vercel.json`이 같이 들어감)

### 3. 환경 변수 설정 (Vercel 대시보드)
Project → **Settings → Environment Variables**:

| Key | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `https://your-flask.example.com` | Production / Preview / Development |

> ⚠️ 반드시 `https://`로 시작해야 합니다. HTTP면 브라우저가 차단합니다.

### 4. Flask 서버에 Vercel 도메인 허용
GCP VM의 `.env`에서:
```
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```
저장 후 서비스 재시작:
```
sudo systemctl restart imageguard
```

### 5. Deploy
Vercel에서 **Deploy** 버튼. 빌드가 끝나면 `https://your-app.vercel.app` 으로 접속 가능.

### 자주 묻는 것

**Q. Flask를 Vercel에 넣을 수는 없나요?**
A. 안 됩니다. 이 서버는 OpenCV(워터마크) + bcrypt + Firebase Admin SDK를 쓰는데 Vercel 서버리스 함수의 50MB 한도, 60초(Hobby)/300초(Pro) 실행 한도 안에 못 들어갑니다. 별도 호스팅(GCP VM, Cloud Run, Render, Railway, Fly.io 등)이 필요합니다.

**Q. CORS 에러가 나요.**
A. Flask 쪽 `ALLOWED_ORIGINS`에 Vercel 도메인이 들어있는지 확인. 그리고 `*.vercel.app`의 Preview URL도 매번 바뀌니, 실제로는 production 도메인(`your-app.vercel.app`)만 등록하고 Preview에서는 직접 테스트하지 않는 게 깔끔합니다.

**Q. 이미지 처리 요청이 timeout 되요.**
A. Vercel은 프론트만 호스팅하니 Vercel 쪽 timeout은 무관. Flask 서버 쪽 gunicorn `--timeout 120` 그리고 GCP VM의 부하/메모리를 확인하세요.

## 시연 시나리오 (간단)

1. Firebase 프로젝트 생성, 서비스 키 발급
2. 로컬에서 `cd server && pip install -r requirements.txt`
3. 환경 변수 설정 후 `python app.py` (포트 8080)
4. 다른 터미널에서 `npm run dev`
5. http://localhost:3000/protect 접속
6. 이미지 업로드 + 고객명/비밀번호 입력 + "이미지 보호 적용"
7. 결과 카드에서 다운로드 가능 + Firebase Console에서 Firestore/Storage 확인

## 다음 단계 (TODO)

- [ ] AI 적대적 노이즈 모듈 추가 (팀원 작업, 현재 "곧 출시")
- [ ] `/scan` 페이지를 실제 백엔드와 연결 (URL 스캔)
- [ ] `/monitor` 페이지를 실제 백엔드와 연결 (Cloud Scheduler)
- [ ] HTTPS + 도메인 (운영 배포 시)
- [ ] 더 강한 인증 (Firebase Auth로 교체 가능)
