#!/bin/bash
# check-shell-persistence.sh —— 查 .bashrc / .profile 里的可疑内容 + 确认站点恢复
#
# 为什么查：攻击者常在 shell 启动脚本里做持久化 —— 每次有人登录就重新下载安装木马。
#          grep 匹配到了关键词，必须看清是哪一行、是不是真的恶意。

set +e

echo "======================================================================"
echo " shell 启动脚本排查 + 站点确认  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. /root/.bashrc 里匹配到关键词的行（含行号）"
grep -nE 'libproc|/var/tmp/\.c|cache_|xmrig|wget|curl.*sh|base64|/dev/shm|nohup' /root/.bashrc 2>/dev/null | sed 's/^/  /' || echo "  (无匹配)"

echo
echo "### 2. /root/.bashrc 的文件时间与大小"
stat /root/.bashrc 2>/dev/null | grep -E 'Modify|Change|Birth|Size' | sed 's/^/  /'
echo "  行数: $(wc -l < /root/.bashrc)"
echo "  md5: $(md5sum /root/.bashrc | cut -d' ' -f1)"

echo
echo "### 3. /root/.bashrc 的最后 20 行（攻击者通常追加在末尾）"
tail -20 /root/.bashrc | cat -A | sed 's/\$$//' | sed 's/^/  /' | head -25

echo
echo "### 4. /root/.profile 里匹配到关键词的行"
grep -nE 'libproc|/var/tmp/\.c|cache_|xmrig|wget|curl.*sh|base64|/dev/shm|nohup' /root/.profile 2>/dev/null | sed 's/^/  /' || echo "  (无匹配)"
echo "--- /root/.profile 完整内容 ---"
cat -A /root/.profile 2>/dev/null | sed 's/\$$//' | sed 's/^/  /'

echo
echo "### 5. 其它 shell 启动脚本"
for f in /etc/bash.bashrc /etc/profile /root/.bash_profile /root/.bash_login; do
  if [ -f "$f" ]; then
    m=$(grep -nE 'libproc|/var/tmp/\.c|cache_|xmrig|wget.*\|.*sh|base64 -d' "$f" 2>/dev/null)
    if [ -n "$m" ]; then echo "  ⚠️ $f:"; echo "$m" | sed 's/^/      /'; else echo "  ✅ $f 干净"; fi
  fi
done
echo "--- /etc/profile.d/ 下所有文件 ---"
for f in /etc/profile.d/*; do
  [ -f "$f" ] || continue
  m=$(grep -nE 'libproc|/var/tmp/\.c|cache_|xmrig|wget.*\|.*sh' "$f" 2>/dev/null)
  if [ -n "$m" ]; then echo "  ⚠️ $f:"; echo "$m" | sed 's/^/      /'; else echo "  ✅ $(basename "$f") 干净"; fi
done

echo
echo "### 6. 所有用户的 shell 启动脚本总览"
for h in /root /home/*; do
  [ -d "$h" ] || continue
  for f in "$h"/.bashrc "$h"/.profile "$h"/.bash_profile "$h"/.bash_login "$h"/.zshrc; do
    [ -f "$f" ] || continue
    m=$(grep -cE 'libproc|/var/tmp/\.c|cache_|xmrig' "$f" 2>/dev/null)
    echo "  $f : 可疑匹配 $m 处"
  done
done

echo
echo "### 7. 站点恢复确认"
echo "--- PM2 状态 ---"
pm2 list 2>/dev/null | head -8 | sed 's/^/  /'
echo "--- 等待应用就绪 ---"
for i in 1 2 3 4 5 6 7 8 9 10; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 8 http://localhost:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then echo "  ✅ 第 ${i} 次尝试: HTTP 200"; break; fi
  echo "  第 ${i} 次: HTTP $code，等 5 秒…"
  sleep 5
done
echo "--- 各页面 ---"
for p in / /products /cart /checkout /admin/login /api/paypal/config; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://localhost:3000$p")
  printf "    %-22s HTTP %s\n" "$p" "$code"
done

echo
echo "### 8. 通过 nginx 再确认一次"
for p in / /products /checkout; do
  code=$(curl -s -k -o /dev/null -w '%{http_code}' -m 10 "https://localhost$p")
  printf "    https%-18s HTTP %s\n" "$p" "$code"
done

echo
echo "### 9. 安全组件状态"
for s in nginx fail2ban ufw unattended-upgrades; do
  printf "  %-22s %s\n" "$s" "$(systemctl is-active $s 2>/dev/null)"
done

echo
echo "======================================================================"
