#!/bin/bash
# forensic-who-how.sh —— 查清"怎么进来的、什么时候、从哪来"
# 只读，不改动任何东西。

echo "======================================================================"
echo " 入侵取证  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. SSH 当前配置（判断是否有被暴力破解的条件）"
sshd -T 2>/dev/null | grep -iE '^(permitrootlogin|passwordauthentication|pubkeyauthentication|port|maxauthtries|logingracetime)' | sed 's/^/  /'

echo
echo "### 2. 失败的登录尝试（暴力破解的痕迹）"
echo "--- 失败登录总数 ---"
lastb 2>/dev/null | wc -l
echo "--- 失败登录里出现最多的来源 IP（前 15）---"
lastb 2>/dev/null | awk '{print $3}' | grep -E '^[0-9]+\.' | sort | uniq -c | sort -rn | head -15
echo "--- 最后 15 条失败记录 ---"
lastb -15 -a 2>/dev/null | head -16

echo
echo "### 3. 尝试过的用户名（前 20，看攻击者用了什么字典）"
lastb 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

echo
echo "### 4. 成功的登录记录（找入侵时间点）"
last -30 -a 2>/dev/null | head -32

echo
echo "### 5. SSH 后门检查"
echo "--- /root/.ssh/authorized_keys（攻击者可能加了公钥）---"
cat /root/.ssh/authorized_keys 2>/dev/null | cut -c1-80 || echo "(无)"
echo "--- /root/.ssh 目录 ---"
ls -la /root/.ssh/ 2>/dev/null
echo "--- 其他用户的 authorized_keys ---"
find /home /root -maxdepth 3 -name 'authorized_keys' 2>/dev/null | while read f; do
  echo "== $f =="; ls -la "$f"; cat "$f" 2>/dev/null | cut -c1-60
done

echo
echo "### 6. 还有没有其它遗留的可疑文件（按时间找）
--- 最近 7 天内修改过、且属主/属组异常或路径可疑的可执行文件 ---"
find / -xdev -type f -perm -111 -mtime -7 2>/dev/null \
  | grep -vE '^/(usr|snap|var/lib|var/cache|opt|proc|sys)' \
  | grep -vE '/var/www/lowflame|/root/\.pm2|/root/\.nvm|node_modules' \
  | head -25

echo
echo "### 7. 检查系统命令是否被替换（攻击者常替换 ps/ls/netstat 来隐藏自己）"
for cmd in ps ls netstat ss top find; do
  p=$(command -v $cmd 2>/dev/null)
  [ -n "$p" ] && echo "  $cmd → $p  $(ls -l "$p" 2>/dev/null | awk '{print $6, $7, $8}')"
done
echo "--- 这些包的文件是否被改过（debsums 若可用）---"
if command -v debsums >/dev/null 2>&1; then
  debsums -c 2>/dev/null | head -20 || echo "(无异常或工具未装)"
else
  echo "(未装 debsums；用 dpkg -V 代替)"
  dpkg -V 2>/dev/null | head -20 || echo "(无异常)"
fi

echo
echo "### 8. 数据库与敏感文件是否可能被读"
echo "--- 数据库大小与最后修改时间 ---"
ls -lh /var/www/lowflame/data/site.db 2>/dev/null
echo "--- .env / 凭据文件 ---"
ls -la /var/www/lowflame/.env* 2>/dev/null || echo "(无 .env)"
echo "--- 最近 3 天访问过 site.db 的进程痕迹（若有 auditd 才有）---"
if command -v ausearch >/dev/null 2>&1; then
  ausearch -f /var/www/lowflame/data/site.db -ts recent 2>/dev/null | head -20 || echo "(无 auditd 记录)"
else
  echo "(未启用 auditd，无法追溯文件访问)"
fi

echo
echo "### 9. 其它常见挖矿/僵尸网络家族的残留特征"
for p in kdevtmpfsi kinsing xmrig SystemdMiner watchdogs .kthreaddi ddgs; do
  found=$(find / -xdev -name "*${p}*" -not -path '*/proc/*' 2>/dev/null | head -3)
  [ -n "$found" ] && echo "  ⚠️ $p:" && echo "$found" | sed 's/^/      /'
done
echo "(以上为空的项 = 没发现该家族特征)"

echo
echo "### 10. 当前系统的对外连接（还有没有连 C2 / 矿池）"
ss -tnp 2>/dev/null | grep -vE '127\.0\.0\.1|::1' | head -15

echo
echo "### 11. 防火墙与安全组现状"
iptables -L OUTPUT -n --line-numbers 2>/dev/null | head -12
echo "--- ufw ---"
ufw status 2>/dev/null | head -8 || echo "(未安装 ufw)"

echo
echo "### 12. 有没有 fail2ban（防暴力破解）"
systemctl is-active fail2ban 2>/dev/null || echo "  fail2ban 未运行 ← 这就是能被暴力破解的原因之一"

echo
echo "======================================================================"
