#!/bin/bash
# remove-backdoor.sh —— 删除后门账户并做账户审计
#
# 背景：攻击者通过 cron 每隔 30 分钟创建（或已提前创建）
#   用户名 pakchoi / 密码 Kermit123@ 的账户，并给它 NOPASSWD ALL 的 sudo。
#   实测该账户的 UID 是 0 —— 等同于第二个 root，必须删除。

set +e

echo "======================================================================"
echo " 后门账户清理  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 所有 UID 0 的账户（正常情况下应当只有 root 一个）"
awk -F: '$3==0 {print "  " $1 "  home=" $6 "  shell=" $7}' /etc/passwd

echo
echo "### 2. pakchoi 的痕迹"
grep -n pakchoi /etc/passwd 2>/dev/null | sed 's/^/  passwd: /' || echo "  passwd 里没有"
grep -n pakchoi /etc/shadow 2>/dev/null | cut -c1-60 | sed 's/^/  shadow: /' || echo "  shadow 里没有"
grep -n pakchoi /etc/group 2>/dev/null | sed 's/^/  group: /' || echo "  group 里没有"
grep -rn pakchoi /etc/sudoers /etc/sudoers.d/ 2>/dev/null | sed 's/^/  sudoers: /' || echo "  sudoers 里没有"
ls -la /home/pakchoi 2>/dev/null | head -5

echo
echo "### 3. 执行删除"
pkill -9 -u pakchoi 2>/dev/null && echo "  已结束 pakchoi 的进程"
if userdel -rf pakchoi 2>/dev/null; then
  echo "  ✅ 已删除用户 pakchoi（含家目录）"
else
  echo "  userdel 返回非 0，改用 passwd/shadow 直接清理"
  sed -i '/^pakchoi:/d' /etc/passwd
  sed -i '/^pakchoi:/d' /etc/shadow
  sed -i '/^pakchoi:/d' /etc/group
  rm -rf /home/pakchoi
  echo "  ✅ 已从 passwd/shadow/group 中移除"
fi
rm -f /etc/sudoers.d/99-pakchoi && echo "  ✅ 已删除 /etc/sudoers.d/99-pakchoi"

echo
echo "### 4. 复查"
echo "--- UID 0 账户 ---"
awk -F: '$3==0 {print "  " $1}' /etc/passwd
echo "--- pakchoi 是否还存在 ---"
id pakchoi 2>/dev/null && echo "  ⚠️ 仍然存在！" || echo "  ✅ 已不存在"
echo "--- sudoers.d ---"
ls -la /etc/sudoers.d/ 2>/dev/null | sed 's/^/  /'
echo "--- 所有可登录的普通用户（UID>=1000）---"
awk -F: '$3>=1000 && $3<65534 {print "  " $1 " (uid " $3 ")"}' /etc/passwd
echo "--- 有 shell 的账户（排除 nologin/false）---"
awk -F: '$7 !~ /nologin|false|sync|shutdown|halt/ {print "  " $1 " → " $7}' /etc/passwd

echo
echo "### 5. 清理 crontab 里的攻击者残留注释"
crontab -l 2>/dev/null | grep -vE '^# mk_g' | crontab -
echo "--- 清理后的 crontab ---"
crontab -l 2>/dev/null | sed 's/^/  /' || echo "  (空)"

echo
echo "### 6. 状态确认"
echo "--- CPU 占用前 6 ---"
ps -eo pid,pcpu,args --sort=-pcpu | head -7 | sed 's/^/  /'
echo "--- 负载 ---"
uptime
echo "--- 站点 ---"
curl -s -o /dev/null -w "  localhost:3000 → %{http_code}  time=%{time_total}s\n" -m 15 http://localhost:3000/

echo
echo "======================================================================"
