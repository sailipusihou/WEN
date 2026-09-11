#!/bin/bash
# ============================================================
# Low Flame 一键更新脚本（日常使用）
#
# 流程：本地改代码并 git push -> 服务器执行本脚本
# 数据（data/ 与 public/uploads/）不在 git 中，不会被覆盖
#
# 用法：bash /var/www/lowflame/scripts/deploy/update.sh
#
# 注意：本脚本在构建前会暂停 Node 服务，避免 2GB 内存的服务器
#       因「构建 + 生产服务」同时占用内存而卡死（swap 抖动）。
#       构建期间网站会短暂不可用（约 1-3 分钟）。
# ============================================================
set -e

APP_DIR="/var/www/lowflame"
APP_NAME="lowflame"
NODE_MEM="1024"   # 构建进程内存上限（MB），2GB 服务器建议 1024

cd "$APP_DIR"

echo "=========================================="
echo "  更新 Low Flame（$(date '+%Y-%m-%d %H:%M:%S')）"
echo "=========================================="

# 记录当前版本，便于回滚
PREV_COMMIT=$(git rev-parse --short HEAD)
echo "==> 当前版本: $PREV_COMMIT"

echo "==> 1/6 拉取最新代码..."
git checkout -- . 2>/dev/null || true
# 注意：不使用 git clean（会误删服务器上未跟踪的真实上传文件）
if ! git pull; then
  echo ""
  echo "❌ 拉取失败：可能存在与仓库同名的未跟踪文件（通常是上传文件）"
  echo "   处理方式：根据上面的提示，删除冲突文件后重新执行本脚本"
  echo "   （这些文件在 git 中已有，pull 会自动恢复）"
  exit 1
fi

NEW_COMMIT=$(git rev-parse --short HEAD)
if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
  echo "    已是最新版本（$NEW_COMMIT），无需更新。"
  echo "    如需强制重建，执行：pm2 restart $APP_NAME"
  exit 0
fi
echo "    新版本: $NEW_COMMIT"

echo "==> 2/6 安装依赖..."
NODE_OPTIONS="--max-old-space-size=$NODE_MEM" npm ci --no-audit --no-fund

echo "==> 2.5/6 重建原生模块（better-sqlite3，防止中断导致绑定缺失）..."
npm rebuild better-sqlite3 2>&1 | tail -2

# 验证 SQLite 可用，否则中止更新（避免网站起来但数据库不可用）
if ! node -e "require('better-sqlite3')" 2>/dev/null; then
  echo "❌ better-sqlite3 加载失败，中止更新以防服务不可用"
  exit 1
fi
echo "    SQLite 模块正常 ✓"

echo "==> 3/6 暂停服务（释放内存给构建，避免 OOM 卡死）..."
pm2 stop "$APP_NAME" 2>/dev/null || true

echo "==> 4/6 生产构建（内存上限 ${NODE_MEM}MB，约 1-3 分钟）..."
if ! NODE_OPTIONS="--max-old-space-size=$NODE_MEM" npm run build; then
  echo ""
  echo "❌ 构建失败！正在恢复旧版本服务..."
  pm2 start "$APP_NAME" 2>/dev/null || true
  echo "   网站已恢复运行（仍是旧版本 $PREV_COMMIT）"
  exit 1
fi

echo "==> 5/6 启动服务..."
pm2 restart "$APP_NAME" 2>/dev/null || pm2 start npm --name "$APP_NAME" -- start

echo "==> 6/6 检查状态..."
sleep 5
pm2 status "$APP_NAME"
echo ""
echo "--- 本地访问测试 ---"
curl -s -o /dev/null -w "http://localhost:3000 -> %{http_code}\n" -m 20 http://localhost:3000/ || echo "（首次启动可能较慢，请稍后手动验证）"

echo ""
echo "=========================================="
echo "✅ 更新完成！$PREV_COMMIT -> $NEW_COMMIT"
echo "=========================================="
echo "  如需回滚： cd $APP_DIR && git checkout $PREV_COMMIT && bash $APP_DIR/scripts/deploy/update.sh"
echo ""
