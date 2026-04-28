#!/bin/bash
# 팩플로우 자동 백업 스크립트
#
# === DSM 작업 스케줄러 등록 (1회) ===
#   1) DSM → 제어판 → 작업 스케줄러 → 생성 → 예약된 작업 → 사용자 정의 스크립트
#   2) 일반 탭   : 작업명 'packflow-auto-backup', 사용자 'inno' (또는 root), 활성화 ✅
#   3) 스케줄 탭 : 매일 / 첫 번째 실행 시간 03:00 / 빈도 매일
#   4) 작업 설정 : 사용자 정의 스크립트 박스에 ↓
#        bash /volume1/homes/apps/packflow/nas-auto-backup.sh
#   5) 알림 설정(선택) : '출력에 ERR 포함 시 메일 보내기' 권장
#
# 등록 검증:
#   ssh inno@100.74.217.19 'ls -lt /volume1/homes/apps/packflow-backups/ | head -5'
#   ssh inno@100.74.217.19 'tail -10 /volume1/homes/apps/packflow-backups/backup.log'
#
# 정책:
#   - 보관 30일 (RETENTION_DAYS) — 그 이후 자동 삭제
#   - 대상 data/mes.db + data/backup/ 디렉토리만 압축
#   - 위치 /volume1/homes/apps/packflow-backups/
#   - 외부 보관 권장 : Hyper Backup 으로 packflow-backups/ 폴더 추가 백업
#
# 자세한 절차/롤백: docs/deploy-runbook.md §5

SRC_DIR="/volume1/homes/apps/packflow"
BACKUP_DIR="/volume1/homes/apps/packflow-backups"
DATE=$(date +%Y%m%d-%H%M)
RETENTION_DAYS=30

# 백업 폴더 생성
mkdir -p "$BACKUP_DIR"

# DB + 설정 압축 백업
BACKUP_FILE="$BACKUP_DIR/packflow-$DATE.tar.gz"

tar -czf "$BACKUP_FILE" \
    -C "$SRC_DIR" \
    data/mes.db \
    data/backup 2>/dev/null

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 백업 성공: $BACKUP_FILE ($SIZE)" >> "$BACKUP_DIR/backup.log"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERR 백업 실패" >> "$BACKUP_DIR/backup.log"
    exit 1
fi

# 오래된 백업 삭제 (30일 이상)
find "$BACKUP_DIR" -name "packflow-*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 로그 크기 제한 (1000줄)
if [ -f "$BACKUP_DIR/backup.log" ]; then
    tail -1000 "$BACKUP_DIR/backup.log" > "$BACKUP_DIR/backup.log.tmp"
    mv "$BACKUP_DIR/backup.log.tmp" "$BACKUP_DIR/backup.log"
fi

echo "백업 완료: $BACKUP_FILE"
