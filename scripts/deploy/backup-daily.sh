#!/bin/bash
# backup-daily.sh —— 每天把 data/ 与 uploads/ 打包留档（服务器本地轮转）
#
# 为什么要它：
#   订单、客户、商品、用户上传的图片/语音**都不在 git 里**，只存在于服务器的
#   data/ 与 public/uploads/。服务器一挂（磁盘故障 / 误删 / 被入侵删库 /
#   实例到期释放）就全没了。2026-09-28 重装时能恢复，是因为**手动**在重装前
#   拉了一份 —— 那是运气，不是机制。
#
# ⚠️ 这是**服务器本地**备份，防的是「误删/误改/删库」，**防不了磁盘整块坏掉**。
#    要防后者，需要定期把这个目录拉回本地电脑（见 scripts/deploy/backup-pull.cjs）。
#
# 安装（服务器上）：
#   cp backup-daily.sh /usr/local/bin/lowflame-backup-daily.sh
#   chmod +x /usr/local/bin/lowflame-backup-daily.sh
#   (crontab -l 2>/dev/null; echo '40 3 * * * /usr/local/bin/lowflame-backup-daily.sh >> /var/log/lowflame-backup.log 2>&1') | crontab -
#
# 查看：tail -30 /var/log/lowflame-backup.log
# 产物：/root/backups/daily/{data,uploads}-<YYYYMMDD>.tar.gz（各保留最近 7 份）

set +e
DEST=/root/backups/daily
KEEP=7
STAMP=$(date +%Y%m%d)
LOG_TAG="[backup $(date '+%F %T')]"

mkdir -p "$DEST"

echo "$LOG_TAG  开始备份"

# ── 1. data/（含 site.db + -wal + -shm，三者必须一起备份，否则恢复会少表）──
if [ -d /var/www/lowflame/data ]; then
  tar czf "$DEST/data-$STAMP.tar.gz" -C /var/www/lowflame data 2>/dev/null
  SZ=$(stat -c %s "$DEST/data-$STAMP.tar.gz" 2>/dev/null || echo 0)
  if [ "$SZ" -gt 1000 ] && tar tzf "$DEST/data-$STAMP.tar.gz" >/dev/null 2>&1; then
    echo "$LOG_TAG  ✅ data: $((SZ/1024)) KB"
  else
    echo "$LOG_TAG  ❌ data 备份异常（$SZ 字节或不可读），保留上一份"
    rm -f "$DEST/data-$STAMP.tar.gz"
  fi
else
  echo "$LOG_TAG  ⚠️ /var/www/lowflame/data 不存在，跳过"
fi

# ── 2. uploads/（用户上传的图片/语音）──────────────────────────
if [ -d /var/www/lowflame/public/uploads ]; then
  tar czf "$DEST/uploads-$STAMP.tar.gz" -C /var/www/lowflame/public uploads 2>/dev/null
  SZ=$(stat -c %s "$DEST/uploads-$STAMP.tar.gz" 2>/dev/null || echo 0)
  if [ "$SZ" -gt 1000 ] && tar tzf "$DEST/uploads-$STAMP.tar.gz" >/dev/null 2>&1; then
    echo "$LOG_TAG  ✅ uploads: $((SZ/1024)) KB"
  else
    echo "$LOG_TAG  ❌ uploads 备份异常，保留上一份"
    rm -f "$DEST/uploads-$STAMP.tar.gz"
  fi
else
  echo "$LOG_TAG  ⚠️ public/uploads 不存在，跳过"
fi

# ── 3. 轮转：每类只保留最近 KEEP 份 ────────────────────────────
for kind in data uploads; do
  ls -1t "$DEST/$kind"-*.tar.gz 2>/dev/null | tail -n +$((KEEP+1)) | while read -r f; do
    rm -f "$f"; echo "$LOG_TAG    轮转删除: $(basename "$f")"
  done
done

# ── 4. 汇总 ───────────────────────────────────────────────────
CNT=$(ls -1 "$DEST"/*.tar.gz 2>/dev/null | wc -l)
TOT=$(du -sh "$DEST" 2>/dev/null | cut -f1)
FREE=$(df -h / | awk 'NR==2{print $4}')
echo "$LOG_TAG  现有备份 $CNT 份（$TOT），磁盘剩余 $FREE"
echo "$LOG_TAG  完成"
