#!/bin/bash
# ============================================================
# Low Flame 一键更新脚本（日常使用）
#
# 流程：本地改代码并 git push -> 服务器执行本脚本
# 数据（data/ 与 public/uploads/）不在 git 中，不会被覆盖
#
# 用法：bash /var/www/lowflame/scripts/deploy/update.sh [--force] [--reinstall]
#   --force      即使代码版本没变，也强制重新构建（不重装依赖）
#   --reinstall  强制重跑 npm ci（很吃内存，非必要不用）
#
# ------------------------------------------------------------
# 2GB 内存服务器的安全策略（重要）
#   这台服务器只有 2GB 内存 + 2GB swap。之前出现过「npm ci 期间
#   内存耗尽导致整机 swap 抖动、SSH 与网站全部无响应、只能从云控制台
#   重启」的严重事故。为此本脚本做了以下防护：
#
#   1) 先停服务再装依赖：pm2 停掉后能多出 200-400MB 内存；
#   2) 只在 package-lock.json 变化时才执行 npm ci：
#      纯代码改动直接跳过安装（这是最耗时也最吃内存的一步）；
#   3) npm ci 限制内存与并发：--max-old-space-size=512 --maxsockets 4；
#   4) 原生模块仅在真正加载失败时才重建，不做无谓编译；
#   5) trap 兜底：脚本中途异常退出/被 kill 时自动把服务拉起来。
#
#   构建期间网站会短暂不可用（约 1-3 分钟），这是刻意的取舍。
# ============================================================
set -e

FORCE=0
REINSTALL=0
for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=1 ;;
    --reinstall) REINSTALL=1 ;;
  esac
done

APP_DIR="/var/www/lowflame"
APP_NAME="lowflame"
BUILD_MEM="1024"    # next build 内存上限（MB）
INSTALL_MEM="512"   # npm ci 内存上限（MB），刻意压低避免撑爆 2GB 机器
LOCK_HASH_FILE="$APP_DIR/.deploy-lock-hash"

cd "$APP_DIR"

# ---- 兜底：无论怎么退出，只要服务被本脚本停过，就把它拉起来 ----
APP_STOPPED=0
restore_on_exit() {
  local code=$?
  if [ "$APP_STOPPED" = "1" ]; then
    echo ""
    echo "⚠️  脚本异常退出（code $code），正在恢复服务..."
    pm2 start "$APP_NAME" 2>/dev/null || pm2 restart "$APP_NAME" 2>/dev/null || true
  fi
}
trap restore_on_exit EXIT

echo "=========================================="
echo "  更新 Low Flame（$(date '+%Y-%m-%d %H:%M:%S')）"
echo "=========================================="

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
  if [ "$FORCE" != "1" ]; then
    echo "    已是最新版本（$NEW_COMMIT），无需更新。"
    echo "    如需强制重建，执行：bash $APP_DIR/scripts/deploy/update.sh --force"
    exit 0
  fi
  echo "    --force：版本未变（$NEW_COMMIT），仍强制重新构建。"
fi
echo "    新版本: $NEW_COMMIT"

# ---- 判断是否需要重装依赖 ----
# 默认策略：node_modules 已存在就跳过 npm ci（纯代码改动最常见，也最安全）；
# 只有 lockfile 相对上次安装发生变化、或依赖目录缺失、或显式 --reinstall 才重装。
CUR_LOCK_HASH=$(md5sum package-lock.json 2>/dev/null | cut -d' ' -f1)
NEED_INSTALL=0
if [ "$REINSTALL" = "1" ]; then
  NEED_INSTALL=1
elif [ ! -d node_modules/next ]; then
  echo "    node_modules 缺失，需要安装依赖"
  NEED_INSTALL=1
elif [ -f "$LOCK_HASH_FILE" ] && [ "$CUR_LOCK_HASH" != "$(cat "$LOCK_HASH_FILE" 2>/dev/null)" ]; then
  echo "    package-lock.json 有变化，需要安装依赖"
  NEED_INSTALL=1
fi

if [ "$NEED_INSTALL" = "1" ]; then
  echo "==> 2/6 依赖有变化，先停服务再安装（释放内存，避免 OOM 卡死）..."
  pm2 stop "$APP_NAME" 2>/dev/null || true
  APP_STOPPED=1
  echo "    可用内存：$(free -m | awk '/^Mem:/{print $7"MB"}')；swap：$(free -m | awk '/^Swap:/{print $3"/"$2"MB"}')"
  echo "    安装中（内存上限 ${INSTALL_MEM}MB，并发 4）..."
  if ! NODE_OPTIONS="--max-old-space-size=$INSTALL_MEM" npm ci --no-audit --no-fund --maxsockets 4; then
    echo "❌ 依赖安装失败，正在恢复旧版本服务..."
    pm2 start "$APP_NAME" 2>/dev/null || true
    APP_STOPPED=0
    exit 1
  fi
  echo "$CUR_LOCK_HASH" > "$LOCK_HASH_FILE"
