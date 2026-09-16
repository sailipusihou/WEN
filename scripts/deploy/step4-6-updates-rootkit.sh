#!/bin/bash
# step4-6-updates-rootkit.sh —— 安全加固 第 4+6 步
#   第 4 步：自动安全更新（unattended-upgrades）—— 系统漏洞自动打补丁
#   第 6 步：rootkit / 后门扫描（rkhunter + chkrootkit）—— 查有没有别的残留
#
# 风险：低。自动更新只装「安全更新」，且配置为不自动重启。
#      扫描是只读操作。

set +e

echo "======================================================================"
echo " 第 4 步：自动安全更新  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 1. 安装 unattended-upgrades"
DEBIAN_FRONTEND=noninteractive apt-get -y -qq install unattended-upgrades apt-listchanges 2>&1 | tail -3
command -v unattended-upgrade >/dev/null 2>&1 && echo "  ✅ 已安装" || echo "  ⚠️ 安装可能失败"

echo
echo "### 2. 写配置 /etc/apt/apt.conf.d/20auto-upgrades"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
// 每天自动更新软件包列表并安装安全更新（由加固脚本生成）
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
echo "  ✅ 已写入"

echo
echo "### 3. 写配置 /etc/apt/apt.conf.d/51-lowflame-unattended"
cat > /etc/apt/apt.conf.d/51-lowflame-unattended <<'EOF'
// 只装安全更新，不自动重启（这台机器跑着生产站点，重启要人工确认）
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
// 不自动移除软件包，避免误删依赖
Unattended-Upgrade::Remove-Unused-Dependencies "false";
// 不自动重启
Unattended-Upgrade::Automatic-Reboot "false";
// 需要重启时写进这个文件，方便之后查看
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";
EOF
echo "  ✅ 已写入"

echo
echo "### 4. 启用并启动相关定时器"
systemctl enable unattended-upgrades >/dev/null 2>&1
systemctl restart unattended-upgrades 2>/dev/null
systemctl enable apt-daily.timer apt-daily-upgrade.timer >/dev/null 2>&1
sleep 3
echo -n "  unattended-upgrades 服务: "; systemctl is-active unattended-upgrades
echo -n "  apt-daily.timer: "; systemctl is-active apt-daily.timer
echo -n "  apt-daily-upgrade.timer: "; systemctl is-active apt-daily-upgrade.timer

echo
echo "### 5. 试运行一次（--dry-run，只看会不会出错，不实际安装）"
unattended-upgrade --dry-run --debug 2>&1 | grep -iE 'allowed origins|checking|no packages|packages that will be upgraded|error' | head -12 | sed 's/^/    /'

echo
echo "### 6. 待安装的安全更新数量"
apt-get -s upgrade 2>/dev/null | grep -c '^Inst.*security' | sed 's/^/  安全更新待装: /'

echo
echo "======================================================================"
echo " 第 6 步：rootkit / 后门扫描  $(date '+%F %T')"
echo "======================================================================"

echo
echo "### 7. 安装扫描工具"
DEBIAN_FRONTEND=noninteractive apt-get -y -qq install rkhunter chkrootkit 2>&1 | tail -3
echo -n "  rkhunter: "; command -v rkhunter >/dev/null 2>&1 && rkhunter --version 2>/dev/null | head -1 || echo "未安装"
echo -n "  chkrootkit: "; command -v chkrootkit >/dev/null 2>&1 && echo "已安装" || echo "未安装"

echo
echo "### 8. 扫描前先检查我们已知的可疑位置是否已清干净"
echo "  --- 上次清理的路径 ---"
for p in /var/tmp/.c /root/.cache/.cache_88 /root/.local/share/.cache_s /root/.local/share/.cache_o /root/.local/share/.cache_ml /root/.local/share/.cache_; do
  if [ -e "$p" ]; then echo "    ⚠️ 仍存在: $p"; else echo "    ✅ 已清除: $p"; fi
