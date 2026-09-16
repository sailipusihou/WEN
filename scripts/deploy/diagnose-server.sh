#!/bin/bash
# diagnose-server.sh —— 服务器"假死"根因诊断
#
# 什么时候用：站点打不开、SSH 也连不上（只能去阿里云控制台 VNC 进系统）时，
#            在 VNC 里跑这个脚本，把输出发给开发者定位原因。
#
# 用法：bash /root/diagnose-server.sh
#
# 为什么需要它：这类故障的表征是「ping 通、端口能连、但 SSH/HTTP 全超时」——
# 内核活着但用户态没有响应。常见成因有：内存耗尽狂 swap、磁盘 IO 打满、
# 某个进程死循环、better-sqlite3 同步查询把事件循环卡死（进程活着但 service 无响应）。
# 光看现象区分不了，必须看下面这些指标。

echo "======================================================================"
echo " 低焰服务器诊断  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 运行时长与负载（load 远大于核数 = CPU 或 IO 排队严重）"
uptime
echo "CPU 核数: $(nproc)"

echo
echo "### 2. 内存与 swap（swap 用得多 + si/so 高 = 内存不够在狂换页）"
free -m
echo "--- vmstat 采样 5 次（看 si/so 两列，非 0 说明正在换页）---"
vmstat 1 5

echo
echo "### 3. 磁盘空间（满了会导致 nginx/PM2 无法写日志进而无响应）"
df -h
echo "--- inode（满了同样写不进文件）---"
df -i / | head -3

echo
echo "### 4. 磁盘 IO（%util 接近 100 = 磁盘打满；await 高 = 排队严重）"
if command -v iostat >/dev/null 2>&1; then
  iostat -x 1 3 | tail -25
else
  echo "(未装 sysstat，跳过。可 apt install sysstat 后重跑)"
fi

echo
echo "### 5. 占用 CPU 最高的 10 个进程"
ps aux --sort=-%cpu | head -11

echo
echo "### 6. 占用内存最高的 10 个进程"
ps aux --sort=-%mem | head -11

echo
echo "### 7. 处于 D 状态（不可中断 IO 等待）的进程 —— 这是"假死"的关键线索"
ps -eo pid,stat,wchan:32,comm | awk '$2 ~ /D/' | head -20
echo "(以上为空 = 没有进程卡在 IO 上)"

echo
echo "### 8. PM2 状态与最近日志"
if command -v pm2 >/dev/null 2>&1; then
  pm2 list
  echo "--- 最近 40 行应用日志（错误优先）---"
  pm2 logs lowflame --lines 40 --nostream 2>/dev/null | tail -45
  echo "--- PM2 自身的重启次数统计（>100 次说明在崩溃循环）---"
  pm2 jlist 2>/dev/null | head -c 1500
else
  echo "(没有 pm2)"
fi

echo
echo "### 9. 本机 curl 自测（区分"服务本身挂了"和"外部网络问题"）"
curl -s -o /dev/null -w "  localhost:3000   → %{http_code}  time=%{time_total}s\n" -m 15 http://localhost:3000/
curl -s -o /dev/null -w "  localhost:80     → %{http_code}  time=%{time_total}s\n" -m 15 http://localhost/
echo "--- nginx 状态 ---"
systemctl is-active nginx 2>/dev/null || echo "(nginx 未运行)"

echo
echo "### 10. nginx 错误日志最后 25 行"
tail -25 /var/log/nginx/error.log 2>/dev/null || echo "(读不到)"

echo
echo "### 11. 数据库大小与关键表行数（行数暴涨会拖慢同步查询）"
DB=/var/www/lowflame/data/site.db
if [ -f "$DB" ]; then
  ls -lh "$DB"
  if command -v sqlite3 >/dev/null 2>&1; then
    for t in products product_variants product_bundles product_gifts orders web_vitals browsing_history work_logs reviews; do
      n=$(sqlite3 "$DB" "SELECT COUNT(*) FROM $t;" 2>/dev/null)
      echo "  $t: ${n:-（表不存在）}"
    done
    echo "--- 检查缺失索引（product_bundles 没有 productId 索引会全表扫描）---"
    sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('product_bundles','product_variants','product_gifts');" 2>/dev/null
  else
    echo "(未装 sqlite3 CLI，跳过表统计)"
  fi
else
  echo "(找不到数据库 $DB)"
fi

echo
echo "### 12. 系统日志里的 OOM / 磁盘错误线索"
dmesg 2>/dev/null | grep -iE 'out of memory|oom-kill|killed process|I/O error|EXT4-fs error' | tail -15 || echo "(读不到 dmesg)"
journalctl -p err -n 25 --no-pager 2>/dev/null | tail -25 || echo "(读不到 journalctl)"

echo
echo "======================================================================"
echo " 诊断结束。把以上完整输出发给开发者。"
echo " 重点看：第 2 节的 si/so、第 4 节的 %util、第 7 节的 D 状态进程、"
echo "        第 8 节的 PM2 重启次数、第 12 节有没有 OOM。"
echo "======================================================================"
