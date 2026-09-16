#!/bin/bash
# finalize-step46.sh —— 收尾：删除含病毒的取证副本 + 取扫描结果
#
# 为什么删取证副本：/root/forensics-*.tar.gz 里打包了 xmrig 矿机本体。
# 留着活体病毒样本在服务器上是风险（可能被别的东西触发执行）。
# 关键证据（恶意 crontab、进程列表、登录记录）已经记录在排查报告里，
# 不需要靠这份二进制文件。

set +e

echo "======================================================================"
echo " 收尾：清理取证副本 + 取扫描结果  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 确认取证副本内容（删之前先列出来）"
ls -la /root/forensics-* 2>/dev/null | sed 's/^/  /'
echo "--- 目录里的文件 ---"
find /root/forensics-* -type f 2>/dev/null | head -10 | sed 's/^/  /'
echo "--- 里面的矿机程序 ---"
find /root/forensics-* -name 'xmrig*' -o -name '*.x' 2>/dev/null | head -5 | sed 's/^/  ⚠️ /'

echo
echo "### 2. 删除取证副本（含病毒样本）"
rm -rf /root/forensics-* 2>/dev/null
echo -n "  复查: "
ls -d /root/forensics-* 2>/dev/null && echo "⚠️ 仍存在" || echo "✅ 已删除"

echo
echo "### 3. 全盘复查矿机特征文件（应该一个都没有）"
FOUND=$(find / -xdev \( -name 'xmrig*' -o -name 'kdevtmpfsi*' -o -name 'kinsing*' -o -name '.kthreaddi*' \) -not -path '*/proc/*' -not -path '*/sys/*' 2>/dev/null)
if [ -z "$FOUND" ]; then
  echo "  ✅ 没有发现任何矿机程序"
else
  echo "  ⚠️ 仍然存在:"
  echo "$FOUND" | sed 's/^/    /'
fi

echo
echo "### 4. chkrootkit 扫描结果"
echo "--- 可疑/感染项 ---"
chkrootkit 2>/dev/null | grep -iE 'INFECTED|Vulnerable|suspicious|Warning' | head -15 | sed 's/^/  /' || echo "  (无)"
echo "--- 统计 ---"
TOTAL=$(chkrootkit 2>/dev/null | grep -c 'not infected')
INF=$(chkrootkit 2>/dev/null | grep -ci 'INFECTED')
echo "  检查项正常: $TOTAL"
echo "  感染项: $INF"

echo
echo "### 5. rkhunter 扫描结果"
rkhunter --check --sk --nocolors --rwo 2>&1 | head -40 | sed 's/^/  /'
echo "--- 警告数量 ---"
rkhunter --check --sk --nocolors 2>/dev/null | grep -cE 'Warning' | sed 's/^/  /'

echo
echo "### 6. rkhunter 日志摘要（完整日志在 /var/log/rkhunter.log）"
grep -E 'Warning' /var/log/rkhunter.log 2>/dev/null | tail -20 | sed 's/^/  /' || echo "  (无)"

echo
echo "### 7. 再看一遍系统里所有定时任务（确认没有残留）"
echo "--- root crontab ---"
crontab -l 2>/dev/null | sed 's/^/  /' || echo "  (空)"
echo "--- 所有用户的 crontab ---"
for u in $(cut -d: -f1 /etc/passwd); do
  c=$(crontab -l -u "$u" 2>/dev/null | grep -v '^#')
  [ -n "$c" ] && echo "  [$u]" && echo "$c" | sed 's/^/    /'
done
echo "--- /etc/cron.d 里有没有新的可疑文件 ---"
for f in /etc/cron.d/*; do
  [ -f "$f" ] && echo "  == $f ==" && grep -vE '^#|^$' "$f" | sed 's/^/    /'
done

echo
echo "### 8. 安全组件总览"
echo "--- 服务状态 ---"
for s in nginx fail2ban ufw unattended-upgrades; do
  printf "  %-22s %s\n" "$s" "$(systemctl is-active $s 2>/dev/null)"
done
echo "--- 防火墙 ---"
ufw status | head -10 | sed 's/^/  /'
echo "--- fail2ban 封禁情况 ---"
fail2ban-client status sshd 2>/dev/null | grep -iE 'currently|total' | sed 's/^/  /'

echo
echo "### 9. 待安装的安全更新（unattended-upgrades 会自动处理）"
apt-get -s upgrade 2>/dev/null | grep -c '^Inst.*security' | sed 's/^/  待装安全更新: /'

echo
echo "### 10. 站点最终确认"
for p in / /products /checkout /admin/login; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://localhost:3000$p")
  printf "  %-16s HTTP %s\n" "$p" "$code"
done

echo
echo "======================================================================"
echo " 第 4 + 6 步全部完成"
echo "======================================================================"
