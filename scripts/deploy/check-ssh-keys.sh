#!/bin/bash
# check-ssh-keys.sh —— 检查所有 authorized_keys，找攻击者可能植入的公钥
#
# 为什么最紧急：SSH 公钥认证**完全绕过密码**。
# 如果攻击者加了公钥，改多少次 root 密码都没用 —— 他拿着私钥就能直接进。
# /root/.ssh/authorized_keys 的修改时间（9/12 21:42）落在入侵时间窗内，必须查实。

set +e

echo "======================================================================"
echo " SSH 公钥后门排查  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 所有 authorized_keys 文件（系统里全部找一遍）"
find / -xdev -name 'authorized_keys' -not -path '*/proc/*' 2>/dev/null | while read f; do
  echo "  --- $f ---"
  ls -la "$f" | sed 's/^/      /'
  echo "      内容（每行一个公钥）:"
  awk '{print "        [" NR "] 类型=" $1 "  指纹=" substr($2,1,30) "…  注释=" $3}' "$f"
done

echo
echo "### 2. /root/.ssh/authorized_keys 详细分析"
F=/root/.ssh/authorized_keys
if [ -f "$F" ]; then
  echo "  文件属性:"
  stat "$F" 2>/dev/null | grep -E 'Modify|Change|Birth|Size|Access: \(' | sed 's/^/    /'
  echo "  公钥条数: $(grep -cE '^(ssh-|ecdsa-|sk-|rsa-|ed25519)' "$F")"
  echo
  echo "  逐条列出（含指纹与注释，注释里通常写着是谁的密钥）:"
  i=0
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    i=$((i+1))
    TYPE=$(echo "$line" | awk '{print $1}')
    COMMENT=$(echo "$line" | awk '{print $3}')
    FP=$(echo "$line" | ssh-keygen -lf - 2>/dev/null | awk '{print $1, $2}')
    echo "    [$i] 类型: $TYPE"
    echo "        指纹: $FP"
    echo "        注释: ${COMMENT:-（无注释）}"
    echo "        长度: $(echo "$line" | wc -c) 字符"
  done < "$F"
else
  echo "  ✅ /root/.ssh/authorized_keys 不存在（正常 —— 用密码登录时不需要它）"
fi

echo
echo "### 3. 与阿里云开通时创建的密钥对比"
if [ -f /home/admin/.ssh/authorized_keys ]; then
  echo "  admin（阿里云开通时创建，已知正常）:"
  FP1=$(ssh-keygen -lf /home/admin/.ssh/authorized_keys 2>/dev/null | awk '{print $2}')
  echo "    指纹: $FP1"
fi
if [ -f /root/.ssh/authorized_keys ]; then
  echo "  root:"
  FP2=$(ssh-keygen -lf /root/.ssh/authorized_keys 2>/dev/null | awk '{print $2}')
  echo "    指纹: $FP2"
fi
if [ -n "$FP1" ] && [ -n "$FP2" ]; then
  if [ "$FP1" = "$FP2" ]; then
    echo "  → 两者相同：root 用的是阿里云那把密钥（可能是开通时同步过去的，属正常）"
  else
    echo "  → ⚠️ 两者不同！root 的密钥来源需要确认"
  fi
fi

echo
echo "### 4. .ssh 目录的其它文件（可能被塞了别的东西）"
for d in /root/.ssh /home/admin/.ssh; do
  [ -d "$d" ] || continue
  echo "  --- $d ---"
  ls -la "$d" | sed 's/^/      /'
done

echo
echo "### 5. known_hosts 里有没有攻击者的服务器（出站连接痕迹）"
for f in /root/.ssh/known_hosts /home/admin/.ssh/known_hosts; do
  if [ -f "$f" ]; then
    echo "  --- $f（$(wc -l < "$f") 条）---"
    cut -d' ' -f1 "$f" 2>/dev/null | sort -u | head -20 | sed 's/^/      /'
  fi
done

echo
echo "### 6. SSH 认证方式现状（确认公钥是否被启用）"
sshd -T 2>/dev/null | grep -iE '^(pubkeyauthentication|passwordauthentication|authorizedkeysfile|permitrootlogin)' | sed 's/^/  /'

echo
echo "### 7. 最近的成功登录（再看一遍有没有异常来源）"
last -20 -a 2>/dev/null | grep -vE '^reboot|^wtmp' | head -15 | sed 's/^/  /'

echo
echo "### 8. 当前有几个 SSH 会话在连着"
who 2>/dev/null | sed 's/^/  /' || echo "  (无交互式会话)"
ss -tnp 2>/dev/null | grep ':22' | head -10 | sed 's/^/  /'

echo
echo "======================================================================"
echo " 判断要点："
echo "  · /root/.ssh/authorized_keys 里如果有多条公钥，逐条确认是不是你的"
echo "  · 注释字段常写着 attacker@host 之类，是识别依据"
echo "  · 指纹与阿里云那把（admin 的）不一致且认不出来 = 可疑，必须删"
echo "======================================================================"