done
echo "  --- 已知矿机家族特征文件 ---"
find / -xdev \( -name 'kdevtmpfsi' -o -name 'kinsing' -o -name 'xmrig' -o -name '.kthreaddi' \) -not -path '*/proc/*' 2>/dev/null | head -5 | sed 's/^/    ⚠️ /' || true
echo "    (以上为空 = 没发现)"

echo
echo "### 9. chkrootkit 扫描（约 1-2 分钟）"
chkrootkit 2>/dev/null | grep -iE 'INFECTED|Vulnerable|suspicious' | head -20 | sed 's/^/    /'
echo "  --- chkrootkit 结果统计 ---"
chkrootkit 2>/dev/null | grep -c 'not infected' | sed 's/^/    检查项正常: /'
chkrootkit 2>/dev/null | grep -ciE 'INFECTED' | sed 's/^/    ⚠️ 感染项: /'

echo
echo "### 10. 更新 rkhunter 基准数据库"
echo "  （说明：以当前状态为基准。我们已经清了已知木马，所以这一步是必要的前提）"
rkhunter --propupd --nocolors 2>&1 | tail -3 | sed 's/^/    /'

echo
echo "### 11. rkhunter 扫描（约 2-3 分钟）"
rkhunter --check --sk --nocolors --rwo 2>&1 | head -50 | sed 's/^/    /'
echo "  --- rkhunter 警告数量 ---"
rkhunter --check --sk --nocolors 2>/dev/null | grep -c 'Warning' | sed 's/^/    /'

echo
echo "### 12. 检查系统里还有没有可疑的定时任务/服务"
echo "  --- 所有用户 crontab ---"
for u in $(cut -d: -f1 /etc/passwd); do
  c=$(crontab -l -u "$u" 2>/dev/null)
  [ -n "$c" ] && echo "    [$u]" && echo "$c" | sed 's/^/      /'
done
echo "  --- /etc/cron.d ---"
ls /etc/cron.d/ | sed 's/^/    /'
echo "  --- 所有 enabled 的 systemd 服务（找可疑名字）---"
systemctl list-unit-files --state=enabled --no-pager 2>/dev/null | grep -viE 'systemd|network|ssh|nginx|cron|ufw|fail2ban|snap|docker|pm2|unattended|apt|rsyslog|multipath|open-vm|chrony|cloud|serial|getty|apparmor|lvm|mdadm|blk|e2scrub|dmesg|kmod|proc|sys|udev|user@|rsync|aegis|aliyun|ilogtail|containerd' | head -20 | sed 's/^/    /'

echo
echo "### 13. 检查可疑的内核模块"
lsmod 2>/dev/null | awk 'NR>1 {print $1}' | grep -viE 'nf_|xt_|ip_|iptable|bridge|overlay|br_netfilter|veth|xfs|ext4|virtio|scsi|ahci|libata|sr_mod|cdrom|sd_mod|usb|hid|input|evdev|i2c|drm|fb|button|acpi|thermal|processor|cpufreq|kvm|irq|tcp|udp|netfilter|unix|ipv6|binfmt|loop|dm_|md_mod|raid|crc|zlib|lzo|nls|fscrypto|jbd2|mbcache|autofs4|fuse|configfs|crypto|aes|ghash|sha|ecb|cbc|cts|rng|random|tpm|efi|firmware|efivars|nvme|virtio' | head -15 | sed 's/^/    /'
echo "    (以上为空的项 = 没有异常模块)"

echo
echo "### 14. 最终状态确认"
echo -n "  nginx: "; systemctl is-active nginx
echo -n "  fail2ban: "; systemctl is-active fail2ban
echo -n "  ufw: "; ufw status | head -1
echo -n "  站点: "; curl -s -o /dev/null -w "HTTP %{http_code}\n" -m 10 http://localhost:3000/
echo "  封禁 IP 数:"; fail2ban-client status sshd 2>/dev/null | grep -i 'currently banned' | sed 's/^/    /'

echo
echo "======================================================================"
echo " 第 4 + 6 步完成"
echo "======================================================================"
