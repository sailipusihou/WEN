#!/bin/bash
# clean-shell-persistence.sh —— 清除 shell 启动脚本里的持久化后门 + 确认站点
#
# 清除对象：
#   /root/.bashrc  第 100 行
#   /root/.profile 第 10 行
#   内容: pgrep -f '认证进程安全系统管理调度_d4' || (nohup /root/.local/share/.cache_s/wd_t &) # mk_g
#
# 手法说明：这是「登录触发式」持久化 —— 每次 root 登录就检查木马是否在跑，不在就拉起。
#          配合已被我删除的 crontab 条目形成双保险，所以两处都必须清。

set +e

echo "======================================================================"
echo " 清除 shell 持久化 + 站点确认  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 清除前的备份与记录"
cp -a /root/.bashrc "/root/.bashrc.infected-$(date +%Y%m%d-%H%M%S)" 2>/dev/null
cp -a /root/.profile "/root/.profile.infected-$(date +%Y%m%d-%H%M%S)" 2>/dev/null
echo "  已备份为 /root/.bashrc.infected-* 与 /root/.profile.infected-*"
echo "  --- 将被删除的行 ---"
grep -nE "认证进程|wd_t|mk_g|cache_s" /root/.bashrc /root/.profile 2>/dev/null | sed 's/^/    /'

echo
echo "### 2. 删除这两行（用 grep -v 过滤，保留其它所有内容）"
# 匹配攻击者特征：中文进程名 / wd_t / # mk_g 注释 / .cache_s 路径
grep -vE "认证进程安全系统管理调度|wd_t|/# mk_g|# mk_g$|\.cache_s/" /root/.bashrc > /tmp/bashrc.clean 2>/dev/null
grep -vE "认证进程安全系统管理调度|wd_t|/# mk_g|# mk_g$|\.cache_s/" /root/.profile > /tmp/profile.clean 2>/dev/null

echo "  --- 清理后检查（应为空）---"
if grep -qE "认证进程|wd_t|mk_g|cache_s" /tmp/bashrc.clean /tmp/profile.clean 2>/dev/null; then
  echo "    ⚠️ 仍有残留，放弃替换以免破坏文件"
  grep -nE "认证进程|wd_t|mk_g|cache_s" /tmp/bashrc.clean /tmp/profile.clean | sed 's/^/      /'
else
  echo "    ✅ 干净"
  # 行数对比，确认只删掉了目标行
  echo "    .bashrc : $(wc -l < /root/.bashrc) 行 → $(wc -l < /tmp/bashrc.clean) 行"
  echo "    .profile: $(wc -l < /root/.profile) 行 → $(wc -l < /tmp/profile.clean) 行"
  cp /tmp/bashrc.clean /root/.bashrc
  cp /tmp/profile.clean /root/.profile
  chmod 644 /root/.bashrc /root/.profile
  chown root:root /root/.bashrc /root/.profile
  echo "    ✅ 已替换"
fi

echo
echo "### 3. 复查"
echo "  --- /root/.bashrc 匹配可疑关键词（应为空）---"
grep -nE "认证进程|wd_t|mk_g|cache_s|libproc|xmrig" /root/.bashrc 2>/dev/null | sed 's/^/    ⚠️ /' || echo "    ✅ 无"
echo "  --- /root/.profile ---"
grep -nE "认证进程|wd_t|mk_g|cache_s|libproc|xmrig" /root/.profile 2>/dev/null | sed 's/^/    ⚠️ /' || echo "    ✅ 无"
echo "  --- .bashrc 最后 5 行（确认文件结构完好）---"
tail -5 /root/.bashrc | sed 's/^/    /'
echo "  --- 语法检查 ---"
bash -n /root/.bashrc 2>&1 && echo "    ✅ .bashrc 语法正确" || echo "    ⚠️ .bashrc 有语法错误"
bash -n /root/.profile 2>&1 && echo "    ✅ .profile 语法正确" || echo "    ⚠️ .profile 有语法错误"

echo
echo "### 4. 删除感染备份（含恶意内容，不留）"
rm -f /root/.bashrc.infected-* /root/.profile.infected-* /tmp/bashrc.clean /tmp/profile.clean
echo "  ✅ 已删除"

echo
echo "### 5. 全系统最后一轮持久化排查"
echo "  --- 所有 shell 启动脚本里的恶意关键词 ---"
FOUND=0
for f in /root/.bashrc /root/.profile /root/.bash_profile /root/.bash_login /etc/bash.bashrc /etc/profile /etc/profile.d/* /home/*/.bashrc /home/*/.profile; do
  [ -f "$f" ] || continue
  m=$(grep -lE "认证进程|wd_t|\.cache_s|libproc|xmrig|kdevtmpfsi|kinsing" "$f" 2>/dev/null)
  [ -n "$m" ] && echo "    ⚠️ $f" && FOUND=1
done
[ $FOUND -eq 0 ] && echo "    ✅ 全部干净"

echo "  --- crontab ---"
crontab -l 2>/dev/null | sed 's/^/    /' || echo "    (空)"
echo "  --- 其它用户 crontab ---"
for u in $(cut -d: -f1 /etc/passwd); do
  c=$(crontab -l -u "$u" 2>/dev/null | grep -vE '^#|^$')
  [ -n "$c" ] && echo "    [$u] $c"
done
echo "  --- systemd 单元里的恶意引用 ---"
grep -rlE "认证进程|wd_t|\.cache_s|libproc|xmrig" /etc/systemd /lib/systemd/system 2>/dev/null | sed 's/^/    ⚠️ /' || echo "    ✅ 没有"
echo "  --- LD_PRELOAD 类后门 ---"
[ -e /etc/ld.so.preload ] && echo "    ⚠️ /etc/ld.so.preload 仍存在: $(cat /etc/ld.so.preload)" || echo "    ✅ /etc/ld.so.preload 不存在"

echo
echo "### 6. 站点恢复确认"
echo "  --- PM2 ---"
pm2 list 2>/dev/null | grep -E 'lowflame|status' | head -4 | sed 's/^/    /'
echo "  --- 逐页测试（最多等 60 秒）---"
for i in $(seq 1 12); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 8 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "    ✅ 应用就绪（第 ${i} 次尝试）"; break; }
  sleep 5
done
for p in / /products /cart /checkout /login /admin/login /api/paypal/config; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://localhost:3000$p")
  printf "    %-22s HTTP %s\n" "$p" "$code"
done
echo "  --- 经 nginx ---"
for p in / /products /checkout; do
  code=$(curl -s -k -o /dev/null -w '%{http_code}' -m 10 "https://localhost$p")
  printf "    https%-17s HTTP %s\n" "$p" "$code"
done

echo
echo "### 7. 安全组件总览"
for s in nginx fail2ban ufw unattended-upgrades; do
  printf "  %-22s %s\n" "$s" "$(systemctl is-active $s 2>/dev/null)"
done
fail2ban-client status sshd 2>/dev/null | grep -iE 'currently banned|banned ip' | sed 's/^/  /'

echo
echo "======================================================================"
echo " shell 持久化已清除"
echo "======================================================================"
