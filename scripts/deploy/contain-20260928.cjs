/**
 * contain-20260928.cjs —— 应急止血：清除 2026-09-21 那轮入侵（矿机 + 后门账号 + 容器）
 *
 * ⚠️ 这不是"修好了"。root 级入侵下攻击者可以改任何东西，止血只是恢复可用 +
 *    切断自动回归路径。彻底的做法只有重装系统。
 *
 * 本轮与 9/16 那次的区别（所以上次的脚本没拦住）：
 *   9/16 清理后，攻击者于 **9/21 04:43** 再次进入，并且这次做了三件新事情：
 *     1. **把 PasswordAuthentication 重新改回 yes**（我 9/17 关掉的密码登录被打开）
 *     2. **建了一个 UID 0 的后门账号 `pakchoi`**（密码 Kermit123@，NOPASSWD sudo）
 *        + /etc/sudoers.d/99-pakchoi
 *     3. 用 **docker 容器** 跑矿机（alpine，容器名 sys-helper）
 *   持久化：crontab（每 30 分钟建号 + 起容器）、/root/.bashrc、/root/.profile、docker 重启策略
 *
 * 本轮的文件与进程：
 *   /tmp/.sysh/xmrig-6.25.0/xmrig          矿机   → 85.215.219.126:443
 *   /var/tmp/.font-unix/jajang_xex94       恶意二进制(8.3MB) → 141.94.250.96:14433
 *   /var/tmp/.font-unix/d1_7cb3pt_w1       守护(bash) ×3
 *   /var/tmp/.systemd-private/d2_4msa2b_w2 守护(bash)
 *   /var/tmp/.font-unix/.c                 xmrig 配置(JSON)
 *   docker 容器 sys-helper（alpine:3.19，内含挖矿脚本）
 *
 * 做法（顺序不能变）：
 *   1. 取证快照
 *   2. **先清持久化**（crontab / bashrc / profile / sudoers / sshd 配置）
 *      —— 不先做这步，杀了立刻复活
 *   3. 杀进程
 *   4. 删文件
 *   5. 删后门账号 + 容器
 *   6. 封 C2
 *   7. 复检
 *
 * 用法（本地）：SSH_KEY=私钥路径 node scripts/deploy/contain-20260928.cjs [--apply]
 */
const { Client } = require('ssh2')
const path = require('path')
const fs = require('fs')

const HOST = process.env.SSH_HOST || '43.110.46.49'
const PORT = Number(process.env.SSH_PORT || 22)
const USER = process.env.SSH_USER || 'root'
const PASS = process.env.SSH_PASS
const KEY = process.env.SSH_KEY
const APPLY = process.argv.includes('--apply')

if (!PASS && !KEY) { console.error('❌ 请设置 SSH_KEY（私钥路径）或 SSH_PASS（密码）'); process.exit(1) }
const AUTH = KEY ? { privateKey: fs.readFileSync(KEY) } : { password: PASS }

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => resolve(conn)).on('error', reject)
    conn.connect({ host: HOST, port: PORT, username: USER, ...AUTH, readyTimeout: 30000 })
  })
}

function exec(conn, command, timeout = 240000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('远端命令超时')), timeout)
    conn.exec(command, (err, ch) => {
      if (err) { clearTimeout(t); return reject(err) }
      let out = ''
      ch.on('data', d => { out += d.toString('utf8') })
      ch.stderr.on('data', d => { out += d.toString('utf8') })
      ch.on('close', () => { clearTimeout(t); resolve(out) })
    })
  })
}

// 恶意的规则字符串（从现场取证得到）
const CRON_JUNK = /(amco_[0-9a-f]+|pakchoi)/i
const SHELL_JUNK = /d1_7cb3pt_w1|d2_4msa2b_w2|font-unix|systemd-private\/d[0-9_]/i

