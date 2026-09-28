#!/bin/bash
# security-check.sh —— 每日安全体检
#
# 目的：**不阻止入侵，而是让入侵当天就被发现**。
#   这台机器被入侵过三次，其中挖矿那次是拖慢站点好几天才被注意到。
#   这个脚本每天跑一次，把关键状态记进日志，并对已知的"不该出现"的情况报警。
#
# 安装（服务器上）：
#   cp security-check.sh /usr/local/bin/lowflame-security-check.sh
#   chmod +x /usr/local/bin/lowflame-security-check.sh
#   (crontab -l 2>/dev/null; echo '17 6 * * * /usr/local/bin/lowflame-security-check.sh >> /var/log/lowflame-security-check.log 2>&1') | crontab -
#
# 查看：tail -50 /var/log/lowflame-security-check.log

LOG_TAG="[security-check $(date '+%F %T')]"
ALERT=0
alert() { echo "$LOG_TAG ⚠️  $1"; ALERT=1; }
info()  { echo "$LOG_TAG     $1"; }

echo "======================================================================"
echo "$LOG_TAG  每日安全体检"

# ── 1. 负载与 CPU（挖矿最直接的信号）─────────────────────────────
LOAD=$(awk '{print $1}' /proc/loadavg)
TOP=$(ps aux --sort=-%cpu | awk 'NR==2{printf "%s %.1f%% %s", $1, $3, $11}')
info "负载(1min): $LOAD      CPU 榜首: $TOP"
awk -v l="$LOAD" 'BEGIN{ if (l+0 > 4) exit 1 }' || alert "负载超过 4 —— 可能是挖矿，查 ps aux --sort=-%cpu"

# ── 2. UID 0 账号（应该只有 root）────────────────────────────────
UIDS=$(awk -F: '$3==0{printf "%s ", $1}' /etc/passwd)
info "UID 0 账号: $UIDS"
[ "$UIDS" != "root " ] && alert "UID 0 账号异常：$UIDS（多了别的 root）"

# ── 3. 可登录账号（应该只有 root 和 admin）───────────────────────
LOGINABLE=$(awk -F: '$7 !~ /nologin|false|sync|shutdown|halt/ {printf "%s ", $1}' /etc/passwd)
info "可登录账号: $LOGINABLE"
# 逐个名字比对（不能用整行匹配 —— 多个名字在同一行，会永远匹配不上而误报）
BAD_LOGIN=$(echo "$LOGINABLE" | tr ' ' '\n' | grep -vE '^$|^(root|admin|lowflame)$' | tr '\n' ' ')
[ -n "$BAD_LOGIN" ] && alert "出现非预期的可登录账号：$BAD_LOGIN"

