#!/bin/bash
# ============================================================
# Low Flame 一键更新脚本（日常使用）
#
# 流程：本地改代码并 git push → 服务器执行本脚本
# 数据（data/ 与 public/uploads/）不在 git 中，不会被覆盖
#
# 用法：bash /var/www/lowflame/scripts/deploy/update.sh
# ============================================================
set -e

APP_DIR="/var/www/lowflame"
APP_NAME="lowflame"

cd "$APP_DIR"

echo "=========================================="
echo "  更新 Low Flame（$(date '+%Y-%m-%d %H:%M:%S')）"
echo "=========================================="

# 记录当前版本，便于回滚
PREV_COMMIT=$(git rev-parse --short HEAD)
echo "==> 当前版本: $PREV_COMMIT"

echo "==> 1/5 拉取最新代码..."
git pull

NEW_COMMIT=$(git rev-parse --short HEAD)
if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
  echo "    已是最新版本（$NEW_COMMIT），无需更新。"
  echo "    如需强制重建，执行：pm2 restart $APP_NAME"
  exit 0
fi
echo "    新版本: $NEW_COMMIT"

echo "==> 2/5 安装依赖..."
npm ci

echo "==> 3/5 生产构建..."
npm run build

echo "==> 4/5 重启服务..."
pm2 restart "$APP_NAME"

echo "==> 5/5 检查状态..."
sleep 2
pm2 status "$APP_NAME"

echo ""
echo "=========================================="
echo "✅ 更新完成！$PREV_COMMIT -> $NEW_COMMIT"
echo "=========================================="
echo "  如需回滚： cd $APP_DIR && git checkout $PREV_COMMIT && npm ci && npm run build && pm2 restart $APP_NAME"
echo ""
