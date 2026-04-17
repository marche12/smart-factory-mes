#!/bin/bash
# 팩플로우 자동 백업 스크립트
# DSM 작업 스케줄러에 등록: 매일 새벽 3시
#   bash /volume1/homes/apps/packflow/nas-auto-backup.sh

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
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 백업 실패" >> "$BACKUP_DIR/backup.log"
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
