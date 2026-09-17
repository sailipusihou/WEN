#!/bin/bash
# ============================================================
# Low Flame 首次部署脚本（在 VPS 上运行一次）
# 适用：Ubuntu 20.04+ / Debian 11+
# 用法：sudo bash first-deploy.sh
# ============================================================
set -e

APP_DIR="/var/www/lowflame"
REPO_URL="https://github.com/sailipusihou/WEN.git"
APP_NAME="lowflame"

echo "=========================================="
echo "  Low Flame 首次部署"
echo "=========================================="

# ---------- 1. 检查 root ----------
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请用 sudo 运行：sudo bash first-deploy.sh"
  exit 1
fi

# ---------- 2. 安装 Node.js 20 ----------
if ! command -v node &> /dev/null; then
  echo "==> 安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "==> Node.js 已安装: $(node -v)"
fi

# ---------- 3. 安装 git / 构建工具 ----------
echo "==> 安装基础工具..."
apt-get install -y git build-essential python3

# ---------- 4. 安装 PM2 ----------
if ! command -v pm2 &> /dev/null; then
  echo "==> 安装 PM2 进程守护..."
  npm install -g pm2
else
  echo "==> PM2 已安装"
fi

# ---------- 5. 拉取代码 ----------
echo "==> 拉取代码到 $APP_DIR"
mkdir -p /var/www
if [ -d "$APP_DIR/.git" ]; then
  echo "    目录已存在，执行 git pull"
  cd "$APP_DIR" && git pull
else
  git clone -b master "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ---------- 6. 检查 .env.local ----------
if [ ! -f "$APP_DIR/.env.local" ]; then
  echo ""
  echo "⚠️  未找到 .env.local，请先创建："
  echo "     nano $APP_DIR/.env.local"
  echo ""
  echo "  内容示例（从本地电脑复制，去掉 HTTP_PROXY/HTTPS_PROXY）："
  echo "     DATABASE_BACKEND=sqlite"
  echo ""
  echo "  创建后重新运行本脚本。"
  exit 1
fi

# ---------- 7. 安装依赖 ----------
echo "==> 安装依赖（npm ci）..."
cd "$APP_DIR"
npm ci

# ---------- 8. 检查数据目录 ----------
if [ ! -f "$APP_DIR/data/site.db" ]; then
  echo ""
  echo "⚠️  未找到 data/site.db —— 需要从本地电脑同步数据："
  echo "     在本地电脑执行（Windows PowerShell）："
  echo "       scp -r data/ root@<服务器IP>:$APP_DIR/"
  echo "       scp -r public/uploads/ root@<服务器IP>:$APP_DIR/public/"
  echo ""
  echo "  同步完成后重新运行本脚本。"
  exit 1
fi

# ---------- 9. 构建 ----------
echo "==> 生产构建（可能需要几分钟）..."
npm run build

# ---------- 10. 启动 ----------
echo "==> 启动服务..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start npm --name "$APP_NAME" -- start
pm2 save

echo ""
echo "==> 配置开机自启..."
pm2 startup systemd -u root --hp /root | tail -1 | bash || echo "（可手动执行 pm2 startup 输出的命令）"

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo "  查看状态： pm2 status"
echo "  查看日志： pm2 logs $APP_NAME"
echo "  重启服务： pm2 restart $APP_NAME"
echo ""
echo "  下一步：配置 Nginx 反向代理 + HTTPS 证书"
echo "  详见 docs/上线部署指南.md"
echo ""
