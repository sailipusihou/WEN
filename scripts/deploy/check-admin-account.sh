#!/bin/bash
# check-admin-account.sh —— 排查 admin 账户是否为攻击者留下的后门
# 只读，不做任何修改。

echo "======================================================================"
echo " admin 账户排查  $(date '+%F %T')"
echo "======================================================================"

TODAY=$(( $(date +%s) / 86400 ))

echo
echo "### 1. 账户基本信息"
grep '^admin:' /etc/passwd | sed 's/^/  /'

echo
echo "### 2. 密码设置情况"
SHADOW=$(grep '^admin:' /etc/shadow)
if [ -z "$SHADOW" ]; then
  echo "  shadow 里没有 admin（可能没设密码，无法登录）"
else
  HASH=$(echo "$SHADOW" | cut -d: -f2 | cut -c1-6)
  CHANGE_DAY=$(echo "$SHADOW" | cut -d: -f3)
  echo "  hash 前缀     : $HASH"
  echo "  密码最后修改  : 第 $CHANGE_DAY 天（今天第 $TODAY 天）"
  if [ -n "$CHANGE_DAY" ] && [ "$CHANGE_DAY" -gt 0 ] 2>/dev/null; then
    echo "  → 换算成日期  : $(date -d "@$((CHANGE_DAY * 86400))" '+%F' 2>/dev/null)"
    AGE=$(( TODAY - CHANGE_DAY ))
    echo "  → 距今        : $AGE 天前设置"
  fi
  case "$HASH" in
    '$6$'|'$y$') echo "  → 算法        : 强哈希（正常）" ;;
    '$1$')       echo "  → 算法        : MD5（很老，可疑）" ;;
    '!')         echo "  → 状态        : 密码被锁（无法用密码登录）" ;;
    '*')         echo "  → 状态        : 无密码（无法用密码登录）" ;;
  esac
fi

echo
echo "### 3. 家目录与文件"
ls -lad /home/admin 2>/dev/null | sed 's/^/  /' || echo "  (/home/admin 不存在)"
echo "  目录内容:"
ls -la /home/admin/ 2>/dev/null | head -12 | sed 's/^/    /'

echo
echo "### 4. 权限与用户组（关键：有没有 sudo）"
id admin 2>/dev/null | sed 's/^/  /'
echo "  sudoers 引用:"
grep -rn 'admin' /etc/sudoers /etc/sudoers.d/ 2>/dev/null | sed 's/^/    /' || echo "    (没有 sudo 权限)"

echo
echo "### 5. SSH 公钥（后门常用手法）"
if [ -f /home/admin/.ssh/authorized_keys ]; then
  echo "  ⚠️ 存在 authorized_keys:"
  cat /home/admin/.ssh/authorized_keys | cut -c1-80 | sed 's/^/    /'
  ls -la /home/admin/.ssh/ | sed 's/^/    /'
else
  echo "  (无 authorized_keys)"
fi

echo
echo "### 6. 该账户的登录历史"
echo "  --- 成功登录 ---"
last admin 2>/dev/null | head -8 | sed 's/^/    /' || echo "    (无记录)"
echo "  --- 失败尝试 ---"
lastb admin 2>/dev/null | head -5 | sed 's/^/    /' || echo "    (无记录)"

echo
echo "### 7. 当前有没有 admin 的进程在跑"
ps -u admin -o pid,pcpu,args 2>/dev/null | head -8 | sed 's/^/  /' || echo "  (无)"

echo
echo "### 8. admin 家目录里有没有可疑文件"
find /home/admin -type f 2>/dev/null | head -25 | sed 's/^/  /'

echo
echo "### 9. 系统里所有能登录的账户汇总"
echo "  --- 全部账户 ---"
awk -F: '{print "    " $1 "  uid=" $3 "  shell=" $7}' /etc/passwd | grep -vE 'nologin|/bin/false' | head -20
echo "  --- 最近 30 天新建的账户（看 /etc/passwd 修改时间）---"
ls -l /etc/passwd /etc/shadow /etc/group | sed 's/^/    /'
echo "  --- /etc/passwd 里新加的行（与备份对比，若有）---"
[ -f /etc/passwd- ] && diff /etc/passwd- /etc/passwd | head -10 | sed 's/^/    /'

echo
echo "======================================================================"
echo " 判断要点："
echo "  · admin 有没有 sudo 权限（有 = 高危）"
echo "  · 密码是什么时候设的（和入侵时间 9/15 14:12 接近 = 可疑）"
echo "  · 家目录里有没有矿机/脚本文件"
echo "  · 有没有 authorized_keys（后门公钥）"
echo "======================================================================"
