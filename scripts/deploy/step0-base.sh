#!/bin/bash
# step0-base.sh —— 安全加固 第 0 步：装基础环境（系统组件 + Node 20 + PM2）
#
# 为什么需要这一步：重装后系统是干净的 Ubuntu，什么都没有。
# 后面所有脚本（fail2ban / ufw / 部署）都依赖这里的组件。
#
# ⚠️ 顺序：本步 → step1-fail2ban → step3-ssh-firewall → step4-6-updates-rootkit
#    （step2 改 root 密码在重装时已经设过了，不用再跑）
#
# 用法（服务器上）：bash step0-base.sh
# 日志：/root/setup-base.log

set +e
exec > >(tee /root/setup-base.log) 2>&1

echo "======================================================================"
echo " 第 0 步：基础环境  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 系统更新 + 基础组件"
export DEBIAN_FRONTEND=noninteractive
apt-get -qq update 2>&1 | tail -3

# 安全组件 + 服务 + 构建工具
#   build-essential / python3：better-sqlite3 等原生模块编译需要
apt-get -y -qq install \
  fail2ban ufw unattended-upgrades \
  rkhunter chkrootkit \
  nginx certbot python3-certbot-nginx \
  curl ca-certificates gnupg git rsync \
  build-essential python3 \
  htop iotop unzip 2>&1 | tail -5

echo "  已装:"
for c in nginx certbot fail2ban ufw git; do printf '    %-12s ' "$c"; command -v $c >/dev/null 2>&1 && echo "✓" || echo "✗"; done

echo
echo "### 2. Node.js 20（NodeSource）"
if command -v node >/dev/null 2>&1 && [ "$(node -v | cut -c2-3)" = "20" ]; then
  echo "  Node $(node -v) 已存在，跳过"
else
  curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesetup.sh 2>/dev/null
  if [ -s /tmp/nodesetup.sh ]; then
    bash /tmp/nodesetup.sh >/dev/null 2>&1
    apt-get -y -qq install nodejs 2>&1 | tail -3
  else
    echo "  ⚠️ 下载 NodeSource 脚本失败，尝试系统自带 nodejs"
    apt-get -y -qq install nodejs npm 2>&1 | tail -3
  fi
fi
echo "  node: $(node -v 2>/dev/null || echo '✗')   npm: $(npm -v 2>/dev/null || echo '✗')"

echo
echo "### 3. PM2"
if command -v pm2 >/dev/null 2>&1; then
  echo "  PM2 $(pm2 -v) 已存在，跳过"
else
  npm install -g pm2 >/dev/null 2>&1
fi
echo "  pm2: $(pm2 -v 2>/dev/null || echo '✗')"

echo
echo "### 4. 应用目录"
mkdir -p /var/www
echo "  /var/www 就绪"

echo
echo "### 5. 现状汇总"
echo "  系统: $(. /etc/os-release 2>/dev/null; echo $PRETTY_NAME)"
echo "  内核: $(uname -r)"
echo "  内存: $(free -m | awk '/Mem:/{print $2" MB"}')"
echo "  磁盘: $(df -h / | awk 'NR==2{print $2" 总 / "$4" 可用"}')"
echo "  node: $(node -v 2>/dev/null)   npm: $(npm -v 2>/dev/null)   pm2: $(pm2 -v 2>/dev/null)"

echo
echo "======================================================================"
echo " 第 0 步完成。下一步：bash scripts/deploy/step1-fail2ban.sh"
echo "======================================================================"
echo "BASE-DONE"
