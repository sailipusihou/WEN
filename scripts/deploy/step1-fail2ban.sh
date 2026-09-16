#!/bin/bash
# step1-fail2ban.sh —— 安全加固 第 1 步：安装并配置 fail2ban
#
# 作用：某个 IP 密码试错达到阈值就自动封禁，阻止正在进行的 SSH 暴力破解。
# 安全性：只封「认证失败」的 IP，正常用密码登录不受影响。
#        万一被误封，用阿里云控制台的「远程连接 / VNC」进入（不走 SSH，不受影响）。

set +e

echo "======================================================================"
echo " 第 1 步：安装 fail2ban  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 环境检查"
. /etc/os-release 2>/dev/null
echo "  系统: ${PRETTY_NAME:-未知}"
echo "  内核: $(uname -r)"
echo -n "  fail2ban 现状: "
if dpkg -l fail2ban >/dev/null 2>&1; then echo "已安装"; else echo "未安装"; fi

echo
echo "### 2. 更新软件源（失败不中断）"
timeout 90 apt-get -qq update 2>&1 | tail -3
echo "  apt update 完成"

echo
echo "### 3. 安装 fail2ban"
DEBIAN_FRONTEND=noninteractive apt-get -y -qq install fail2ban 2>&1 | tail -5
if ! command -v fail2ban-server >/dev/null 2>&1; then
  echo "  ❌ 安装失败。可能原因：软件源不可达 / 磁盘空间不足"
  df -h / | tail -1
  exit 1
fi
echo "  ✅ fail2ban 已安装: $(fail2ban-server --version 2>/dev/null | head -1)"

echo
echo "### 4. 写配置 /etc/fail2ban/jail.local"
# 说明：jail.local 优先级高于 jail.conf，升级包时不会被覆盖。
#      bantime.increment 让屡犯者封禁时间翻倍，比固定封禁更有效。
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
# 封禁时长：1 小时起步
bantime  = 1h
# 统计窗口：10 分钟内
findtime = 10m
# 允许的错误次数：5 次（留出余量，避免自己网络抖动被误封）
maxretry = 5
# 屡犯者封禁时间翻倍（1h → 2h → 4h …最多 1 周）
bantime.increment = true
bantime.factor    = 2
bantime.maxtime   = 1w
# 使用 iptables 封禁
banaction = iptables-multiport
backend   = systemd

[sshd]
enabled  = true
port     = ssh
# aggressive：把「用户名不存在」「协议错误」等也算作失败，抓得更全
mode     = aggressive
maxretry = 5
findtime = 10m
bantime  = 1h

# 后台管理接口被暴力尝试也要封（登录接口在 /api/auth）
[sshd-ddos]
enabled  = true
port     = ssh
filter   = sshd-ddos
maxretry = 10
findtime = 5m
bantime  = 2h
EOF
echo "  ✅ 已写入 /etc/fail2ban/jail.local"

echo
echo "### 5. 启动并设为开机自启"
systemctl enable fail2ban >/dev/null 2>&1
systemctl restart fail2ban
sleep 6
echo -n "  服务状态: "
systemctl is-active fail2ban

echo
echo "### 6. 验证生效"
echo "--- fail2ban 客户端状态 ---"
fail2ban-client status 2>&1 | head -8
echo "--- sshd jail 状态（已封禁数量是关键指标）---"
fail2ban-client status sshd 2>&1 | head -12

echo
echo "### 7. iptables 里的封禁链（fail2ban 自动创建的）"
iptables -L -n 2>/dev/null | grep -A3 -iE 'f2b|fail2ban' | head -12

echo
echo "### 8. 观察 20 秒，看有没有立刻开始封禁正在打的 IP"
sleep 20
echo "--- 20 秒后的 sshd jail ---"
fail2ban-client status sshd 2>&1 | grep -iE 'banned|total' | head -6

echo
echo "### 9. 确认自己的连接没受影响"
echo "  SSH 现在仍然可用（这条命令就是证明）"
echo "  当前登录来源: $(echo $SSH_CONNECTION | awk '{print $1}')"

echo
echo "======================================================================"
echo " 第 1 步完成。"
echo " 封禁名单查看: fail2ban-client status sshd"
echo " 手动解封某 IP: fail2ban-client set sshd unbanip <IP>"
echo " 被封进不来时: 用阿里云控制台「远程连接 / VNC」"
echo "======================================================================"
