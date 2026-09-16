#!/bin/bash
# watchdog.sh —— 站点守护：站点无响应时自动重启应用，避免每次都要去控制台重启机器
#
# 为什么需要它：
#   这台机器已经因为"假死"被迫重启多次。大多数情况下**应用本身先出问题**
#   （better-sqlite3 同步查询卡住事件循环 / 内存涨满），这时机器还活着、
#   cron 还能跑 —— 只要自检发现站点不通就 pm2 restart，就能自动恢复，
#   不需要人工去阿里云控制台。
#
# 安装（服务器上）：
#   cp /root/watchdog.sh /usr/local/bin/lowflame-watchdog.sh
#   chmod +x /usr/local/bin/lowflame-watchdog.sh
#   # 每分钟检查一次
#   (crontab -l 2>/dev/null; echo "* * * * * /usr/local/bin/lowflame-watchdog.sh >> /var/log/lowflame-watchdog.log 2>&1") | crontab -
#
# 查看日志：tail -f /var/log/lowflame-watchdog.log

LOG_TAG="[watchdog $(date '+%F %T')]"
STATE_FILE="/tmp/lowflame-watchdog-fails"
URL="http://localhost:3000/"
TIMEOUT=12

# 连续失败次数（避免偶发抖动就重启）
FAILS=$(cat "$STATE_FILE" 2>/dev/null || echo 0)

# 自检：能拿到任何 HTTP 状态码（含 5xx）都说明服务活着；拿不到才是真挂
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m "$TIMEOUT" "$URL" 2>/dev/null)

if [ -n "$CODE" ] && [ "$CODE" != "000" ]; then
  if [ "$FAILS" != "0" ]; then
    echo "$LOG_TAG 恢复正常（HTTP $CODE），重置失败计数"
  fi
  echo 0 > "$STATE_FILE"
  exit 0
fi

FAILS=$((FAILS + 1))
echo "$FAILS" > "$STATE_FILE"
echo "$LOG_TAG 站点无响应（连续第 $FAILS 次，curl 返回 '$CODE'）"

# 连续 2 分钟不通才动手，避免误判
if [ "$FAILS" -lt 2 ]; then
  exit 0
fi

echo "$LOG_TAG → 尝试重启应用"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart lowflame 2>&1 | tail -3
else
  echo "$LOG_TAG pm2 不可用，尝试重启 nginx"
  systemctl restart nginx 2>&1 | tail -3
fi

# 给应用 25 秒起来
sleep 25
CODE2=$(curl -s -o /dev/null -w '%{http_code}' -m "$TIMEOUT" "$URL" 2>/dev/null)
echo "$LOG_TAG 重启后自检: HTTP $CODE2"

if [ -n "$CODE2" ] && [ "$CODE2" != "000" ]; then
  echo "$LOG_TAG ✅ 自动恢复成功"
  echo 0 > "$STATE_FILE"
else
  echo "$LOG_TAG ❌ 重启后仍不通。可能整机资源耗尽，需要去阿里云控制台重启实例。"
  echo "$LOG_TAG    建议同时跑: bash /root/diagnose-server.sh"
  # 留一份现场，方便事后定位
  echo "$LOG_TAG --- free ---" ; free -m
  echo "$LOG_TAG --- 占用内存最高的进程 ---" ; ps aux --sort=-%mem | head -6
fi
