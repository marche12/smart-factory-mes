#!/bin/bash
# NAS 자동 배포 스크립트 — 매일 00:00 cron 실행
# 동작:
#  1. GitHub origin/main fetch
#  2. static/, scripts/, requirements.txt 만 덮어쓰기 (server.py/database.py는 NAS 로컬 유지)
#  3. 변경 있으면 서버 재시작
#  4. 로그 기록 (auto-deploy.log)
#
# 등록: crontab -e
#   0 0 * * * /volume1/homes/apps/packflow/scripts/nas-auto-deploy.sh

set -u
APP_DIR="/volume1/homes/apps/packflow"
LOG="$APP_DIR/auto-deploy.log"
LOCK="/tmp/nas-auto-deploy.lock"

log(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

# 동시 실행 방지
if [ -e "$LOCK" ]; then
    log "이미 실행 중 (lock 존재) — 스킵"
    exit 0
fi
trap 'rm -f "$LOCK"' EXIT
touch "$LOCK"

cd "$APP_DIR" || { log "ERR cd 실패"; exit 1; }

log "=== 자동 배포 시작 ==="

# 1. fetch
git fetch origin main 2>>"$LOG"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "변경 없음 (HEAD=$LOCAL)"
    exit 0
fi

log "업데이트: $LOCAL -> $REMOTE"

# 2. static/, scripts/, requirements.txt 만 GitHub에서 가져오기 (server.py/database.py 보존)
git checkout origin/main -- static/ 2>>"$LOG" && log "static/ 업데이트 완료"
git checkout origin/main -- scripts/ 2>>"$LOG" && log "scripts/ 업데이트 완료"
git checkout origin/main -- requirements.txt 2>>"$LOG" 2>/dev/null && log "requirements.txt 업데이트 완료" || true

# 3. 서버 재시작
log "서버 재시작 중..."
pkill -f 'python3 server.py' 2>>"$LOG"
sleep 3
(setsid python3 "$APP_DIR/server.py" </dev/null >>"$APP_DIR/server.log" 2>&1 &)
sleep 4

# 4. 응답 확인
if curl -sS -o /dev/null --max-time 5 "http://127.0.0.1:8080/m"; then
    log "서버 재시작 성공"
else
    log "ERR 서버 응답 없음 — 수동 확인 필요"
    exit 1
fi

log "=== 자동 배포 완료 ==="
exit 0
