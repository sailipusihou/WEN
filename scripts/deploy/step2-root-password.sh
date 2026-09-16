#!/bin/bash
# step2-root-password.sh —— 安全加固 第 2 步：更换 root 密码
#
# 为什么要做：攻击者通过 SSH 暴力破解拿到了 root 密码（5 万多次尝试）。
#            fail2ban 只能拦住"猜密码"的，拦不住"已经知道密码"的。
#            旧密码在攻击者手里，必须立刻换掉。
#
# 安全性：
#   · chpasswd 立即生效，不需要重启机器（控制台重置密码需要重启，更麻烦）
#   · 先改密码，再由外部用新密码做一次真实 SSH 登录测试
#   · 测试失败的话脚本会打印告警，可立即用控制台 VNC 救援
#
# ⚠️ 新密码由调用方通过环境变量 NEW_PASS 传入，不写在脚本里。

set +e

echo "======================================================================"
echo " 第 2 步：更换 root 密码  $(date '+%F %T')"
echo "======================================================================"

if [ -z "$NEW_PASS" ]; then
  echo "❌ 未提供 NEW_PASS 环境变量，中止"
  exit 1
fi

echo
echo "### 1. 改密码前的状态"
echo "  root 账户信息: $(grep '^root:' /etc/passwd)"
echo "  密码最后修改日期(天): $(awk -F: '/^root:/{print $3}' /etc/shadow)"
echo "  密码 hash 算法: $(awk -F: '/^root:/{print $2}' /etc/shadow | cut -c1-3)"

echo
echo "### 2. 设置新密码"
echo "root:$NEW_PASS" | chpasswd
RC=$?
if [ $RC -ne 0 ]; then
  echo "  ❌ chpasswd 失败（退出码 $RC），密码未改动"
  exit 1
fi
echo "  ✅ 已设置"

echo
echo "### 3. 验证密码确实变了"
echo "  密码最后修改日期(天): $(awk -F: '/^root:/{print $3}' /etc/shadow)"
echo "  （上面这个数字应该等于今天，从 1970-01-01 起算的天数 $(($(date +%s)/86400)))"
echo "  hash 前缀: $(awk -F: '/^root:/{print $2}' /etc/shadow | cut -c1-3)"
echo "  （\$y\$ = yescrypt，Ubuntu 22.04 默认的强哈希）"

echo
echo "### 4. 确认没有影响正在运行的服务"
echo -n "  nginx: "; systemctl is-active nginx
echo -n "  fail2ban: "; systemctl is-active fail2ban
echo -n "  站点: "; curl -s -o /dev/null -w "HTTP %{http_code}\n" -m 10 http://localhost:3000/

echo
echo "### 5. 安全检查：有没有其它账户能登录"
echo "  UID 0 的账户（应该只有 root）:"
awk -F: '$3==0 {print "    " $1}' /etc/passwd
echo "  有可用 shell 的账户:"
awk -F: '$7 !~ /nologin|false|sync|shutdown|halt/ {print "    " $1 " → " $7}' /etc/passwd

echo
echo "======================================================================"
echo " root 密码已更换。"
echo
echo " ⚠️ 请立刻做两件事："
echo "   1. 把新密码存进密码管理器"
echo "   2. 在另一个终端用新密码试一次 SSH 登录，确认能进"
echo "      （万一不行：用阿里云控制台「远程连接 / VNC」进系统重设）"
echo "======================================================================"
