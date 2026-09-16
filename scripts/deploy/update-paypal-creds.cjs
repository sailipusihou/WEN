/**
 * update-paypal-creds.cjs —— 更新站点数据库里的 PayPal API 凭据
 *
 * 背景：服务器曾被 root 级入侵，data/site.db 里的 PayPal Client Secret 已泄露。
 *      用户在 developer.paypal.com 重新生成密钥后，需要把新值写回数据库。
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   NEW_CLIENT_ID='xxx' NEW_SECRET='yyy' NODE_PATH=... node /root/updpp.cjs run
 *   不加 run 为 dry-run（只检查不写入）
 *
 * 安全：脚本不打印完整密钥，只显示前后几位用于核对。
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const https = require('https')

const dbPath = path.join(process.cwd(), 'data', 'site.db')
const db = new Database(dbPath)
const mode = process.argv[2] || 'dry'

const NEW_ID = process.env.NEW_CLIENT_ID || ''
const NEW_SECRET = process.env.NEW_SECRET || ''
const ENV = process.env.NEW_ENV || 'production'

const mask = v => (v ? String(v).slice(0, 12) + '…' + String(v).slice(-6) + `（长度 ${String(v).length}）` : '(空)')

if (!NEW_ID || !NEW_SECRET) {
  console.error('❌ 请通过环境变量提供 NEW_CLIENT_ID 与 NEW_SECRET')
  process.exit(1)
}

// 基本格式校验（不符就先报出来，避免写进去才发现是复制错了）
console.log('=== 1. 新凭据格式检查 ===')
console.log('  Client ID:', mask(NEW_ID))
console.log('  Secret   :', mask(NEW_SECRET))
let fmtOk = true
if (NEW_ID.length < 40) { console.log('  ⚠️ Client ID 偏短（PayPal 通常 80 位左右）'); fmtOk = false }
if (NEW_SECRET.length < 40) { console.log('  ⚠️ Secret 偏短（PayPal 通常 80 位左右）'); fmtOk = false }
if (!/^[A-Za-z0-9_\-]+$/.test(NEW_ID)) { console.log('  ⚠️ Client ID 含异常字符（可能有换行或空格没去掉）'); fmtOk = false }
if (!/^[A-Za-z0-9_\-]+$/.test(NEW_SECRET)) { console.log('  ⚠️ Secret 含异常字符（可能有换行或空格没去掉）'); fmtOk = false }
console.log(fmtOk ? '  ✅ 格式看起来正常' : '  ⚠️ 格式有疑点，请核对是否复制完整')

// 先用新凭据真实换一次 token，确认这个密钥本身是好的
function post(url, body, headers) {
  return new Promise(resolve => {
    const u = new URL(url)
    const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST', headers, timeout: 20000 }, res => {
      const c = []
      res.on('data', d => c.push(d))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }))
    })
    req.on('error', e => resolve({ status: 'ERR', body: e.message }))
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', body: '' }) })
    req.write(body); req.end()
  })
}

;(async () => {
  const base = ENV === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
  console.log('\n=== 2. 用新凭据实测换取 access_token ===')
  console.log('  环境:', ENV, ' 地址:', base)
  const r = await post(base + '/v1/oauth2/token', 'grant_type=client_credentials', {
    Authorization: 'Basic ' + Buffer.from(NEW_ID + ':' + NEW_SECRET).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded',
  })
  console.log('  HTTP', r.status)
  if (r.status !== 200) {
    console.log('  ❌ 新凭据无法通过 PayPal 认证，未写入数据库')
    console.log('  返回:', String(r.body).slice(0, 300))
    console.log('\n  可能原因：')
    console.log('    · 复制时漏了字符或被截断')
    console.log('    · 拿的是 Sandbox 应用的密钥（要用 Live 的）')
    console.log('    · 应用还没启用 Live 权限')
    process.exit(2)
  }
  console.log('  ✅ 新凭据有效，PayPal 已接受')

  // 读当前配置
  const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
  if (!row) { console.error('读不到 site_settings'); process.exit(1) }
  const cfg = JSON.parse(row.value)

  console.log('\n=== 3. 当前数据库里的配置 ===')
  console.log('  paypalClientId    :', mask(cfg.paypalClientId))
  console.log('  paypalClientSecret:', mask(cfg.paypalClientSecret))
  console.log('  paypalEnv         :', cfg.paypalEnv)
  console.log('  paypalEnabled     :', cfg.paypalEnabled)

  if (mode !== 'run') {
    console.log('\n[dry run] 加参数 run 才写入')
    process.exit(0)
  }

  // 备份后写入
  const bk = '/root/settings-backup-paypal-' + Date.now() + '.json'
  fs.writeFileSync(bk, JSON.stringify({ value: row.value }, null, 2))
  console.log('\n  原配置已备份:', bk)

  cfg.paypalClientId = NEW_ID
  cfg.paypalClientSecret = NEW_SECRET
  cfg.paypalEnv = ENV
  cfg.paypalEnabled = true

  db.prepare("UPDATE settings SET value = ? WHERE key = 'site_settings'").run(JSON.stringify(cfg))
  console.log('  ✅ 已写入数据库')

  const after = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get().value)
  console.log('\n=== 4. 写入后复核 ===')
  console.log('  paypalClientId    :', mask(after.paypalClientId))
  console.log('  paypalClientSecret:', mask(after.paypalClientSecret))
  const ok = after.paypalClientId === NEW_ID && after.paypalClientSecret === NEW_SECRET
  console.log(ok ? '  ✅ 与传入值一致' : '  ❌ 不一致，请检查')

  console.log('\n=== 5. 下一步 ===')
  console.log('  重启应用让设置缓存失效： pm2 restart lowflame')
  console.log('  然后访问 /api/paypal/config 确认接口返回正常')
})().catch(e => { console.error('异常:', e.message); process.exit(1) })
