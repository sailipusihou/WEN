/**
 * backup-before-reinstall.cjs —— 重装系统前，把服务器上"不在 git 里"的东西全部拉回本地
 *
 * 为什么需要：重装（阿里云「更换操作系统」）会清空系统盘。而下列内容
 * 一旦清空就没了 —— 有的是**不在 git 里**，有的是**在 git 里但与线上版本不同**：
 *   · data/               SQLite 库 + 各 JSON 存储（订单/商品/客户/营销…）不在 git
 *   · public/uploads/     用户上传的图片与语音（.gitignore 明确排除）
 *   · public/ 其余部分     文件在 git 里，但服务器上可能有本地改动或新增文件，
 *                          只靠 `git clone` 会**静默**拿回原始版本（见下方 ITEMS 的注释）
 *   · .env.local          环境变量
 *   · nginx 站点配置       反代 + HTTPS 的站点定义
 *   · letsencrypt 证书     重新签发不难，但备份下来省事
 *
 * ⚠️ 这些东西来自一台**被 root 入侵过的机器**，所以：
 *    · 数据本身（订单/商品）照用，但其中所有凭据都必须视为已泄露 ——
 *      重装后要全部轮换（PayPal 密钥、SMTP 密码、各平台 OAuth token、后台密码）
 *    · 配置文件只作参考，**不要原样拷回新系统**，重装后重新配一遍更干净
 *
 * 用法：SSH_PASS='...' node scripts/deploy/backup-before-reinstall.cjs
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const HOST = process.env.SSH_HOST || '43.110.46.49'
const PORT = Number(process.env.SSH_PORT || 22)
const USER = process.env.SSH_USER || 'root'
const PASS = process.env.SSH_PASS

if (!PASS) { console.error('❌ 请先设置环境变量 SSH_PASS'); process.exit(1) }

const ROOT = path.join(__dirname, '..', '..')
// 注意：不要把 ISO 串直接切 15 位 —— 那会把毫秒前的 "." 一起带上，
// 目录名以点结尾在 Windows 上是非法的（fs 能写进去，但之后 spawnSync 的 cwd
// 会解析失败，表现为"解压失败但 stderr 是空的"）。用显式格式化避开。
const d = new Date()
const p2 = (n) => String(n).padStart(2, '0')
const STAMP = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`
const DEST = path.join(ROOT, '..', 'backups', `pre-reinstall-${STAMP}`)

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => resolve(conn)).on('error', reject)
    conn.connect({ host: HOST, port: PORT, username: USER, password: PASS, readyTimeout: 30000 })
  })
}
function exec(conn, command, timeout = 300000) {
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
/** 通道会丢包：重试到拿到预期标记为止 */
async function execUntil(conn, cmd, marker, attempts = 10, label = '') {
  for (let i = 1; i <= attempts; i++) {
    try { const o = await exec(conn, cmd); if (o.includes(marker)) return o } catch { /* 重试 */ }
    console.log(`    ${label} 第 ${i}/${attempts} 次未确认，重试…`)
    await new Promise(r => setTimeout(r, 5000))
  }
  return null
}

/**
 * 要备份的条目。
 *
 * 为什么 public/ 要整份打包，而不是只备份 uploads/：
 * uploads/ 是明确被 .gitignore 排除的，缺了它一眼就能看出来；
 * 但 public/ 的**其余部分**都已被 git 跟踪，重装后 `git clone` 会拿回一份
 * "看起来完整"的目录 —— 服务器上若有本地改动或服务器上新增的文件，
 * 就会**无声地**被原始版本盖掉，没有任何报错提示。
 * 整份打包的代价只是几 MB，换掉这个"静默丢失"的风险是值得的。
 *
 * 注意目前**没有**实测清单（上次那版注释里的具体文件名/数量未经验证，
 * 且其中"未跟踪"的说法与实际不符 —— 这些素材在 git 里是已跟踪的）。
 * 若要在重装前确认服务器上到底有哪些差异，先在服务器上跑：
 *   cd /var/www/lowflame && git status --short public/
 */
