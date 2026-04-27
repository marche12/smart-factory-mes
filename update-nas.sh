#!/bin/bash
# 팩플로우 NAS 직접 배포 스크립트 (Tailscale)
# 사용법: ./update-nas.sh
#
# 동작:
#  1. Tailscale로 NAS에 SSH 접속
#  2. NAS에서 nas-auto-deploy.sh 실행 → git fetch + 서버 재시작
#  3. 배포 로그 확인
#
# 전제 조건: Mac에 Tailscale 연결됨, ssh 키 인증 설정됨

set -e

NAS_TS_IP="100.74.217.19"
NAS_USER="inno"
NAS_PATH="/volume1/homes/apps/packflow"
DEPLOY_SH="$NAS_PATH/scripts/nas-auto-deploy.sh"

echo "팩플로우 Tailscale 배포 시작..."

# 1. Tailscale 연결 확인
if ! ping -c 1 -W 2000 "$NAS_TS_IP" >/dev/null 2>&1; then
    echo "❌ NAS Tailscale($NAS_TS_IP) 응답 없음"
    echo "   Tailscale 앱 실행 상태 확인 + NAS 측 Tailscale 연결 확인"
    exit 1
fi
echo "✓ Tailscale 연결됨"

# 2. NAS에서 git fetch + 서버 재시작
echo "NAS 자동 배포 스크립트 실행..."
ssh -o BatchMode=yes -o ConnectTimeout=8 "${NAS_USER}@${NAS_TS_IP}" "bash ${DEPLOY_SH}"

# 3. 결과 로그 마지막 8줄
echo ""
echo "=== 최근 배포 로그 ==="
ssh -o BatchMode=yes -o ConnectTimeout=5 "${NAS_USER}@${NAS_TS_IP}" "tail -8 ${NAS_PATH}/auto-deploy.log"

# 4. 외부 응답 검증
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
