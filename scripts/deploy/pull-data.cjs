/**
 * pull-data.cjs —— 把**线上**的 data/ 拉到本地，让本地与生产一致
 *
 * 为什么需要：
 *   部署只上传 .next 与 public/，data/ 被 gitignore、从不同步。
 *   两边数据会逐渐分叉（实测：运费免邮门槛线上是 199/249/229/279，
 *   本地那套是 416.67/…，早就不是一回事）。
 *   分叉之后，在本地跑任何依赖数据的验证，结论都不代表线上。
 *
 * 做法（为了适应这台服务器会丢包的 SSH 通道，尽量少往返）：
 *   1. 服务器上先把 data/ 打包成一个文件
 *   2. 只下载这一个文件
 *   3. 本地解压覆盖
 *   4. 读回来核对（不依赖 SSH 输出判断成败）
 *
 * ⚠️ 会**覆盖本地** data/，所以默认先把本地那份备份到 backups/pre-datapull-<时间戳>/
 *
 * 用法：SSH_KEY=私钥路径 node scripts/deploy/pull-data.cjs
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const HOST = process.env.SSH_HOST || '43.110.46.49'
const PORT = Number(process.env.SSH_PORT || 22)
const USER = process.env.SSH_USER || 'root'
const PASS = process.env.SSH_PASS
/** 私钥路径。设了就用密钥认证（推荐），否则回退到密码。 */
const KEY = process.env.SSH_KEY

if (!PASS && !KEY) { console.error('❌ 请设置 SSH_KEY（私钥路径）或 SSH_PASS（密码）'); process.exit(1) }
const AUTH = KEY ? { privateKey: fs.readFileSync(KEY) } : { password: PASS }

const ROOT = path.join(__dirname, '..', '..')
const REMOTE_TAR = '/root/data-pull.tar.gz'
const LOCAL_TAR = path.join(ROOT, 'data-pull.tar.gz')
const LOCAL_DATA = path.join(ROOT, 'data')

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => resolve(conn)).on('error', reject)
    conn.connect({ host: HOST, port: PORT, username: USER, ...AUTH, readyTimeout: 30000 })
  })
}

function exec(conn, command, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('远端命令超时')), timeout)
    conn.exec(command, (err, ch) => {
      if (err) { clearTimeout(t); return reject(err) }
      let out = ''
      ch.on('data', (d) => { out += d.toString('utf8') })
      ch.stderr.on('data', (d) => { out += d.toString('utf8') })
      ch.on('close', () => { clearTimeout(t); resolve(out) })
    })
  })
}

/** 通道会丢包：同样的命令可能根本执行不到。用「执行 + 用可观测结果确认」的套路。 */
async function execUntil(conn, command, verifyFn, attempts = 4, label = '') {
  for (let i = 1; i <= attempts; i++) {
    try { await exec(conn, command) } catch { /* 忽略，靠 verify 判断 */ }
    if (await verifyFn()) return true
    console.log(`  ${label} 第 ${i}/${attempts} 次未确认，重试…`)
    await new Promise(r => setTimeout(r, 3000))
  }
  return false
}

;(async () => {
  const conn = await connect()
  try {
    // ---------- 1. 备份本地 ----------
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
    const backupDir = path.join(ROOT, '..', 'backups', `pre-datapull-${stamp}`)
    fs.mkdirSync(backupDir, { recursive: true })
    fs.cpSync(LOCAL_DATA, path.join(backupDir, 'data'), { recursive: true })
    console.log('1. 本地 data/ 已备份 →', backupDir)

    // ---------- 2. 服务器打包 ----------
    console.log('2. 服务器打包 data/ …')
    await exec(conn, `rm -f ${REMOTE_TAR}; tar czf ${REMOTE_TAR} -C /var/www/lowflame data && echo PACKED`)
    const packed = await exec(conn, `test -f ${REMOTE_TAR} && stat -c %s ${REMOTE_TAR}`)
    const size = Number(String(packed).trim())
    if (!size || Number.isNaN(size)) {
      console.error('   ✗ 服务器上没生成打包文件，中止（SSH 通道可能丢包，可重跑本脚本）')
      process.exit(1)
    }
    console.log(`   服务器上的包: ${(size / 1024).toFixed(0)} KB`)

    // ---------- 3. 下载 ----------
    console.log('3. 下载…')
    const sftp = await new Promise((res, rej) => conn.sftp((e, s) => (e ? rej(e) : res(s))))
    if (fs.existsSync(LOCAL_TAR)) fs.unlinkSync(LOCAL_TAR)
    await new Promise((res, rej) => sftp.fastGet(REMOTE_TAR, LOCAL_TAR, {}, (e) => (e ? rej(e) : res())))
    const localSize = fs.statSync(LOCAL_TAR).size
    console.log(`   已下载: ${(localSize / 1024).toFixed(0)} KB`)
    if (localSize !== size) { console.error('   ✗ 大小与服务器不一致，中止'); process.exit(1) }

    // ---------- 4. 本地解压覆盖 ----------
    console.log('4. 解压覆盖本地 data/ …')
    // ⚠️ 用相对文件名：Windows 绝对路径含盘符冒号，GNU tar 会当成远程主机
    const ex = spawnSync('tar', ['-xzf', path.basename(LOCAL_TAR), '-C', '.'], { cwd: ROOT, encoding: 'utf8' })
    if (ex.status !== 0) { console.error('   ✗ 解压失败\n' + (ex.stderr || '').slice(-500)); process.exit(1) }
    fs.unlinkSync(LOCAL_TAR)

    // ---------- 5. 读回来核对（不靠 SSH 输出判断） ----------
    console.log('5. 核对…')
    const Database = require('better-sqlite3')
    const db = new Database(path.join(LOCAL_DATA, 'site.db'), { readonly: true })
    const s = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='site_settings'").get().value)
    console.log('   本地现在的 shippingZones:')
    for (const z of (s.shippingZones || [])) {
      console.log(`     ${String(z.id).padEnd(16)} 免邮 $${z.freeThreshold}  基础 $${z.baseCost}`)
    }
    console.log('   categories:', db.prepare('SELECT slug FROM categories ORDER BY sortOrder').all().map(c => c.slug).join(', '))
    console.log('   有评分的商品:', db.prepare('SELECT nameEn, rating, reviewCount FROM products WHERE reviewCount > 0').all().map(p => `${p.nameEn}=${p.rating}/${p.reviewCount}`).join('  '))
    console.log('   款式行数:', db.prepare('SELECT COUNT(*) c FROM product_variants').get().c,
      ' 搭配行数:', db.prepare('SELECT COUNT(*) c FROM product_bundles').get().c)
    db.close()

    console.log('\n✅ 本地 data/ 已与线上拉平')
    console.log('   （原本地那份备份在: ' + backupDir + '）')
  } finally {
    conn.end()
  }
})().catch(e => { console.error('❌ 失败:', e.message); process.exit(1) })
