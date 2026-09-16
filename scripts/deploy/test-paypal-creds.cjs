/**
 * test-paypal-creds.cjs —— 测试服务器上存的 PayPal 凭据是否仍然有效。
 *
 * 为什么测：如果用户重新生成了 API Secret，旧的就立刻失效，
 * 而网站数据库里还存着旧的 → 客户付款会直接失败。
 * 这个脚本直接拿库里的凭据去换 access_token，能立刻判断是否失效。
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/test-paypal-creds.cjs
 */
const Database = require('better-sqlite3')
const path = require('path')
const https = require('https')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })
const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
if (!row) { console.error('读不到 site_settings'); process.exit(1) }
const s = JSON.parse(row.value)

const clientId = s.paypalClientId || process.env.PAYPAL_CLIENT_ID || ''
const secret = s.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET || ''
const env = s.paypalEnv || process.env.PAYPAL_ENV || 'production'
const base = env === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

const mask = v => (v ? String(v).slice(0, 12) + '…' + String(v).slice(-6) + ` (长度 ${String(v).length})` : '(空)')

console.log('=== 站点当前使用的 PayPal 配置 ===')
console.log('  环境        :', env)
console.log('  API 地址    :', base)
console.log('  Client ID   :', mask(clientId))
console.log('  Secret      :', secret ? mask(secret) : '(空)')
console.log('  paypalEnabled:', s.paypalEnabled)
console.log()

if (!clientId || !secret) {
  console.log('❌ Client ID 或 Secret 为空，PayPal 支付必然不可用')
  process.exit(2)
}

function post(url, body, headers) {
  return new Promise(resolve => {
    const u = new URL(url)
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers, timeout: 20000,
    }, res => {
      const c = []
      res.on('data', d => c.push(d))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c).toString('utf8') }))
    })
    req.on('error', e => resolve({ status: 'ERR', body: e.message }))
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', body: '' }) })
    req.write(body)
    req.end()
  })
}

;(async () => {
  console.log('=== 用库里的凭据换取 access_token ===')
  const basic = Buffer.from(clientId + ':' + secret).toString('base64')
  const r = await post(base + '/v1/oauth2/token', 'grant_type=client_credentials', {
    Authorization: 'Basic ' + basic,
    'Content-Type': 'application/x-www-form-urlencoded',
  })

  console.log('  HTTP', r.status)
  if (r.status === 200) {
    let d = {}
    try { d = JSON.parse(r.body) } catch {}
    console.log('  ✅ 凭据有效！access_token 已获取（长度 ' + String(d.access_token || '').length + '）')
    console.log('  token 有效期:', d.expires_in, '秒')
    console.log()
    console.log('  结论：站点上的 PayPal 凭据仍然可用，支付功能正常。')
  } else {
    console.log('  ❌ 凭据无效或被吊销')
    console.log('  返回内容:', String(r.body).slice(0, 400))
    console.log()
    if (r.status === 401) {
      console.log('  结论：Secret 已失效（很可能你重新生成了新密钥）。')
      console.log('        必须把新凭据更新到站点，否则客户无法付款。')
      console.log('        更新方式：后台 → 系统设置 → PayPal，填入新的 Client ID / Secret')
    } else {
      console.log('  结论：需进一步排查（可能是网络或 PayPal 侧问题）')
    }
  }
})().catch(e => { console.error('异常:', e.message); process.exit(1) })
