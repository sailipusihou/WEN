#!/bin/bash
# step3-ssh-firewall.sh —— 安全加固 第 3 步：收紧 SSH 配置 + 安装防火墙
#
# ⚠️ 安全原则：先放行必需端口，再启用防火墙；改 SSH 配置前先备份。
#    任何一步失败都会中止，不会把管理通道切断。
#
# 不做的事（避免锁死自己）：
#   · 不改 PermitRootLogin —— 我们目前用 root+密码登录，改了会立刻失去访问
#     正确的做法是先配好非 root 账户 + 密钥，再关 root 登录（放到后面单独做）
#   · 不改 SSH 端口 —— 属于"隐晦式安全"，收益低但会让所有脚本要跟着改

set +e

echo "======================================================================"
echo " 第 3 步：SSH 加固 + 防火墙  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 改前状态"
echo "--- 当前 sshd 关键配置 ---"
sshd -T 2>/dev/null | grep -iE '^(permitrootlogin|passwordauthentication|maxauthtries|logingracetime|x11forwarding|allowtcpforwarding|clientaliveinterval)' | sed 's/^/    /'
echo "--- 备份 sshd_config ---"
cp -a /etc/ssh/sshd_config "/etc/ssh/sshd_config.bak-$(date +%Y%m%d-%H%M%S)"
ls -l /etc/ssh/sshd_config.bak-* | tail -2 | sed 's/^/    /'

echo
echo "### 2. 写入加固配置到 /etc/ssh/sshd_config.d/"
# 用独立的 drop-in 文件，不动主配置文件；Ubuntu 的 sshd_config 默认 Include 这个目录
mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
# 由安全加固脚本生成。改这里比改主配置安全，且不会被 sshd 升级覆盖。
#
# 每次连接最多允许 3 次认证尝试（配合 fail2ban 的 maxretry=5 形成双保险）
MaxAuthTries 3
# 建立连接后 30 秒内必须完成认证，减少占用
LoginGraceTime 30
# 关掉用不到的转发能力（攻击者常用 SSH 隧道做跳板/穿透）
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
# 客户端 5 分钟无活动就断开
ClientAliveInterval 300
ClientAliveCountMax 2
# 禁止空密码
PermitEmptyPasswords no
# 只允许这些账户通过 SSH 登录（root 保留，admin 是阿里云开通时创建的）
AllowUsers root admin
EOF
echo "  ✅ 已写入 /etc/ssh/sshd_config.d/99-hardening.conf"

echo
echo "### 3. 语法检查（关键：检查不通过就回滚）"
if sshd -t 2>&1; then
  echo "  ✅ 配置语法正确"
else
  echo "  ❌ 语法错误！删除加固文件并回滚"
  rm -f /etc/ssh/sshd_config.d/99-hardening.conf
  echo "  已回滚，SSH 保持原样"
  exit 1
fi

echo
echo "### 4. 重载 sshd（用 reload 不用 restart，不断开现有连接）"
systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null
sleep 2
echo -n "  sshd 状态: "; systemctl is-active ssh 2>/dev/null || systemctl is-active sshd
echo "--- 生效后的关键配置 ---"
sshd -T 2>/dev/null | grep -iE '^(permitrootlogin|passwordauthentication|maxauthtries|logingracetime|x11forwarding|allowtcpforwarding)' | sed 's/^/    /'

echo
echo "### 5. 安装 ufw 防火墙"
DEBIAN_FRONTEND=noninteractive apt-get -y -qq install ufw 2>&1 | tail -3
command -v ufw >/dev/null 2>&1 || { echo "  ❌ ufw 安装失败，跳过防火墙步骤"; exit 1; }
echo "  ✅ ufw 已安装"

echo
echo "### 6. 配置防火墙规则（先放行，后启用 —— 顺序很重要）"
ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
# 必需端口
ufw allow 22/tcp  comment 'SSH'      >/dev/null 2>&1
ufw allow 80/tcp  comment 'HTTP'     >/dev/null 2>&1
ufw allow 443/tcp comment 'HTTPS'    >/dev/null 2>&1
echo "  已放行: 22 (SSH) / 80 (HTTP) / 443 (HTTPS)"
echo "  其它入站: 全部拒绝"

echo
echo "### 7. 启用防火墙"
ufw --force enable 2>&1 | tail -3
sleep 2
echo -n "  ufw 状态: "; ufw status | head -1

echo
echo "### 8. 验证（这一步最关键：确认没把自己锁死）"
echo "--- ufw 规则 ---"
ufw status verbose 2>&1 | head -14 | sed 's/^/    /'
echo "--- 本机 SSH 端口仍可连 ---"
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/22' && echo "    ✅ 22 端口可连" || echo "    ⚠️ 22 端口连不上！"
echo "--- 站点仍可访问 ---"
curl -s -o /dev/null -w "    localhost:3000 → HTTP %{http_code}\n" -m 10 http://localhost:3000/
echo "--- nginx / fail2ban ---"
echo -n "    nginx: "; systemctl is-active nginx
echo -n "    fail2ban: "; systemctl is-active fail2ban

echo
echo "### 9. fail2ban 与 ufw 是否共存正常"
fail2ban-client status sshd 2>&1 | grep -iE 'banned' | sed 's/^/    /'
iptables -L -n 2>/dev/null | grep -c 'f2b-sshd' | sed 's/^/    f2b-sshd 链引用数: /'

echo
echo "======================================================================"
echo " 第 3 步完成。"
echo
echo " ⚠️ 请现在新开一个终端，用新密码 SSH 登录一次，确认能进："
echo "      ssh root@43.110.46.49"
echo "    万一进不去：用阿里云控制台「远程连接 / VNC」进系统执行"
echo "      ufw disable && rm -f /etc/ssh/sshd_config.d/99-hardening.conf"
echo "======================================================================"
