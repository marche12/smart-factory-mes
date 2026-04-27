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

# 3. 서버 재시작 — DSM 작업 스케줄러도 죽일 수 없는 완전 분리 패턴
#    핵심: 서브쉘 + setsid + nohup + 모든 FD 분리 + sleep으로 부모와 분리
log "서버 재시작 중..."
pkill -f 'python3 server.py' 2>>"$LOG"
sleep 3

# 이중 fork: ( setsid bash -c "..." & ) & — 부모 PPID가 init(1)이 되어 SIGHUP 영향 없음
# 추가로 sleep 2를 앞에 둬서 cron 스크립트가 먼저 종료되도록 함
(
    setsid bash -c "
        sleep 2
        cd '$APP_DIR'
        exec nohup python3 server.py </dev/null >>'$APP_DIR/server.log' 2>&1
    " </dev/null >/dev/null 2>&1 &
) </dev/null >/dev/null 2>&1 &
disown 2>/dev/null || true
sleep 8  # 서버 부팅 대기 (FastAPI + DB.init 로드 시간 고려)

# 4. 응답 확인 (최대 5회 재시도, 매번 3초 대기)
for i in 1 2 3 4 5; do
    if curl -sS -o /dev/null --max-time 5 "http://127.0.0.1:8080/m"; then
        log "서버 재시작 성공 (시도 $i)"
        log "=== 자동 배포 완료 ==="
        exit 0
    fi
    log "재시도 $i — 응답 없음, 3초 대기"
    sleep 3
done
log "ERR 서버 응답 없음 — 수동 확인 필요"
exit 1

