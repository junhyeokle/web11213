#!/usr/bin/env bash
# GitHub 리포지토리(https://github.com/junhyeokle/web11213.git)에 한 번에 푸시
#
# 실행:
#   chmod +x push-to-github.sh
#   ./push-to-github.sh
#
# 인증: 처음 한 번 GitHub Personal Access Token 입력하면
#       macOS Keychain(osxkeychain credential helper)이 저장합니다.

set -e

cd "$(dirname "$0")"

# 0) Claude 샌드박스가 만들다 만 .git 흔적이 있으면 깨끗이 정리
if [ -d ".git" ]; then
  echo "⚠️  기존 .git 폴더 제거 (Claude 샌드박스 잔해)"
  rm -rf .git
fi

# 1) 초기화 + 사용자 정보
git init -b main
git config user.email "somenightstomorrow@gmail.com"
git config user.name  "junhyeokle"

# 2) 원격 등록
git remote add origin https://github.com/junhyeokle/web11213.git

# 3) 스테이지 + 커밋
git add -A
git commit -m "Initial commit: Next.js + Flask, Vercel + GCP 분리 배포 구조"

# 4) 푸시 (강제 — 첫 푸시이고 원격이 비어있다고 가정)
#    원격에 이미 뭐가 있으면 -f 빼고 git pull --rebase 하세요.
git push -u origin main

echo
echo "✅ 푸시 완료"
echo "→ https://github.com/junhyeokle/web11213"
