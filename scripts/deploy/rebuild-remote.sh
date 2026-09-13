#!/bin/bash
# 服务器端重新构建（在 /root 下运行，不放在仓库里避免 pull 冲突）
cd /var/www/lowflame || exit 1

echo "=== 停止服务（避免构建时争内存） ===" >> /tmp/build.log
pm2 stop lowflame >/dev/null 2>&1

echo "=== 开始构建 $(date) ===" >> /tmp/build.log
NODE_OPTIONS="--max-old-space-size=1024" npm run build >> /tmp/build.log 2>&1
echo "===BUILD_EXIT=$?===" >> /tmp/build.log

echo "=== 启动服务 $(date) ===" >> /tmp/build.log
pm2 start lowflame >> /tmp/build.log 2>&1

sleep 10
curl -s -o /dev/null -w "local=%{http_code}\n" -m 25 http://localhost:3000/ >> /tmp/build.log 2>&1
echo "===DONE===" >> /tmp/build.log