;(async () => {
  const conn = await connect()
  try {
    // ────────── 1. 取证快照 ──────────
    console.log('===== 1. 取证快照 =====')
    const ev = await exec(conn, `
      echo "--- 时间 ---"; date
      echo "--- 负载 ---"; uptime
      echo "--- 恶意进程 ---"
      ps aux | grep -iE 'xmrig|jajang|d1_7cb3|d2_4msa2b|font-unix' | grep -v grep
      echo "--- 后门账号 ---"
      grep -E '^(pakchoi|root):' /etc/passwd
      echo "--- 恶意文件 ---"
      ls -la /var/tmp/.font-unix/ /tmp/.sysh/ 2>/dev/null
      echo "--- docker ---"
      docker ps -a --format '{{.ID}} {{.Image}} {{.Names}} {{.Status}}' 2>/dev/null
      echo "--- crontab ---"
      crontab -l 2>/dev/null | grep -vE '^#' | tail -8
      echo "--- sshd 密码登录状态 ---"
      sshd -T 2>/dev/null | grep -iE '^(passwordauthentication|permitrootlogin)'
    `, 120000)
    console.log(ev.replace(/^/gm, '  '))
    const snap = '/root/incident-20260928-' + Date.now() + '.txt'
    await exec(conn, `cat > ${snap} <<'EVEOF'\n${ev}\nEVEOF\nls -la ${snap}`)
    console.log('  现场快照已存: ' + snap)

    if (!APPLY) { console.log('\n[dry run] 加 --apply 才动手'); return }

    // ────────── 2. 先清持久化（顺序关键）──────────
    console.log('\n===== 2. 清持久化 =====')
    const persist = await exec(conn, `
      set +e
      cp -a /root/.bashrc /root/bashrc.bak-$(date +%s) 2>/dev/null
      cp -a /root/.profile /root/profile.bak-$(date +%s) 2>/dev/null
      cp -a /etc/ssh/sshd_config.d/99-hardening.conf /root/99-hardening.conf.bak-$(date +%s) 2>/dev/null

      # 2a. crontab：删掉恶意行（保留 watchdog）
      crontab -l 2>/dev/null | grep -vE 'amco_|pakchoi' | crontab -
      echo "  crontab 清理后:"; crontab -l 2>/dev/null | sed 's/^/    /'

      # 2b. bashrc / profile：删掉带恶意标记的行
      sed -i '/d1_7cb3pt_w1/d;/d2_4msa2b_w2/d;/font-unix/d' /root/.bashrc /root/.profile 2>/dev/null
      echo "  bashrc 尾部:"; tail -3 /root/.bashrc | sed 's/^/    /'
      echo "  profile 尾部:"; tail -3 /root/.profile | sed 's/^/    /'

      # 2c. sudoers 后门
      rm -f /etc/sudoers.d/99-pakchoi
      echo "  sudoers.d:"; ls /etc/sudoers.d/ | sed 's/^/    /'

      # 2d. **把密码登录重新关掉**（攻击者改回来的）
      sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config.d/99-hardening.conf
      grep -q '^PasswordAuthentication' /etc/ssh/sshd_config.d/99-hardening.conf || echo 'PasswordAuthentication no' >> /etc/ssh/sshd_config.d/99-hardening.conf
      # 主配置里那两行 PermitRootLogin/PasswordAuthentication 也要压掉，否则 drop-in 之外还有来源
      sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
      echo "  sshd 修正后:"; sshd -T 2>/dev/null | grep -iE '^(passwordauthentication|permitrootlogin)' | sed 's/^/    /'
    `)
    console.log(persist.replace(/^/gm, '  '))

    // ────── 2.5 拆掉真正的重生源（systemd 单元 + docker 重启策略）──────
    // ⚠️ 这一步是这次排查的关键：只清 crontab/bashrc 是拦不住的，
    //    真正把它反复拉起来的是 ——
    //      /etc/systemd/system/sys-health.timer + .service（每 30 分钟 docker start）
    //      /root/.config/systemd/user/sv-zsbf2jez.service（Restart=always, RestartSec=1）
    //      docker 容器 sys-helper（RestartPolicy=unless-stopped）
    console.log('\n===== 2.5 拆重生源（systemd / docker）=====')
    const respawn = await exec(conn, `
      set +e
      echo "  --- 恶意 systemd 单元内容 ---"
      cat /etc/systemd/system/sys-health.service 2>/dev/null | sed 's/^/    /'
      cat /etc/systemd/system/sys-health.timer 2>/dev/null | sed 's/^/    /'
      cat /root/.config/systemd/user/sv-zsbf2jez.service 2>/dev/null | sed 's/^/    /'

      systemctl disable --now sys-health.timer 2>&1 | tail -1
      systemctl disable --now sys-health.service 2>&1 | tail -1
      rm -f /etc/systemd/system/sys-health.service /etc/systemd/system/sys-health.timer
      rm -f /etc/systemd/system/timers.target.wants/sys-health.timer
      systemctl daemon-reload; systemctl reset-failed
      rm -rf /root/.config/systemd/user
      echo -n "  sys-health 残留: "; ls /etc/systemd/system/ | grep -c sys-health
      echo -n "  用户单元残留: "; ls /root/.config/systemd/user/ 2>/dev/null | wc -l

      echo "  --- docker ---"
      docker update --restart=no sys-helper 2>&1 | tail -1
      docker rm -f sys-helper 2>&1 | tail -1
      echo -n "  剩余容器: "; docker ps -a -q 2>/dev/null | wc -l
      docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -i alpine | while read i; do docker rmi -f "$i" 2>&1 | tail -1; done
    `)
    console.log(respawn.replace(/^/gm, '  '))

    // ────────── 3. 杀进程 ──────────
    console.log('\n===== 3. 杀进程 =====')
    const kill = await exec(conn, `
      set +e
      # ⚠️ 千万不要写 'pkill -9 -u pakchoi' —— pakchoi 的 UID 是 0，
      #    按用户名匹配会解析成 UID 0，等于把所有 root 进程（sshd/nginx/应用）
      #    一起杀掉。实测把 nginx 打死了且 systemd 不会自动拉起。
      #    按**路径**杀就够，账号用 userdel 处理。
      chattr -R -i /var/tmp/.font-unix /var/tmp/.systemd-private 2>/dev/null
      pkill -9 -f '/var/tmp/.font-unix' 2>/dev/null
      pkill -9 -f '/var/tmp/.systemd-private' 2>/dev/null
      pkill -9 -f 'jajang' 2>/dev/null
      pkill -9 -f 'xmrig' 2>/dev/null
      pkill -9 -f '/tmp/.sysh' 2>/dev/null
      pkill -9 -f 'sv-zsbf2jez' 2>/dev/null
      sleep 3
      echo "  残留进程:"; ps aux | grep -iE 'xmrig|jajang|d1_7cb3|d2_4msa2b|font-unix' | grep -v grep || echo "    (无)"
    `)
    console.log(kill.replace(/^/gm, '  '))

    // ────────── 4. 删文件 ──────────
    console.log('\n===== 4. 删文件 =====')
    const rm = await exec(conn, `
      set +e
      chattr -i /var/tmp/.font-unix/* 2>/dev/null
      rm -rf /var/tmp/.font-unix /var/tmp/.systemd-private /tmp/.sysh
      echo "  /var/tmp 剩余:"; ls -la /var/tmp/ | grep -vE 'cloud-init|systemd-private-|aliyun|^total|^d.*\s\.\.?$' | sed 's/^/    /'
      echo "  /tmp/.sysh 是否还在:"; [ -e /tmp/.sysh ] && echo "    ⚠️ 还在" || echo "    ✅ 已删"
    `)
    console.log(rm.replace(/^/gm, '  '))

    // ────────── 5. 删后门账号 + 容器 ──────────
    console.log('\n===== 5. 删后门账号与容器 =====')
    const acc = await exec(conn, `
      set +e
      # pakchoi 的 UID 是 0，userdel 会以 "used by process 1" 为由拒绝
      # （所有 root 进程都算在用它），所以先 -f，失败再手工清条目
      userdel -f -r pakchoi 2>&1 | sed 's/^/    /'
      if id pakchoi >/dev/null 2>&1; then
        cp -a /etc/passwd /root/passwd.bak-$(date +%s)
        cp -a /etc/shadow /root/shadow.bak-$(date +%s)
        cp -a /etc/group  /root/group.bak-$(date +%s)
        sed -i '/^pakchoi:/d' /etc/passwd /etc/shadow
        sed -i 's/^\\\\([^:]*:[^:]*:[^:]*:\\\\)pakchoi,\\\\?/\\\\1/' /etc/group
        sed -i 's/,pakchoi\\\\b//g' /etc/group
        sed -i '/^pakchoi:/d' /etc/group
        rm -rf /home/pakchoi /var/mail/pakchoi
      fi
      groupdel pakchoi 2>/dev/null
      echo -n "  pakchoi 是否还在: "; id pakchoi >/dev/null 2>&1 && echo "⚠️ 还在" || echo "✅ 已删除"
      echo "  剩余的 UID 0 账号:"; awk -F: '$3==0 {print "    "$1}' /etc/passwd
      echo "  可登录账号:"; awk -F: '$7 !~ /nologin|false|sync|shutdown|halt/ {print "    "$1}' /etc/passwd

      echo "  --- docker ---"
      docker rm -f sys-helper 2>&1 | tail -2 | sed 's/^/    /'
      docker ps -a --format '{{.Names}}' 2>/dev/null | sed 's/^/    剩余容器: /'
      docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -i alpine | while read i; do docker rmi -f "$i" 2>&1 | tail -1 | sed 's/^/    /'; done
    `)
    console.log(acc.replace(/^/gm, '  '))

    // ────────── 6. 封 C2 ──────────
    console.log('\n===== 6. 封 C2 =====')
    const c2 = await exec(conn, `
      set +e
      for ip in 85.215.219.126 141.94.250.96; do
        iptables -C OUTPUT -d $ip -j DROP 2>/dev/null || iptables -I OUTPUT -d $ip -j DROP
        iptables -C INPUT -s $ip -j DROP 2>/dev/null || iptables -I INPUT -s $ip -j DROP
        echo "  已封: $ip"
      done
      iptables -L OUTPUT -n --line-numbers | grep -E 'DROP' | head -5 | sed 's/^/    /'
    `)
    console.log(c2.replace(/^/gm, '  '))

    // ────────── 7. 复检 ──────────
    console.log('\n===== 7. 复检 =====')
    const verify = await exec(conn, `
      sleep 3
      echo "  负载:"; uptime | sed 's/^/    /'
      echo "  CPU 前 5:"; ps aux --sort=-%cpu | head -6 | awk '{printf "    %-8s %5s%% %s\n", $1, $3, substr($0, index($0,$11), 60)}'
      echo "  恶意进程:"; ps aux | grep -iE 'xmrig|jajang|d1_7cb3|d2_4msa2b' | grep -v grep || echo "    ✅ 无"
      echo "  密码登录:"; sshd -T 2>/dev/null | grep -i '^passwordauthentication' | sed 's/^/    /'
      echo "  站点:"; curl -s -o /dev/null -w "    localhost:3000 → HTTP %{http_code}\n" -m 20 http://localhost:3000/
      echo "  外连:"; ss -tnp state established 2>/dev/null | grep -vE '127.0.0.1|::1|100.100' | head -5 | sed 's/^/    /'
    `, 120000)
    console.log(verify.replace(/^/gm, '  '))

    console.log('\n===== 完成 =====')
  } finally {
    conn.end()
  }
})().catch(e => { console.error('❌ 失败:', e.message); process.exit(1) })
