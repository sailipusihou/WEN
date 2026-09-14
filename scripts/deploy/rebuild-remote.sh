#!/bin/bash
# ============================================================
# 服务器端重新构建（放在 /root，不进仓库，避免 pull 冲突）
#
# 为什么长这样：这台机器 2GB 内存，next build 会飙到 1GB+ 堆，
# 已经两次把机器压到 swap 死锁（内核还活着、sshd 和 node 全 fork 不出来）。
# 对策三条：
#   1. 先把 swap 扩到 6GB（构建时允许慢，但不能死）
#   2. 把构建堆上限压到 768MB（宁可多 GC，不要打爆物理内存）
#   3. 关掉构建期的 lint / 类型检查（本地已经跑过 npx tsc --noEmit 和 npm run build）
#
# 用法：nohup bash /root/rebuild.sh > /dev/null 2>&1 &
# 看结果：tail -f /tmp/build.log
# ============================================================
cd /var/www/lowflame || exit 1
LOG=/tmp/build.log

echo "=== 构建开始 $(date) ===" >> "$LOG"

# ---------- 1. 确保 swap 足够 ----------
SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
echo "当前 swap: ${SWAP_TOTAL}MB" >> "$LOG"
if [ "$SWAP_TOTAL" -lt 5000 ]; then
  DISK_FREE=$(df -m / | awk 'NR==2 {print $4}')
  echo "根分区可用磁盘: ${DISK_FREE}MB" >> "$LOG"
  if [ "$DISK_FREE" -gt 5000 ] && [ ! -f /swapfile2 ]; then
    echo "→ 追加 4GB swap" >> "$LOG"
    fallocate -l 4G /swapfile2 >> "$LOG" 2>&1 \
      || dd if=/dev/zero of=/swapfile2 bs=1M count=4096 >> "$LOG" 2>&1
    chmod 600 /swapfile2
    mkswap /swapfile2 >> "$LOG" 2>&1
    swapon /swapfile2 >> "$LOG" 2>&1
  elif [ -f /swapfile2 ]; then
    swapon /swapfile2 >> "$LOG" 2>&1 || true
  else
    echo "→ 磁盘不足，跳过扩 swap" >> "$LOG"
  fi
  free -m >> "$LOG"
fi

# ---------- 2. 停服务、清缓存 ----------
echo "=== 停止服务（避免构建时争内存） ===" >> "$LOG"
pm2 stop lowflame >> "$LOG" 2>&1
sync
echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
free -m >> "$LOG"

# ---------- 3. 构建 ----------
echo "=== 开始构建 $(date) ===" >> "$LOG"
# ⚠️ 关键：nice + ionice 让构建进程在 CPU 与磁盘 I/O 上都让路。
# 这台机器只有 2GB 内存，构建时的 swap 换页会把磁盘 I/O 打满，
# sshd / nginx 抢不到资源 → 机器假死，只能去控制台重启（已发生三次）。
# ionice -c3 是 idle 级别：只有别人不用磁盘时才轮到构建用。
# 代价是构建变慢，但慢总比死好。
NODE_OPTIONS="--max-old-space-size=768" \
NEXT_TELEMETRY_DISABLED=1 \
NEXT_DISABLE_ESLINT=1 \
nice -n 19 ionice -c3 npm run build >> "$LOG" 2>&1
BUILD_EXIT=$?
echo "===BUILD_EXIT=${BUILD_EXIT}===" >> "$LOG"
free -m >> "$LOG"

# ---------- 4. 起服务 ----------
echo "=== 启动服务 $(date) ===" >> "$LOG"
# 构建失败时不要用残缺产物起服务（会 crash-loop）
if [ "$BUILD_EXIT" -eq 0 ] && [ -f .next/BUILD_ID ]; then
  pm2 start lowflame >> "$LOG" 2>&1
else
  echo "!! 构建未成功或缺少 .next/BUILD_ID，已保持服务停止，请人工处理" >> "$LOG"
fi

sleep 10
curl -s -o /dev/null -w "local=%{http_code}\n" -m 25 http://localhost:3000/ >> "$LOG" 2>&1
echo "===DONE===" >> "$LOG"