const ITEMS = [
  { name: 'data', remote: '/var/www/lowflame/data', tarball: 'bk-data.tar.gz' },
  { name: 'uploads', remote: '/var/www/lowflame/public/uploads', tarball: 'bk-uploads.tar.gz' },
  {
    name: 'public',
    remote: '/var/www/lowflame/public',
    tarball: 'bk-public.tar.gz',
    // 整份 public/ 但排除 uploads；用相对路径避免 GNU tar 把盘符当远程主机
    packCmd: `cd /var/www/lowflame && tar czf /root/bk-public.tar.gz --exclude='public/uploads' public`,
  },
  { name: 'nginx-config', remote: '/etc/nginx/sites-available/lowflame', tarball: 'bk-nginx.tar.gz' },
  {
    name: 'certs',
    remote: '/etc/letsencrypt/live/lowflame.store',
    tarball: 'bk-certs.tar.gz',
    // live/ 下是软链接，指向 ../../archive/ —— 必须 -h 解引用，
    // 否则备份里存的是一堆指向 archive 的相对链接，恢复后全是坏的。
    packCmd: `cd /etc/letsencrypt && tar czhf /root/bk-certs.tar.gz live/lowflame.store`,
  },
  { name: 'env', remote: '/var/www/lowflame/.env.local', tarball: 'bk-env.tar.gz' },
]

;(async () => {
  let conn = await connect()
  try {
    fs.mkdirSync(DEST, { recursive: true })
    console.log('本地备份目录:', DEST)
    console.log('')

    for (const it of ITEMS) {
      console.log(`### 备份 ${it.name}（${it.remote}）`)
      // 1) 服务器上打包（默认 -C 到父目录只打 basename；有自定义命令则用它）
      const parent = path.posix.dirname(it.remote)
      const base = path.posix.basename(it.remote)
      const packCmd = it.packCmd
        ? `rm -f /root/${it.tarball}; ${it.packCmd}`
        : `rm -f /root/${it.tarball}; tar czf /root/${it.tarball} -C '${parent}' '${base}' 2>/dev/null`
      const packed = await execUntil(
        conn,
        `${packCmd} && echo FINISHED && stat -c %s /root/${it.tarball}`,
        'FINISHED', 10, it.name
      )
      if (!packed) { console.log('  ✗ 服务器打包未确认，跳过\n'); continue }
      const size = Number((packed.match(/\n?(\d{4,})\s*$/) || [])[1] || 0)
      console.log(`  服务器上的包: ${(size / 1024).toFixed(0)} KB`)

      // 2) 下载
      const sftp = await new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))))
      const localTar = path.join(DEST, it.tarball)
      if (fs.existsSync(localTar)) fs.unlinkSync(localTar)
      await new Promise((res, rej) => sftp.fastGet(`/root/${it.tarball}`, localTar, {}, e => (e ? rej(e) : res())))
      const localSize = fs.statSync(localTar).size
      if (size && localSize !== size) { console.log(`  ✗ 大小不一致（本地 ${localSize} vs 远端 ${size}），跳过解压\n`); continue }
      console.log(`  已下载: ${(localSize / 1024).toFixed(0)} KB`)

      // 3) 本地解压
      const ex = spawnSync('tar', ['-xzf', path.basename(localTar), '-C', '.'], { cwd: DEST, encoding: 'utf8' })
      if (ex.status !== 0) { console.log('  ✗ 解压失败: ' + (ex.stderr || '').slice(-200) + '\n'); continue }
      fs.unlinkSync(localTar)
      console.log('  ✓ 已解压\n')
    }

    // ---------- 汇总 ----------
    console.log('='.repeat(66))
    console.log(' 备份完成:', DEST)
    const walk = (d, depth = 0) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name)
        if (e.isDirectory()) { console.log('  ' + '  '.repeat(depth) + e.name + '/'); if (depth < 2) walk(p, depth + 1) }
        else console.log('  ' + '  '.repeat(depth) + e.name + '  ' + (fs.statSync(p).size / 1024).toFixed(0) + ' KB')
      }
    }
    walk(DEST)

    console.log('')
    console.log('⚠️ 这些数据来自一台被 root 入侵过的机器，重装后必须：')
    console.log('   1. 轮换**所有**凭据（PayPal 密钥 / SMTP 密码 / 各平台 OAuth token / 后台管理员密码）')
    console.log('   2. 配置文件只作参考，别原样拷回去 —— 在新系统上重新配一遍更干净')
    console.log('   3. 恢复时只恢复 data/ + public/ + uploads/；nginx 配置与证书作参考重配')
    console.log('='.repeat(66))
  } finally {
    conn.end()
  }
})().catch(e => { console.error('❌ 失败:', e.message); process.exit(1) })
