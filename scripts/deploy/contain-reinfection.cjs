/**
 * contain-reinfection.cjs —— 应急止血：清除 2026-09-16 16:26 这一轮的重新感染
 *
 * ⚠️ 这不是"修好了"。root 级入侵下攻击者可以改任何东西，止血只是让机器
 *    恢复可用、并切断攻击者的自动回归路径。彻底的做法只有重装系统。
 *
 * 本轮与 9/15 那次的区别（所以上次的清理脚本没拦住）：
 *   攻击者换了新的目录名与进程名，上次清的是
 *     /var/tmp/.c、.cache_88、.cache_s、.cache_o、.cache_ml
 *   这次是
 *     /root/.cache/.cache_kf            矿机（进程名 引擎认证日志缓存日志系统_d）
 *     /root/.local/share/.cache_ev8x    守护 wd_z1
 *     /root/.local/share/.cache_uy      更早一代的守护 wd_4
 *   持久化：crontab（每分钟 + @reboot，两代各一组）、/root/.bashrc、/root/.profile
 *
 * 做法（顺序不能变）：
 *   1. 先取证（进程、crontab、文件清单）
 *   2. 清持久化（crontab / bashrc / profile）—— 必须先做，否则杀了立刻复活
 *   3. 杀进程
 *   4. 删目录
 *   5. 封 C2
 *   6. 复检 + 看站点是否恢复
 *
 * 用法（本地）：SSH_PASS='...' node scripts/deploy/contain-reinfection.cjs [--apply]
 */
const { Client } = require('ssh2')
const path = require('path')
const fs = require('fs')

const HOST = process.env.SSH_HOST || '43.110.46.49'
const PORT = Number(process.env.SSH_PORT || 22)
const USER = process.env.SSH_USER || 'root'
const PASS = process.env.SSH_PASS
/** 私钥路径。设了就用密钥认证（推荐），否则回退到密码。 */
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