else
  echo "==> 2/6 依赖已就绪，跳过 npm ci（最省内存的一步）✓"
  # 记录当前 lockfile 指纹作为基线，之后它一变就会自动重装
  echo "$CUR_LOCK_HASH" > "$LOCK_HASH_FILE"
fi

# ---- 原生模块只在真正不可用时才重建（重建要编译，很吃内存）----
if ! node -e "require('better-sqlite3')" 2>/dev/null; then
  echo "==> 2.5/6 better-sqlite3 不可用，重建原生模块..."
  if [ "$APP_STOPPED" = "0" ]; then
    pm2 stop "$APP_NAME" 2>/dev/null || true
    APP_STOPPED=1
  fi
  NODE_OPTIONS="--max-old-space-size=$INSTALL_MEM" npm rebuild better-sqlite3 2>&1 | tail -2
  if ! node -e "require('better-sqlite3')" 2>/dev/null; then
    echo "❌ better-sqlite3 仍然不可用，中止更新以防数据库不可用"
    exit 1
  fi
  echo "    SQLite 模块已修复 ✓"
else
  echo "==> 2.5/6 SQLite 模块正常 ✓"
fi

# ---- 构建：必须先停服务，否则 2GB 内存装不下「构建 + 生产服务」----
if [ "$APP_STOPPED" = "0" ]; then
  echo "==> 3/6 暂停服务（释放内存给构建，避免 OOM 卡死）..."
  pm2 stop "$APP_NAME" 2>/dev/null || true
  APP_STOPPED=1
fi

# ---- 独立看门狗 ----
# 事故记录：这台 2GB 机器在 next build 结束后，主脚本进程被内核直接杀掉
# （SIGKILL，trap 捕不到，连结尾的 echo 都来不及输出），结果是构建成功、
# 但服务永远停在 stopped，网站 502。
#
# 因此看门狗刻意做成「不依赖主脚本」的独立进程：它自己观察 next build 进程
# 的出现与消失来判断构建是否结束（而不是等主脚本写标记文件——主脚本正是
# 在写标记前后被杀掉的），然后再兜底把服务拉起来。
setsid bash -c "
  SEEN=0
  for i in \$(seq 1 300); do
    sleep 5
    if pgrep -f 'next build' >/dev/null 2>&1 || pgrep -f 'next/dist/bin/next' >/dev/null 2>&1; then
      SEEN=1
      continue
    fi
    # 见过构建进程、现在它没了 → 构建已结束，留 25 秒给主脚本正常收尾
    [ \"\$SEEN\" = \"1\" ] && break
  done
  sleep 25
  PID=\$(pm2 pid '$APP_NAME' 2>/dev/null || echo 0)
  if [ -z \"\$PID\" ] || [ \"\$PID\" = \"0\" ]; then
    echo \"[\$(date '+%H:%M:%S')] 看门狗：服务未运行，正在拉起\" >> /tmp/lowflame-watchdog.log
    pm2 start '$APP_NAME' >/dev/null 2>&1 || true
  else
    echo \"[\$(date '+%H:%M:%S')] 看门狗：服务已在运行，无需干预\" >> /tmp/lowflame-watchdog.log
  fi
" >/dev/null 2>&1 < /dev/null &
echo "    已启动独立看门狗（即使本脚本被杀，构建结束后也会兜底拉起服务）"

echo "==> 4/6 生产构建（内存上限 ${BUILD_MEM}MB，约 1-3 分钟）..."
if ! NODE_OPTIONS="--max-old-space-size=$BUILD_MEM" npm run build; then
  echo ""
  echo "❌ 构建失败！正在恢复旧版本服务..."
  pm2 start "$APP_NAME" 2>/dev/null || true
  APP_STOPPED=0
  echo "   网站已恢复运行（仍是旧版本 $PREV_COMMIT）"
  exit 1
fi

echo "==> 5/6 启动服务..."
pm2 restart "$APP_NAME" 2>/dev/null || pm2 start "$APP_NAME" 2>/dev/null || pm2 start npm --name "$APP_NAME" -- start
APP_STOPPED=0   # 服务已由本脚本正常拉起，trap 不再接管

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
echo "  如需回滚： cd $APP_DIR && git checkout $PREV_COMMIT && bash $APP_DIR/scripts/deploy/update.sh --force"
echo ""
