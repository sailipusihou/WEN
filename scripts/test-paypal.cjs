// 验证 PayPal Live 凭证是否有效（获取 access token）
const fs = require('fs')
const path = require('path')

// 读取配置
function getSettings() {
  try {
    const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'))
    const db = new Database(path.join(__dirname, '..', 'data', 'site.db'), { readonly: true })
    const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
    db.close()
    if (row?.value) return JSON.parse(row.value)
  } catch {}
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'settings.json'), 'utf-8').replace(/^\uFEFF/, ''))
  } catch {}
  return {}
}

async function main() {
  const s = getSettings()
  const { paypalClientId: id, paypalClientSecret: secret, paypalEnv: env } = s
  console.log('=== PayPal 配置 ===')
  console.log('env:', env)
  console.log('clientId:', id ? id.slice(0, 20) + '...' : '(空)')
  console.log('secret:', secret ? '已配置(' + secret.length + '位)' : '(空)')
  console.log('')

  if (!id || !secret) { console.log('❌ 凭证不完整'); return }

  const base = env === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
  console.log('API 端点:', base)
  console.log('正在验证凭证...')

  const auth = Buffer.from(`${id}:${secret}`).toString('base64')
  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.access_token) {
      console.log('✅ PayPal Live 凭证有效！')
      console.log('   token 类型:', data.token_type, '| 有效期:', data.expires_in, '秒')
      console.log('   App ID:', data.app_id || '(未返回)')
    } else {
      console.log('❌ 凭证验证失败:', res.status, JSON.stringify(data).slice(0, 300))
      if (res.status === 401) console.log('   提示：Client ID 或 Secret 不正确')
    }
  } catch (err) {
    console.log('❌ 网络请求失败:', err.message)
    console.log('   可能是网络问题（需要代理才能访问 PayPal API）')
  }
}

main().catch(e => { console.error('ERR', e.message); process.exit(1) })
