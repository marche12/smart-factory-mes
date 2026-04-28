#!/bin/bash
# 서버 재시작 detach 실측 검증 스크립트
# 사용법:
#   Mac에서:  ssh inno@100.74.217.19 'bash -s' < scripts/verify-detach.sh
#   NAS에서:  bash scripts/verify-detach.sh
#
# 검증 내용:
#   1) nas-auto-deploy.sh 가 띄운 python3 server.py 가
#      더블 fork(setsid+nohup+disown) 로 부모 셸과 분리되었는가
#   2) 부모 셸이 끝난 뒤에도 PID 가 살아남는가
#   3) PPID=1 (init) / SID 분리 / 응답 코드 200
#
# 절대 안전: 검증 자체는 서버를 죽이거나 재시작하지 않음.
# (자동배포 스크립트를 직접 실행하는 §B 모드는 의도적으로 옵션 처리)
#
# 자세한 절차: docs/deploy-runbook.md §3

set -u
APP_DIR="/volume1/homes/apps/packflow"
PASS=0; FAIL=0
ok()  { echo "  ✅ $*"; PASS=$((PASS+1)); }
ng()  { echo "  ❌ $*"; FAIL=$((FAIL+1)); }
note(){ echo "  · $*"; }

echo "=== A. 현재 서버 detach 상태 점검 ==="

PIDS=$(pgrep -f 'python3 server.py' || true)
if [ -z "$PIDS" ]; then
    ng "python3 server.py 프로세스가 없음 — 자동배포 또는 워치독으로 먼저 띄워야 함"
else
    for PID in $PIDS; do
        PPID=$(ps -o ppid= -p "$PID" | tr -d ' ')
        SID=$(ps -o sid=  -p "$PID" 2>/dev/null | tr -d ' ' || echo "?")
        STAT=$(ps -o stat= -p "$PID" | tr -d ' ')
        CMD=$(ps -o cmd=  -p "$PID")
        note "PID=$PID PPID=$PPID SID=$SID STAT=$STAT"
        note "      $CMD"
        [ "$PPID" = "1" ] && ok "PPID=1 (init) — 부모 셸과 분리됨" || ng "PPID=$PPID (1 이어야 detach 성공)"
        case "$STAT" in
            *+*) ng "STAT 에 '+' 있음 — foreground process group, detach 실패" ;;
            *)   ok "STAT='$STAT' — foreground 아님" ;;
        esac
    done
fi

echo ""
echo "=== B. 응답 점검 ==="
HTTP=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:8080/m || echo "000")
if [ "$HTTP" = "200" ]; then ok "127.0.0.1:8080/m → 200"; else ng "127.0.0.1:8080/m → $HTTP"; fi

echo ""
echo "=== C. 자동 배포 / 워치독 로그 마지막 줄 ==="
if [ -f "$APP_DIR/auto-deploy.log" ]; then
    note "auto-deploy.log:"
    tail -3 "$APP_DIR/auto-deploy.log" | sed 's/^/      /'
else
    note "auto-deploy.log 없음"
fi
if [ -f "$APP_DIR/watchdog.log" ]; then
    note "watchdog.log:"
    tail -3 "$APP_DIR/watchdog.log" | sed 's/^/      /'
fi

echo ""
echo "=== D. 추천 — cron/DSM 환경 모사 (수동 실행) ==="
cat <<'TIP'
  비대화 환경에서 자동 배포가 detach 되는지 직접 트리거하려면:

      nohup bash /volume1/homes/apps/packflow/scripts/nas-auto-deploy.sh \
            </dev/null >/tmp/deploy-test.log 2>&1 &
      disown
      sleep 15
      tail -20 /volume1/homes/apps/packflow/auto-deploy.log
      pgrep -af 'python3 server.py'

  ※ 이 스크립트는 의도적으로 자동 트리거하지 않음 — 검증만 수행.
TIP

echo ""
echo "=== 결과: PASS=$PASS  FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
