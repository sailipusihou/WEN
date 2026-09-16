#!/bin/bash
# hunt-persistence.sh —— 找出拉起挖矿木马的持久化机制
#
# 背景：杀掉 /var/tmp/.c/.x 与「认证进程安全系统管理调度_d4」后，
#       后者立刻以新 PID 复活 → 一定有守护/定时机制在拉起它。
#       必须找到并清除，否则重启后还会复发。

echo "======================================================================"
echo " 持久化机制排查  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 当前所有恶意进程（含父子与工作目录）"
for pat in 'd4 -c config.json' '/var/tmp/.c'; do
  echo "--- 匹配: $pat ---"
  for p in $(pgrep -f "$pat" 2>/dev/null); do
    PARENT=$(awk '{print $4}' /proc/$p/stat 2>/dev/null)
    echo "PID=$p  PPID=$PARENT"
    echo "  cmd : $(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null)"
    echo "  exe : $(readlink /proc/$p/exe 2>/dev/null)"
    echo "  cwd : $(readlink /proc/$p/cwd 2>/dev/null)"
    echo "  父进程: $(tr '\0' ' ' < /proc/$PARENT/cmdline 2>/dev/null || echo '?')"
  done
done

echo
echo "### 2. root 的 crontab"
crontab -l 2>/dev/null || echo "(空)"

echo
echo "### 3. /etc/cron.d 与 /etc/crontab"
cat /etc/crontab 2>/dev/null | grep -vE '^#|^$'
echo "--- /etc/cron.d 目录 ---"
ls -la /etc/cron.d/ 2>/dev/null
for f in /etc/cron.d/*; do
  [ -f "$f" ] && echo "== $f ==" && cat "$f"
done 2>/dev/null

echo
echo "### 4. /var/spool/cron 下的所有 crontab"
ls -la /var/spool/cron/crontabs/ 2>/dev/null
for f in /var/spool/cron/crontabs/*; do
  [ -f "$f" ] && echo "== $f ==" && cat "$f"
done 2>/dev/null

echo
echo "### 5. 所有含 d4 / .c/ / tmp 的可疑定时任务文件"
grep -rlE 'd4|/var/tmp/\.c|kdevtmpfsi|kinsing|xmrig' /etc/cron* /var/spool/cron 2>/dev/null || echo "(cron 里没有)"

echo
echo "### 6. 最近被修改/新增的 systemd service"
find /etc/systemd/system /lib/systemd/system /usr/lib/systemd/system -name '*.service' -mtime -60 2>/dev/null | head -25

echo
echo "### 7. 可疑的 systemd 单元内容"
for f in $(find /etc/systemd/system /lib/systemd/system /usr/lib/systemd/system -name '*.service' -mtime -60 2>/dev/null); do
  if grep -qE 'd4|/var/tmp|/tmp/|\.c/' "$f" 2>/dev/null; then
    echo "== $f =="; cat "$f"
  fi
done

echo
echo "### 8. 所有 running 的 systemd 服务（找可疑名字）"
systemctl list-units --type=service --state=running --no-pager --plain 2>/dev/null | head -40

echo
echo "### 9. 启动脚本与 profile"
echo "--- /etc/rc.local ---"; cat /etc/rc.local 2>/dev/null || echo "(无)"
echo "--- /root/.bashrc 尾部 ---"; tail -10 /root/.bashrc 2>/dev/null
echo "--- /root/.profile 尾部 ---"; tail -10 /root/.profile 2>/dev/null
echo "--- /etc/profile.d/ ---"; ls -la /etc/profile.d/ 2>/dev/null
echo "--- /etc/init.d 最近改动 ---"; ls -lat /etc/init.d/ 2>/dev/null | head -6

echo
echo "### 10. SSH 后门：authorized_keys"
ls -la /root/.ssh/ 2>/dev/null
echo "--- authorized_keys ---"
cat /root/.ssh/authorized_keys 2>/dev/null || echo "(无)"

echo
echo "### 11. /var/tmp /tmp /dev/shm 里的可疑可执行文件"
find /var/tmp /tmp /dev/shm -maxdepth 3 -type f 2>/dev/null | head -30
echo "--- 权限与时间 ---"
ls -laR /var/tmp/.c 2>/dev/null | head -20

echo
echo "### 12. 谁在监听端口（看有没有可疑后门端口）"
ss -tlnp 2>/dev/null | head -20

echo
echo "### 13. 对外连接（矿池）"
ss -tnp 2>/dev/null | grep -v '127.0.0.1' | head -15

echo
echo "### 14. 成功登录记录（找入侵时间与来源 IP）"
last -15 -a 2>/dev/null | head -16

echo
echo "### 15. SSH 配置（密码登录开着的话就是暴力破解进来的）"
grep -iE '^\s*(PermitRootLogin|PasswordAuthentication|Port|PubkeyAuthentication)' /etc/ssh/sshd_config 2>/dev/null
echo "--- sshd 实际生效配置 ---"
sshd -T 2>/dev/null | grep -iE 'permitrootlogin|passwordauthentication' || echo "(读不到)"

echo
echo "======================================================================"
echo " 排查结束。重点看：第 1 节的父进程、第 2–5 节的定时任务、"
echo " 第 6–7 节的 systemd、第 10 节的 SSH 公钥、第 14 节的登录来源 IP。"
echo "======================================================================"
