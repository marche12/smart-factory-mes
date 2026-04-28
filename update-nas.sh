#!/bin/bash
# 팩플로우 NAS 직접 배포 스크립트 (Tailscale)
# 사용법:
#   ./update-nas.sh              # 즉시 배포
#   ./update-nas.sh --dry-run    # 사전 점검만 (서버 영향 없음)
#   ./update-nas.sh --check      # --dry-run 별칭
#
# 동작 (배포 모드):
#  1. Tailscale로 NAS에 SSH 접속
#  2. NAS에서 nas-auto-deploy.sh 실행 → git fetch + 서버 재시작
#  3. 배포 로그 확인
#
# 동작 (--dry-run 모드):
#  1. Tailscale + SSH 키 인증 확인
#  2. NAS git status / origin 차이 / 디스크 / 서버 상태 / 백업 점검
#  3. 결과 요약만 출력 (서버/DB 절대 변경 안 함)
#
# 전제 조건: Mac에 Tailscale 연결됨, ssh 키 인증 설정됨
# 자세한 절차: docs/deploy-runbook.md

set -e

NAS_TS_IP="100.74.217.19"
NAS_USER="inno"
NAS_PATH="/volume1/homes/apps/packflow"
DEPLOY_SH="$NAS_PATH/scripts/nas-auto-deploy.sh"

MODE="deploy"
case "${1:-}" in
    --dry-run|--check)
        MODE="dryrun"
        ;;
    -h|--help)
        sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
        exit 0
        ;;
esac

# 1. Tailscale 연결 확인
if ! ping -c 1 -W 2000 "$NAS_TS_IP" >/dev/null 2>&1; then
    echo "❌ NAS Tailscale($NAS_TS_IP) 응답 없음"
    echo "   Tailscale 앱 실행 상태 확인 + NAS 측 Tailscale 연결 확인"
    exit 1
fi
echo "✓ Tailscale 연결됨"

# 2. SSH 키 인증 확인
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${NAS_USER}@${NAS_TS_IP}" 'echo ok' >/dev/null 2>&1; then
    echo "❌ SSH 키 인증 실패"
    echo "   ssh-copy-id ${NAS_USER}@${NAS_TS_IP} 로 키 등록 후 재시도"
    exit 1
fi
echo "✓ SSH 키 인증 OK"

if [ "$MODE" = "dryrun" ]; then
    echo ""
    echo "=== Dry-run 점검 (서버 영향 없음) ==="
    ssh -o BatchMode=yes -o ConnectTimeout=8 "${NAS_USER}@${NAS_TS_IP}" "
        cd '$NAS_PATH' || exit 1
        echo '--- (a) 작업 트리 상태 ---'
        git status --short
        echo '--- (b) origin/main 차이 ---'
        git fetch origin main >/dev/null 2>&1
        AHEAD=\$(git log --oneline HEAD..origin/main | wc -l | tr -d ' ')
        echo \"적용 예정 커밋 수: \$AHEAD\"
        git log --oneline HEAD..origin/main | head -10
        echo '--- (c) 디스크 ---'
        df -h /volume1 | tail -1
        echo '--- (d) 서버 프로세스 + 응답 ---'
        pgrep -af 'python3 server.py' || echo '서버 프로세스 없음'
        curl -sS -o /dev/null -w '127.0.0.1:8080/m → code=%{http_code} time=%{time_total}s\n' --max-time 5 http://127.0.0.1:8080/m || true
        echo '--- (e) 최근 백업 ---'
        ls -lt data/mes.db.bak* 2>/dev/null | head -3 || echo '(mes.db.bak* 없음)'
        ls -lt /volume1/homes/apps/packflow-backups/ 2>/dev/null | head -3 || echo '(packflow-backups 없음)'
        echo '--- (f) 자동 배포 최근 로그 ---'
        tail -5 auto-deploy.log 2>/dev/null || echo '(로그 없음)'
    "
    echo ""
    echo "✅ Dry-run 완료 — 실제 배포는 옵션 없이 ./update-nas.sh"
    exit 0
fi

# 3. NAS에서 git fetch + 서버 재시작
echo "NAS 자동 배포 스크립트 실행..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "${NAS_USER}@${NAS_TS_IP}" "bash ${DEPLOY_SH}"

# 4. 결과 로그 마지막 8줄
echo ""
echo "=== 최근 배포 로그 ==="
ssh -o BatchMode=yes -o ConnectTimeout=5 "${NAS_USER}@${NAS_TS_IP}" "tail -8 ${NAS_PATH}/auto-deploy.log"

# 5. 외부 응답 검증
echo ""
echo "=== 응답 확인 ==="
echo -n "Tailscale 직접: "
curl -sS -o /dev/null -w "code:%{http_code} time:%{time_total}s\n" --max-time 5 "http://${NAS_TS_IP}:8080/m" || true
echo -n "외부 HTTPS    : "
curl -sS -k -o /dev/null -w "code:%{http_code} time:%{time_total}s\n" --max-time 8 "https://packflow.mckim.i234.me/m" || true

echo ""
echo "✅ 배포 완료!"
echo "   Tailscale: http://${NAS_TS_IP}:8080"
echo "   외부     : https://packflow.mckim.i234.me"
echo "   문제 발생 시 docs/deploy-runbook.md 의 §4 롤백 절차"
