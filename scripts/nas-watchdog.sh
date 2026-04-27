#!/bin/bash
# NAS 서버 워치독 — 5분마다 헬스체크, 다운되면 자동 재시작
# DSM 작업 스케줄러 등록: 5분마다 반복
#   bash /volume1/homes/apps/packflow/scripts/nas-watchdog.sh

APP_DIR="/volume1/homes/apps/packflow"
LOG="$APP_DIR/watchdog.log"

log(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

# 헬스체크
if curl -sS -o /dev/null --max-time 3 "http://127.0.0.1:8080/m"; then
    # 정상 — 로그 안 남김 (5분마다 찍히면 noise)
    exit 0
fi

# 다운 — 재시작
log "서버 다운 감지 — 재시작 시도"

# 죽은 프로세스 정리
pkill -f 'python3 server.py' 2>>"$LOG"
sleep 2

# 완전 분리 더블 포크
(
    setsid bash -c "
        sleep 2
        cd '$APP_DIR'
        exec nohup python3 server.py </dev/null >>'$APP_DIR/server.log' 2>&1
    " </dev/null >/dev/null 2>&1 &
) </dev/null >/dev/null 2>&1 &
disown 2>/dev/null || true

sleep 8

# 검증
if curl -sS -o /dev/null --max-time 5 "http://127.0.0.1:8080/m"; then
    log "재시작 성공"
else
    log "ERR 재시작 실패 — 수동 확인 필요"
fi
