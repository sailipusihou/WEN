#!/bin/bash
# neutralize-ssh-keys.sh —— 清除 SSH 公钥后门（保留完整证据以便恢复）
#
# 背景：/root/.ssh/authorized_keys 里有两把不属于阿里云的密钥，
#      且文件在入侵时间窗内（9/13 05:42）被修改过，
#      /root/.ssh 目录的修改时间与后门账户创建时间（9/15 14:12）完全一致。
#
# 风险控制：
#   · 先完整备份两份（可恢复）——万一这两把钥匙是用户在用的
#   · 只清空 authorized_keys，不动 pubkeyauthentication 设置
#   · 保持 passwordauthentication yes → 用密码仍能登录，不会把自己锁在外面
#   · 清空后立即用密码自测一次

set +e

echo "======================================================================"
echo " 清除 SSH 公钥后门  $(date '+%F %T')"
echo "======================================================================"

STAMP=$(date +%Y%m%d-%H%M%S)
BK="/root/ssh-keys-backup-$STAMP"
mkdir -p "$BK"

echo
echo "### 1. 完整备份（含公钥原文与指纹，方便以后判断是不是你的）"
if [ -f /root/.ssh/authorized_keys ]; then
  cp -a /root/.ssh/authorized_keys "$BK/authorized_keys.orig"
  ssh-keygen -lf /root/.ssh/authorized_keys > "$BK/fingerprints.txt" 2>&1
  {
    echo "=== 备份时间: $(date) ==="
    echo "=== 文件属性 ==="
    stat /root/.ssh/authorized_keys
    echo
    echo "=== 公钥原文 ==="
    cat /root/.ssh/authorized_keys
    echo
    echo "=== 指纹 ==="
    cat "$BK/fingerprints.txt"
  } > "$BK/README.txt"
  tar -czf "/root/ssh-keys-backup-$STAMP.tar.gz" -C /root "ssh-keys-backup-$STAMP" 2>/dev/null
  echo "  ✅ 已备份到 $BK.tar.gz"
  echo
  echo "  --- 被清除的密钥（请确认是否认识）---"
  awk '{print "    类型: " $1 "\n    注释: " ($3 ? $3 : "（无）") "\n"}' /root/.ssh/authorized_keys | sed 's/^/  /'
else
  echo "  (authorized_keys 不存在，无需处理)"
fi

echo
echo "### 2. 清空 authorized_keys"
if [ -f /root/.ssh/authorized_keys ]; then
  : > /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
  chown root:root /root/.ssh/authorized_keys
  echo "  ✅ 已清空（文件保留但无内容，这是最安全的状态）"
else
  echo "  跳过"
fi

echo
echo "### 3. 检查有没有 authorized_keys2（另一个生效位置）"
if [ -f /root/.ssh/authorized_keys2 ]; then
  cp -a /root/.ssh/authorized_keys2 "$BK/authorized_keys2.orig" 2>/dev/null
  : > /root/.ssh/authorized_keys2
  echo "  ⚠️ 发现 authorized_keys2，已备份并清空"
else
  echo "  ✅ 没有 authorized_keys2"
fi

echo
echo "### 4. 复查"
echo "  --- /root/.ssh/authorized_keys 内容 ---"
if [ -s /root/.ssh/authorized_keys ]; then
  echo "    ⚠️ 仍有内容:"; cat /root/.ssh/authorized_keys | sed 's/^/      /'
else
  echo "    ✅ 已空"
fi
echo "  --- 全系统再搜一遍 authorized_keys ---"
find / -xdev -name 'authorized_keys*' -not -path '*/proc/*' 2>/dev/null | while read f; do
  n=$(grep -cE '^(ssh-|ecdsa-|sk-)' "$f" 2>/dev/null)
  echo "    $f : $n 把公钥"
done

echo
echo "### 5. 确认密码登录仍然可用（关键：不能把自己锁在外面）"
echo "  --- sshd 配置 ---"
sshd -T 2>/dev/null | grep -iE '^(passwordauthentication|pubkeyauthentication|permitrootlogin)' | sed 's/^/    /'
echo "  --- 本机 22 端口 ---"
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/22' && echo "    ✅ 22 端口正常监听" || echo "    ⚠️ 22 端口异常"

echo
echo "### 6. 检查 known_hosts（出站连接痕迹，可能暴露攻击者的跳板机）"
if [ -f /root/.ssh/known_hosts ]; then
  echo "  内容已加密哈希（HashKnownHosts 开启），无法直接读出主机名"
  echo "  条数: $(wc -l < /root/.ssh/known_hosts)"
  echo "  修改时间: $(stat -c %y /root/.ssh/known_hosts 2>/dev/null)"
fi

echo
echo "### 7. 当前 SSH 连接与会话"
ss -tnp 2>/dev/null | grep ':22' | head -8 | sed 's/^/  /'
echo "  说明：上面有连接是正常的 —— 这条命令本身就走 SSH"

echo
echo "======================================================================"
echo " SSH 公钥后门已清除"
echo
echo " ⚠️ 请确认：你是不是自己配过 SSH 密钥登录？"
echo "    备份位置: /root/ssh-keys-backup-$STAMP.tar.gz"
echo "    如果是你的钥匙，可以从备份里恢复；如果不是，就这么保持空着。"
echo "======================================================================"