function exec(conn, command, timeout = 180000) {
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

/** 通道会丢包：同一条命令可能根本没送达 —— 重试到拿到预期标记为止 */
async function execUntil(conn, cmd, marker, attempts = 10, label = '') {
  for (let i = 1; i <= attempts; i++) {
    try {
      const out = await exec(conn, cmd)
      if (out.includes(marker)) return out
    } catch { /* 忽略，重试 */ }
    console.log(`    ${label} 第 ${i}/${attempts} 次未确认，重试…`)
    await new Promise(r => setTimeout(r, 5000))
  }
  return null
}

// ---------- 攻击者特征（本轮 2026-09-16） ----------
// 矿机 / 守护（进程名伪装成中文"系统进程"）
const MINER_PROC = '引擎认证日志缓存日志系统_d'
const WD_PROC_OLD = '守护维护引擎进程认证进程网络引擎网络_dj'
// 另外两个：有真实可执行文件，却把进程名伪装成内核线程（[kcached] / [mm_percpu_wq]），
// 不属于任何 dpkg 包，时间戳伪造为 2014-01-16 —— 典型的隐匿手法
const FAKE_KERNEL_PROCS = ['kcached', 'mm_percpu_wq']

const MALWARE_DIRS = [
  '/root/.cache/.cache_kf',                 // 矿机二进制(8.3MB) + config.json
  '/root/.local/share/.cache_ev8x',         // 守护 wd_z1
  '/root/.local/share/.cache_uy',           // 更早一代守护（crontab 里还留着指向它的死条目）
]
const MALWARE_FILES = [
  '/usr/bin/gs-dbus',                       // 伪装成 [kcached]
  '/usr/bin/defunct',                       // 伪装成 [mm_percpu_wq]
]
// 矿池 / 下载源 / C2
const C2_IPS = ['107.167.92.130', '212.132.98.170', '217.154.53.187']
const BLOCK_HOSTS = ['pool.supportxmr.com', 'raw.githubusercontent.com']

/** 攻击者条目的匹配特征（crontab 与 shell 脚本共用） */
const EVIL_PATTERN = `${MINER_PROC}|${WD_PROC_OLD}|cache_kf|cache_ev8x|cache_uy|wd_z1|wd_4|mk_|gs-dbus|defunct|kcached|mm_percpu_wq`

/** 清 crontab：只删含攻击者特征的条目，保留用户自己的备份任务 */
const CLEAN_CRON = `
TMP=$(mktemp)
crontab -l 2>/dev/null | grep -vE '${EVIL_PATTERN}' > "$TMP"
crontab "$TMP"
rm -f "$TMP"
echo "--- 清理后的 crontab ---"
crontab -l 2>/dev/null
`

/** 清 shell 启动脚本：按特征过滤掉攻击者追加的行 */
const CLEAN_SHELL = `
for f in /root/.bashrc /root/.profile; do
  [ -f "$f" ] || continue
  cp -a "$f" "\${f}.infected-\\$(date +%Y%m%d-%H%M%S)"
  grep -vE '${EVIL_PATTERN}' "$f" > "\${f}.clean"
  mv "\${f}.clean" "$f"
  chmod 644 "$f"
done
echo "--- .bashrc 尾部 ---"
tail -3 /root/.bashrc 2>/dev/null
echo "--- .profile 尾部 ---"
tail -3 /root/.profile 2>/dev/null
`

;(async () => {
  let conn = await connect()
  try {
    console.log('='.repeat(70))
    console.log(' 应急止血：清除 2026-09-16 这一轮重新感染')
    console.log('='.repeat(70))

    // ---------- 1. 取证 ----------
    console.log('\n### 1. 取证（只读）')
    const ev = await execUntil(conn, `
      echo "=== 恶意进程 ==="
      ps -eo pid,ppid,pcpu,etime,args | grep -E '${MINER_PROC}|${WD_PROC_OLD}|wd_z1|wd_4' | grep -v grep
      for pid in $(ls /proc | grep -E '^[0-9]+$'); do
        exe=$(readlink /proc/$pid/exe 2>/dev/null)
        case "$exe" in
          /usr/bin/gs-dbus|/usr/bin/defunct) echo "  $pid  $exe  (伪装成内核线程: $(tr '\\0' ' ' < /proc/$pid/cmdline))";;
        esac
      done
      echo "=== 未清理的 crontab ==="
      crontab -l 2>/dev/null
      echo "=== 恶意目录 ==="
      ls -la ${MALWARE_DIRS.join(' ')} 2>&1 | head -20
      echo "=== 恶意可执行文件 ==="
      ls -la ${MALWARE_FILES.join(' ')} 2>&1
      echo "=== 矿机配置(矿池/钱包) ==="
      grep -oE '"url":"[^"]*"|"user":"[^"]{0,20}' /root/.cache/.cache_kf/config.json 2>/dev/null | head -4
      echo "=== 对外连接 ==="
      ss -tnp 2>/dev/null | grep -vE '127.0.0.1|::1'
    `, '=== 对外连接 ===', 10, '取证')
    if (ev) fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'backups', `reinfection-evidence-${Date.now()}.txt`), ev, 'utf8')
    console.log(ev || '  ⚠️ 取证未取到（通道不稳）')

    if (!APPLY) { console.log('\n只报告模式，加 --apply 执行清理'); return }

    // ---------- 2. 先清持久化（顺序关键：否则杀了立刻复活） ----------
    console.log('\n### 2. 清 crontab')
    const c = await execUntil(conn, CLEAN_CRON, '清理后的 crontab', 10, 'crontab')
    console.log(c || '  ⚠️ 未确认')

    console.log('\n### 3. 清 shell 启动脚本')
    const s = await execUntil(conn, CLEAN_SHELL, '.profile 尾部', 10, 'shell')
    console.log(s || '  ⚠️ 未确认')

    // ---------- 4. 杀进程 ----------
    // 顺序关键：**先杀守护再杀矿机**。守护是个死循环脚本，发现二进制没了会
    // 立刻从攻击者的 GitHub 仓库重新下载（实测 wd_z1 里就写着下载地址）。
    console.log('\n### 4. 杀进程（先守护、后矿机、最后两个伪装进程）')
    const k = await execUntil(conn, `
      pkill -9 -f 'wd_z1' 2>/dev/null
      pkill -9 -f 'cache_ev8x' 2>/dev/null
      pkill -9 -f 'wd_4' 2>/dev/null
      pkill -9 -f '${WD_PROC_OLD}' 2>/dev/null
      sleep 1
      pkill -9 -f '${MINER_PROC}' 2>/dev/null
      pkill -9 -f 'cache_kf' 2>/dev/null
      sleep 1
      # 两个伪装成内核线程的：按可执行文件路径杀，别按进程名（名字是 [kcached] 这种）
      for pid in $(ls /proc | grep -E '^[0-9]+$'); do
        exe=$(readlink /proc/$pid/exe 2>/dev/null)
        case "$exe" in
          /usr/bin/gs-dbus|/usr/bin/defunct) kill -9 "$pid" 2>/dev/null && echo "  killed $pid ($exe)";;
        esac
      done
      sleep 2
      echo "--- 残留检查 ---"
      ps -eo pid,pcpu,args | grep -E '${MINER_PROC}|${WD_PROC_OLD}|wd_z1|wd_4|kcached|mm_percpu_wq' | grep -v grep || echo "(已无恶意进程)"
      echo "--- CPU top（矿机消失后负载应立刻降下来）---"
      ps -eo pid,pcpu,args --sort=-pcpu | head -5
      uptime
    `, 'CPU top', 12, '杀进程')
    console.log(k || '  ⚠️ 未确认')

    // ---------- 5. 删文件 ----------
    console.log('\n### 5. 删恶意文件')
    await execUntil(conn, `
      rm -rf ${MALWARE_DIRS.join(' ')}
      rm -f ${MALWARE_FILES.join(' ')}
      echo "REMDONE"
      echo "--- 残留检查 ---"
      ls -d ${MALWARE_DIRS.join(' ')} ${MALWARE_FILES.join(' ')} 2>&1 | head -6
    `, 'REMDONE', 12, '删文件')

    // ---------- 6. 封矿池 / 下载源 / C2 ----------
    console.log('\n### 6. 封矿池、下载源与 C2')
    await execUntil(conn, `
      ${C2_IPS.map(ip => `iptables -C OUTPUT -d ${ip} -j DROP 2>/dev/null || iptables -A OUTPUT -d ${ip} -j DROP 2>/dev/null`).join('\n      ')}
      ${BLOCK_HOSTS.map(h => `grep -q '${h}' /etc/hosts || echo "0.0.0.0 ${h}" >> /etc/hosts`).join('\n      ')}
      echo "--- iptables OUTPUT ---"
      iptables -L OUTPUT -n | head -12
      echo "--- /etc/hosts 尾部 ---"
      tail -4 /etc/hosts
    `, 'iptables OUTPUT', 12, '封禁')

    // ---------- 7. 复检 ----------
    console.log('\n### 7. 复检')
    const v = await execUntil(conn, `
      echo "=== crontab（应只剩你的备份任务）==="
      crontab -l 2>/dev/null
      echo "=== 残留恶意进程（应为空）==="
      ps -eo pid,args | grep -E '${MINER_PROC}|${WD_PROC_OLD}|wd_z1|wd_4' | grep -v grep || echo "(无)"
      for pid in $(ls /proc | grep -E '^[0-9]+$'); do
        exe=$(readlink /proc/$pid/exe 2>/dev/null)
        case "$exe" in /usr/bin/gs-dbus|/usr/bin/defunct) echo "  ⚠️ 仍在: $pid $exe";; esac
      done
      echo "=== 负载与内存（负载应明显下降）==="
      uptime; free -m | head -2
      echo "=== 站点 ==="
      curl -s -o /dev/null -w "localhost:3000 → %{http_code} %{time_total}s\\n" -m 20 http://localhost:3000/
      echo "=== 残留文件（应为空）==="
      ls -d ${MALWARE_DIRS.join(' ')} ${MALWARE_FILES.join(' ')} 2>&1 | head -6
    `, '残留文件', 14, '复检')
    console.log(v || '  ⚠️ 复检未取到')

    console.log('\n' + '='.repeat(70))
    console.log(' 止血完成。')
    console.log('')
    console.log(' ⚠️ 这台机器仍然是「被 root 入侵」状态，止血 ≠ 修好。')
    console.log('    攻击者用了一套新路径绕过了 9/15 那次的清理 —— 说明')
    console.log('    只要机器还在跑，他随时能再放一套新的进来。')
    console.log('    唯一彻底的做法是重装系统（详见交接文档的安全事件记录）。')
    console.log('='.repeat(70))
  } finally {
    conn.end()
  }
})().catch(e => { console.error('❌ 失败:', e.message); process.exit(1) })
