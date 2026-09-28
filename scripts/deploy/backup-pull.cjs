/**
 * backup-pull.cjs —— 把服务器上的每日备份拉回本地电脑
 *
 * 为什么需要：`backup-daily.sh` 备份在**服务器本地**，防的是误删/误改/删库，
 * **防不了磁盘整块坏掉或实例被释放**（你的实例 2026-10-11 到期）。
 * 真正的"异地"备份得落在另一台机器上 —— 也就是你这台电脑。
 *
 * 用法（本地）：
 *   node scripts/deploy/backup-pull.cjs
 *
 * 产物：D:/2026-06-20/backups/server-daily/<时间戳>/{data,uploads}-<日期>.tar.gz
 *
 * 建议：定期跑一次（比如每周）。想要真正的"自动"，可以在 Windows
 *       任务计划程序里加一条每周运行上面这条命令。
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')

const HOST = process.env.SSH_HOST || '43.110.46.49'
const PORT = Number(process.env.SSH_PORT || 22)
const USER = process.env.SSH_USER || 'root'
const PASS = process.env.SSH_PASS
const KEY = process.env.SSH_KEY
const REMOTE_DIR = '/root/backups/daily'

if (!PASS && !KEY) { console.error('❌ 请设置 SSH_KEY（私钥路径）或 SSH_PASS（密码）'); process.exit(1) }
const AUTH = KEY ? { privateKey: fs.readFileSync(KEY) } : { password: PASS }

const ROOT = path.join(__dirname, '..', '..')
const d = new Date(), p2 = (n) => String(n).padStart(2, '0')
const STAMP = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`
const DEST = path.join(ROOT, '..', 'backups', 'server-daily', STAMP)

const connect = () => new Promise((res, rej) => {
  const c = new Client()
  c.on('ready', () => res(c)).on('error', rej)
  c.connect({ host: HOST, port: PORT, username: USER, ...AUTH, readyTimeout: 30000 })
})
const exec = (c, cmd, timeout = 120000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('远端命令超时')), timeout)
  c.exec(cmd, (e, ch) => {
    if (e) { clearTimeout(t); return rej(e) }
    let o = ''
    ch.on('data', (x) => (o += x)); ch.on('stderr', (x) => (o += x))
    ch.on('close', () => { clearTimeout(t); res(o) })
  })
})

;(async () => {
  const c = await connect()
  try {
    fs.mkdirSync(DEST, { recursive: true })
    console.log('本地目录:', DEST)

    // 列出服务器上最近的一份 data / uploads 备份
    const listing = await exec(c,
      `ls -1t ${REMOTE_DIR}/data-*.tar.gz 2>/dev/null | head -1; ` +
      `ls -1t ${REMOTE_DIR}/uploads-*.tar.gz 2>/dev/null | head -1`
    )
    const files = listing.split('\n').map((s) => s.trim()).filter(Boolean)
    if (files.length === 0) {
      console.log('❌ 服务器上没有找到每日备份 —— 先确认 backup-daily.sh 的 cron 跑过没有')
      process.exit(1)
    }

    const sftp = await new Promise((res, rej) => c.sftp((e, s) => (e ? rej(e) : res(s))))
    let ok = 0
    for (const remote of files) {
      const name = path.basename(remote)
      const local = path.join(DEST, name)
      // 远端大小（用于下载后校验，通道会丢包）
      const sizeOut = await exec(c, `stat -c %s '${remote}' 2>/dev/null || echo 0`)
      const size = Number(sizeOut.trim()) || 0
      if (!size) { console.log(`  ✗ ${name}: 取不到大小，跳过`); continue }

      let got = false
      for (let i = 1; i <= 5 && !got; i++) {
        if (fs.existsSync(local)) fs.unlinkSync(local)
        await new Promise((res) => sftp.fastGet(remote, local, {}, () => res()))
        const ls = fs.existsSync(local) ? fs.statSync(local).size : 0
        if (ls === size) { got = true; console.log(`  ✅ ${name}  ${(size / 1024).toFixed(0)} KB`) }
        else console.log(`  ⚠️ ${name} 第 ${i} 次不完整（${ls}/${size}），重试`)
      }
      if (!got) console.log(`  ✗ ${name}: 5 次都没传完`)
      else ok++
    }

    console.log(`\n完成：${ok}/${files.length} 个文件`)
    console.log('提示：这是"异地"副本，防的是服务器磁盘整块坏掉。建议定期跑一次。')
    if (ok < files.length) process.exit(1)
  } finally {
    c.end()
  }
})().catch((e) => { console.error('❌ 失败:', e.message); process.exit(1) })
