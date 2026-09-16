#!/bin/bash
# remove-rootkit.sh —— 清除 LD_PRELOAD rootkit 并重新扫描
#
# 发现的 rootkit：
#   /etc/ld.so.preload → /usr/lib/libproc.so（属主 root，创建于 9/12 05:20，不属于任何软件包）
#   劫持 readdir/lstat/stat/open/rename/unlink —— 让 ls/find/ps 看不到被隐藏的文件
#
# 清除顺序很重要：
#   1. 先清空 /etc/ld.so.preload（否则删 .so 后所有进程都会因找不到库而报错）
#   2. 再删 .so 文件
#   3. 然后重新扫描 —— 去掉隐藏后可能露出之前看不见的恶意文件
#
# ⚠️ 注意：清空 ld.so.preload 会影响所有新启动的进程（这是好事）。
#    现有进程仍然加载着旧库，需要重启相关服务才生效。

set +e

echo "======================================================================"
echo " 清除 LD_PRELOAD rootkit  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 清除前的取证记录"
echo "--- /etc/ld.so.preload 原始内容与属性 ---"
ls -la /etc/ld.so.preload 2>/dev/null | sed 's/^/  /'
cat /etc/ld.so.preload 2>/dev/null | sed 's/^/  内容: /'
echo "--- 备份到 /root/rootkit-evidence.txt ---"
{
  echo "=== /etc/ld.so.preload ==="
  ls -la /etc/ld.so.preload 2>/dev/null
  cat /etc/ld.so.preload 2>/dev/null
  echo
  echo "=== /usr/lib/libproc.so ==="
  stat /usr/lib/libproc.so 2>/dev/null
  echo
  echo "=== 导出符号 ==="
  nm -D /usr/lib/libproc.so 2>/dev/null | head -40
  echo
  echo "=== 文件哈希（便于以后比对）==="
  md5sum /usr/lib/libproc.so 2>/dev/null
  sha256sum /usr/lib/libproc.so 2>/dev/null
  echo
  echo "=== 字符串里的特征（若有）==="
  strings /usr/lib/libproc.so 2>/dev/null | head -60
} > /root/rootkit-evidence.txt 2>&1
echo "  ✅ 已保存: /root/rootkit-evidence.txt ($(wc -l < /root/rootkit-evidence.txt) 行)"

echo
echo "### 2. 清除 /etc/ld.so.preload"
# 先清空内容（保证删 .so 后不会有进程找不到库），再删除文件本身
: > /etc/ld.so.preload 2>/dev/null
rm -f /etc/ld.so.preload
echo -n "  复查: "
[ -e /etc/ld.so.preload ] && echo "⚠️ 仍存在" || echo "✅ 已删除（这是正常 Linux 系统应有的状态 —— 该文件本来就不该存在）"

echo
echo "### 3. 清除 rootkit 库文件"
for p in /usr/lib/libproc.so /lib/libproc.so; do
  if [ -e "$p" ]; then
    rm -f "$p" && echo "  ✅ 已删除 $p"
  fi
done
echo -n "  复查: "
[ -e /usr/lib/libproc.so ] && echo "⚠️ 仍存在" || echo "✅ 已删除"

echo
echo "### 4. 搜索有没有其它同类 rootkit（同样的符号 + 不在软件包里的 .so）"
echo "--- 所有引用了 readdir/lstat/stat 的非软件包 .so ---"
for so in $(find /usr/lib /lib /usr/local/lib /lib64 -maxdepth 2 -name '*.so*' -type f 2>/dev/null); do
  # 跳过 dpkg 管理的文件
  if ! dpkg -S "$so" >/dev/null 2>&1; then
    SYMS=$(nm -D "$so" 2>/dev/null | grep -cE ' T (readdir|lstat|stat|open|unlink)$')
    if [ "$SYMS" -ge 3 ]; then
      echo "  ⚠️ 可疑: $so  （劫持了 $SYMS 个系统调用，且不属于任何软件包）"
      ls -la "$so" | sed 's/^/      /'
    fi
  fi
done
echo "  (以上为空 = 没有发现同类 rootkit)"

echo
echo "### 5. 清除后重新扫描（去掉隐藏，可能露出之前看不见的东西）"
echo "--- 重新检查所有已知恶意路径 ---"
for p in /var/tmp/.c /root/.cache/.cache_88 /root/.local/share/.cache_s /root/.local/share/.cache_o /root/.local/share/.cache_ml /root/.local/share/.cache_; do
  [ -e "$p" ] && echo "  ⚠️ 仍存在: $p" || true
done
echo "  (无输出 = 都已清除)"

echo "--- 全盘搜矿机特征 ---"
find / -xdev \( -name 'xmrig*' -o -name 'kdevtmpfsi*' -o -name 'kinsing*' -o -name '.kthreaddi*' -o -name 'libproc.so' \) -not -path '*/proc/*' 2>/dev/null | head -10 | sed 's/^/  ⚠️ /' || true
echo "  (无输出 = 没发现)"

echo
echo "### 6. 进程列表（去掉 rootkit 隐藏后，看有没有新冒出来的）"
ps -eo pid,user,pcpu,pmem,etime,args --sort=-pcpu | head -14 | sed 's/^/  /'

echo
echo "### 7. 检查其它可能的隐藏手法"
echo "--- 有没有人改过 ~/.bashrc / /etc/profile 之类来持久化 ---"
grep -lE 'libproc|/var/tmp/\.c|cache_|xmrig' /root/.bashrc /root/.profile /etc/profile /etc/bash.bashrc /etc/profile.d/* 2>/dev/null | sed 's/^/  ⚠️ /' || echo "  ✅ 没有"
echo "--- 有没有异常的定时任务 ---"
for u in $(cut -d: -f1 /etc/passwd); do
  c=$(crontab -l -u "$u" 2>/dev/null | grep -vE '^#|^$')
  [ -n "$c" ] && echo "  [$u]" && echo "$c" | sed 's/^/    /'
done
echo "--- systemd 里引用 libproc 的单元 ---"
grep -rl 'libproc' /etc/systemd /lib/systemd/system 2>/dev/null | sed 's/^/  ⚠️ /' || echo "  ✅ 没有"

echo
echo "### 8. 重启受影响的服务（让 rootkit 从内存里消失）"
echo "  说明：现有进程仍加载着被劫持的库，重启后进程会用干净的库"
systemctl restart nginx 2>/dev/null && echo "  ✅ nginx 已重启"
systemctl restart fail2ban 2>/dev/null && echo "  ✅ fail2ban 已重启"
pm2 restart lowflame >/dev/null 2>&1 && echo "  ✅ lowflame 已重启"
echo "  ⚠️ sshd 不重启（避免断开当前连接），下次重启机器时自然生效"

echo
echo "### 9. 最终验证"
echo -n "  nginx: "; systemctl is-active nginx
echo -n "  fail2ban: "; systemctl is-active fail2ban
echo -n "  ufw: "; ufw status | head -1
echo "--- 站点 ---"
for p in / /products /checkout /admin/login; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://localhost:3000$p")
  printf "    %-14s HTTP %s\n" "$p" "$code"
done
echo "--- fail2ban 封禁 ---"
fail2ban-client status sshd 2>/dev/null | grep -iE 'currently banned|banned ip' | sed 's/^/  /'

echo
echo "======================================================================"
echo " rootkit 已清除"
echo
echo " ⚠️ 但请注意：rootkit 存在说明攻击者曾经完全控制这台机器，"
echo "    并且能在很长一段时间里隐藏自己的文件。"
echo "    彻底安全的唯一办法是重装系统 —— 详见交付说明。"
echo "======================================================================"
