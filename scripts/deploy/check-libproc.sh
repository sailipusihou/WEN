#!/bin/bash
# check-libproc.sh —— 查清 rkhunter 报的 preloaded shared library 是不是 rootkit
#
# 背景：rkhunter 报 "Found preloaded shared library: /usr/lib/libproc.so"。
#      攻击者常用 LD_PRELOAD 预加载恶意 .so 来劫持系统调用、
#      让 ps/ls/netstat 看不到自己（rootkit 的经典手法）。
#      但也可能是正常软件（某些监控/性能分析工具会这样），必须查实。

set +e

echo "======================================================================"
echo " libproc.so 排查  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 这个文件到底存不存在"
for p in /usr/lib/libproc.so /lib/libproc.so /usr/local/lib/libproc.so /usr/lib/x86_64-linux-gnu/libproc.so; do
  if [ -e "$p" ]; then
    echo "  ✅ 存在: $p"
    ls -la "$p" | sed 's/^/    /'
  else
    echo "  — 不存在: $p"
  fi
done

echo
echo "### 2. 全盘搜索所有叫 libproc 的文件"
find / -xdev -name 'libproc*' -not -path '*/proc/*' 2>/dev/null | head -20 | sed 's/^/  /'

echo
echo "### 3. 谁在预加载它？（LD_PRELOAD 的来源）"
echo "--- /etc/ld.so.preload ---"
if [ -f /etc/ld.so.preload ]; then
  echo "  ⚠️ 文件存在，内容:"
  cat /etc/ld.so.preload | sed 's/^/    /'
  echo "  --- 文件属性 ---"
  ls -la /etc/ld.so.preload | sed 's/^/    /'
else
  echo "  ✅ /etc/ld.so.preload 不存在（这是最常见的手法是这个文件，没有就说明不是它）"
fi
echo "--- 环境变量里有没有 LD_PRELOAD ---"
env | grep -i 'LD_PRELOAD' | sed 's/^/  /' || echo "  当前 shell 没有设 LD_PRELOAD"
echo "--- systemd 服务里有没有设 LD_PRELOAD ---"
grep -rl 'LD_PRELOAD' /etc/systemd/system /lib/systemd/system 2>/dev/null | head -5 | sed 's/^/  /' || echo "  (没有)"

echo
echo "### 4. 这个 .so 属于哪个软件包（能查出来基本就说明是正规软件）"
if [ -e /usr/lib/libproc.so ]; then
  command -v dpkg >/dev/null 2>&1 && dpkg -S /usr/lib/libproc.so 2>&1 | sed 's/^/  /'
  echo "--- 文件详情 ---"
  stat /usr/lib/libproc.so 2>/dev/null | sed 's/^/  /'
  echo "--- 是不是符号链接 ---"
  readlink -f /usr/lib/libproc.so 2>/dev/null | sed 's/^/  → /'
  echo "--- 导出符号（看有没有劫持 readdir/open 之类）---"
  if command -v nm >/dev/null 2>&1; then
    nm -D /usr/lib/libproc.so 2>/dev/null | grep -iE ' (readdir|open|stat|lstat|read|write|socket|connect|bind|execve|unlink|rename)$' | head -20 | sed 's/^/    /'
  else
    echo "    (没装 binutils，跳过符号检查)"
  fi
  echo "--- 文件里的可疑字符串（矿池/IP/暗链）---"
  strings /usr/lib/libproc.so 2>/dev/null | grep -iE 'xmrig|miner|pool|stratum|http://|https://[0-9]|/var/tmp|/dev/shm|kinsing|kdevtmpfsi' | head -10 | sed 's/^/    /' || echo "    (没有可疑字符串)"
  echo "--- 文件修改时间 ---"
  ls -l --time-style=full-iso /usr/lib/libproc.so | sed 's/^/    /'
  echo "--- 是否被改动过（dpkg 校验）---"
  dpkg -V 2>/dev/null | grep -i libproc | sed 's/^/    /' || echo "    dpkg 校验无异常"
fi

echo
echo "### 5. chkrootkit 到底报了什么（43 条感染的明细）"
echo "--- 所有 INFECTED 行 ---"
chkrootkit 2>/dev/null | grep -i 'INFECTED' | head -25 | sed 's/^/  /'
echo "--- 所有 suspicious 行 ---"
chkrootkit 2>/dev/null | grep -i 'suspicious' | head -15 | sed 's/^/  /'

echo
echo "### 6. 区分真假：chkrootkit 的已知误报"
echo "  chkrootkit 在新系统上会把下面这些判为 INFECTED，均为误报："
echo "    · bindshell：端口 465/1149 等被 SMTP 之类占用"
echo "    · sniffer / Packet Sniffer：和网络接口名相关"
echo "    · /sbin/init、/usr/bin/expect 等：因文件属性变化"
echo "  真正的感染要看有没有具体的恶意文件路径，下面列出带路径的："
chkrootkit 2>/dev/null | grep -i 'INFECTED' | grep -E '/' | head -15 | sed 's/^/    /' || echo "    (没有带具体路径的感染项 = 都是误报)"

echo
echo "### 7. 内核层面的后门检查（比用户态更隐蔽）"
echo "--- 有没有异常的已加载模块 ---"
lsmod 2>/dev/null | wc -l | sed 's/^/  已加载模块数: /'
echo "--- 有没有非发行版自带的内核模块文件 ---"
find /lib/modules/$(uname -r) -name '*.ko*' -newer /etc/hostname 2>/dev/null | head -10 | sed 's/^/  ⚠️ /' || echo "  ✅ 没有近期新增的模块"

echo
echo "### 8. 关键系统命令是否被替换（对比 dpkg 校验）"
if command -v dpkg >/dev/null 2>&1; then
  echo "--- dpkg -V 报出的异常（非空说明有系统文件被改）---"
  dpkg -V 2>/dev/null | head -20 | sed 's/^/  /' || echo "  (无输出 = 系统文件都与软件包一致)"
  echo "  异常总数: $(dpkg -V 2>/dev/null | wc -l)"
else
  echo "  (没有 dpkg)"
fi

echo
echo "======================================================================"
echo " 判断要点："
echo "  · /etc/ld.so.preload 存在 + 指向可疑路径 = 几乎确定是 rootkit"
echo "  · 不存在该文件 + .so 属于正规软件包 = 误报"
echo "  · dpkg -V 有大量异常 = 系统文件被改，机器不可信"
echo "======================================================================"
