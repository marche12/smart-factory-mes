#!/bin/bash
# 팩플로우 NAS 자동 업데이트 스크립트
# 사용법: ./update-nas.sh

set -e

NAS_IP="192.168.0.2"
NAS_USER="inno"
NAS_PATH="/volume1/homes/apps/packflow"
NAS_MOUNT="/Volumes/homes/apps/packflow"
LOCAL_PATH="/Users/shoon/Documents/팩플로우"

echo "🔄 팩플로우 NAS 업데이트 시작..."
echo ""

# 1. NAS 마운트 확인
if [ ! -d "$NAS_MOUNT" ]; then
    echo "❌ NAS가 마운트되어 있지 않습니다."
    echo "   Finder → 이동 → 서버에 연결 (Cmd+K) → smb://192.168.0.2"
    exit 1
fi

# 2. 파일 동기화 (데이터/DB 제외)
echo "📦 파일 동기화 중..."
rsync -av --delete \
    --exclude='data/' \
    --exclude='venv/' \
    --exclude='.git/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='.DS_Store' \
    --exclude='얼마에요2E/' \
    --exclude='migrate/exported/' \
    --exclude='cloudflared' \
    --exclude='ngrok' \
    --exclude='*.zip' \
    --exclude='*.bak' \
    --exclude='*.log' \
    --exclude='server.log' \
    --exclude='startup.log' \
    --exclude='update-nas.sh' \
    --exclude='.claude' \
    "$LOCAL_PATH/" "$NAS_MOUNT/" | tail -20

echo ""
echo "🔄 NAS 서버 재시작 중..."

# 3. NAS 서버 재시작 (expect로 비밀번호 자동 입력)
expect <<EXPEOF
set timeout 30
spawn ssh -o StrictHostKeyChecking=no $NAS_USER@$NAS_IP "pkill -f 'python3 server.py' 2>/dev/null; sleep 2; cd $NAS_PATH && nohup python3 server.py > server.log 2>&1 & disown && sleep 3 && ps aux | grep 'python3 server.py' | grep -v grep | head -1"
expect "assword:"
send "Wjdtmdgns12#\r"
expect eof
EXPEOF

echo ""
echo "✅ 업데이트 완료!"
echo "🌐 접속: http://inno.local:8080"
