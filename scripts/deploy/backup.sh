#!/bin/bash
# ============================================================
# Low Flame 数据备份脚本
# 备份内容：data/（SQLite + JSON）与 public/uploads/（上传文件）
# 建议加到 crontab：每天凌晨 3 点执行
#   0 3 * * * /var/www/lowflame/scripts/deploy/backup.sh
# ============================================================
set -e

APP_DIR="/var/www/lowflame"
BACKUP_DIR="/var/backups/lowflame"
KEEP_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

echo "==> 备份 data/ 与 public/uploads/ ..."

# SQLite 使用安全备份（避免写入过程中复制导致损坏）
if command -v sqlite3 &> /dev/null && [ -f data/site.db ]; then
  sqlite3 data/site.db ".backup '$BACKUP_DIR/site_$DATE.db'"
  echo "    SQLite 已安全备份"
  tar czf "$BACKUP_DIR/lowflame_$DATE.tar.gz" --exclude='data/site.db' data/ public/uploads/
else
  tar czf "$BACKUP_DIR/lowflame_$DATE.tar.gz" data/ public/uploads/
fi

# 清理过期备份
find "$BACKUP_DIR" -name "lowflame_*.tar.gz" -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name "site_*.db" -mtime +$KEEP_DAYS -delete

SIZE=$(du -h "$BACKUP_DIR/lowflame_$DATE.tar.gz" | cut -f1)
echo "==> 备份完成: $BACKUP_DIR/lowflame_$DATE.tar.gz ($SIZE)"
echo "    保留最近 $KEEP_DAYS 天"