# ── 4. 免密 sudo（应该是 0）─────────────────────────────────────
# 用 awk 求和而不是 bc —— 全新 Ubuntu 上不一定装了 bc
NOPASS=$(grep -hcE 'NOPASSWD' /etc/sudoers /etc/sudoers.d/* 2>/dev/null | awk '{s+=$1} END{print s+0}')
info "免密 sudo 条目: $NOPASS"
[ "$NOPASS" != "0" ] && alert "出现免密 sudo 条目 —— 这正是三次入侵的入口，立刻查 /etc/sudoers"

# ── 5. 密码登录（应该是 no）─────────────────────────────────────
PA=$(sshd -T 2>/dev/null | awk '/^passwordauthentication/{print $2}')
info "SSH 密码登录: $PA"
[ "$PA" != "no" ] && alert "SSH 密码登录被打开了（应为 no）"

# ── 6. 密钥行数 ────────────────────────────────────────────────
RK=$(wc -l < /root/.ssh/authorized_keys 2>/dev/null || echo 0)
AK=$(wc -l < /home/admin/.ssh/authorized_keys 2>/dev/null || echo 0)
info "authorized_keys: root=$RK 行  admin=$AK 行（admin 有阿里云注入的属正常）"
[ "$RK" != "1" ] && alert "root 的 authorized_keys 不是 1 行（应该是我们的部署密钥）"

# ── 7. 持久化位置（cron / shell 启动文件）───────────────────────
CRON_N=$(crontab -l 2>/dev/null | grep -cvE '^\s*#|^\s*$|lowflame-watchdog|lowflame-security')
info "非预期 crontab 条目: $CRON_N"
[ "$CRON_N" != "0" ] && alert "crontab 里出现非预期条目：$(crontab -l 2>/dev/null | grep -vE 'lowflame-watchdog|lowflame-security|^\s*#')"

BAD_RC=$(grep -clE 'nohup|/var/tmp/|pgrep -f' /root/.bashrc /root/.profile 2>/dev/null | awk '{s+=$1} END{print s+0}')
[ "$BAD_RC" != "0" ] && alert "bashrc/profile 里出现可疑行（历史上攻击者往这里塞守护）"

# ── 8. 可疑文件与进程 ──────────────────────────────────────────
SUS_FILES=$(ls -d /var/tmp/.font-unix /var/tmp/.systemd-private /tmp/.sysh /var/tmp/.c* 2>/dev/null | wc -l)
info "已知恶意路径残留: $SUS_FILES"
[ "$SUS_FILES" != "0" ] && alert "出现历史恶意目录：$(ls -d /var/tmp/.font-unix /var/tmp/.systemd-private /tmp/.sysh 2>/dev/null | tr '\n' ' ')"

SUS_PROC=$(ps aux | grep -icE 'xmrig|jajang|font-unix|_w[0-9]$|kinsing|kdevtmpfsi')
SUS_PROC=$((SUS_PROC - 1))   # 减掉 grep 自己
info "可疑进程: $SUS_PROC"
[ "$SUS_PROC" -gt 0 ] && alert "出现挖矿/后门类进程"

# ── 9. 应用身份（应为 lowflame，不是 root）──────────────────────
APPU=$(ps -o user= -p "$(pgrep -f 'next-server' | head -1)" 2>/dev/null | tr -d ' ')
info "应用运行身份: ${APPU:-（未运行）}"
[ "$APPU" = "root" ] && alert "应用又变回 root 运行了（应为 lowflame）"

# ── 10. docker（已移除，不该再出现）────────────────────────────
command -v docker >/dev/null 2>&1 && alert "docker 又出现了（攻击者用它跑过矿机容器）"

# ── 11. 对外端口（只该有 22/80/443）────────────────────────────
PORTS=$(ss -tln 2>/dev/null | awk 'NR>1 && $4 ~ /0\.0\.0\.0:/ {split($4,a,":"); print a[2]}' | sort -un | tr '\n' ' ')
info "对外监听端口: $PORTS"
echo "$PORTS" | grep -qvE '^(22 80 443 |22 80 443)$' && alert "对外端口异常：$PORTS（应只有 22/80/443）"

# ── 12. fail2ban ───────────────────────────────────────────────
BANNED=$(fail2ban-client status sshd 2>/dev/null | grep -oE 'Currently banned:\s*[0-9]+' | grep -oE '[0-9]+')
info "fail2ban 已封: ${BANNED:-?} 个 IP"

# ── 13. 站点 ───────────────────────────────────────────────────
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 20 http://localhost:3000/ 2>/dev/null)
info "应用本机: HTTP $CODE"
[ "$CODE" != "200" ] && alert "应用本机返回 $CODE"

echo "$LOG_TAG  $([ $ALERT -eq 0 ] && echo '✅ 未发现异常' || echo '⚠️ 有异常，见上面标 ⚠️ 的行')"
echo "======================================================================"

# 只有异常时才在最后再打一行醒目标记，方便 grep
[ $ALERT -eq 1 ] && echo "$LOG_TAG  ########## 需要人工查看 ##########"
exit 0
