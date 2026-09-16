/**
 * list-credentials.cjs —— 列出数据库里存的所有敏感凭据（脱敏显示），
 * 用于判断「入侵后还有哪些凭据需要轮换」。
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/list-creds.cjs
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

// 敏感字段名（包含这些词的都算凭据）
const SENSITIVE = /(secret|password|passwd|token|key|clientid|client_id|apikey|api_key|webhook|smtp|credential)/i

const mask = (v) => {
  if (v === null || v === undefined || v === '') return '(空)'
  const s = String(v)
  if (s.length <= 12) return '***（长度 ' + s.length + '）'
  return s.slice(0, 8) + '…' + s.slice(-4) + '（长度 ' + s.length + '）'
}

console.log('======================================================================')
console.log(' 数据库里的敏感凭据清单（脱敏）')
console.log('======================================================================')

const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
if (row) {
  const s = JSON.parse(row.value)
  console.log('\n### settings.site_settings 里的敏感项')
  let n = 0
  for (const [k, v] of Object.entries(s)) {
    if (!SENSITIVE.test(k)) continue
    if (typeof v === 'object' && v !== null) {
      console.log(`  ${k}: [对象，含 ${Object.keys(v).length} 个字段]`)
      n++
      continue
    }
    console.log(`  ${k.padEnd(28)} = ${mask(v)}`)
    n++
  }
  // 也列出可能含凭据的非敏感名字
  console.log('\n### 其它可能需要注意的设置')
  for (const k of ['siteUrl', 'currency', 'cnyUsdRate', 'smtpHost', 'smtpPort', 'smtpUser', 'supportEmail', 'footerEmail']) {
    if (s[k] !== undefined) console.log(`  ${k.padEnd(28)} = ${mask(s[k])}`)
  }
  if (n === 0) console.log('  （没有匹配到敏感字段名）')
}

// 其它表里的凭据
console.log('\n### 其它表里可能的凭据')
for (const t of ['users', 'staff', 'customers', 'suppliers']) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
    const sens = cols.filter(c => SENSITIVE.test(c))
    const cnt = db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n
    console.log(`  ${t}: ${cnt} 行；敏感列 = ${sens.length ? sens.join(', ') : '(无)'}`)
  } catch { /* 表不存在 */ }
}

// 文件系统里可能的凭据
console.log('\n### 文件系统里可能的凭据文件')
const fs = require('fs')
const candidates = [
  '/var/www/lowflame/.env',
  '/var/www/lowflame/.env.local',
  '/var/www/lowflame/.env.production',
  '/var/www/lowflame/data/site.db',
  '/root/.my.cnf',
  '/root/.pgpass',
  '/root/.aws/credentials',
  '/root/.ssh/id_rsa',
  '/root/.ssh/authorized_keys',
]
for (const f of candidates) {
  try {
    const st = fs.statSync(f)
    console.log(`  ⚠️ 存在: ${f}  (${st.size} 字节, 修改于 ${st.mtime.toISOString().slice(0, 19)})`)
  } catch { /* 不存在 */ }
}
console.log('  （上面列出的文件如果存在，都应当视为已泄露）')

console.log('\n======================================================================')
console.log(' 轮换清单建议（入侵后有 root 权限 = 以上全部可读）')
console.log('======================================================================')
console.log('  1. SSH root 密码            —— ✅ 已完成（本次加固时换过）')
console.log('  2. PayPal 账户登录密码       —— ✅ 你已改')
console.log('  3. PayPal API Client Secret —— ❌ 仍是泄露的那个，需在 developer.paypal.com 重新生成')
console.log('  4. 后台管理员密码            —— 待确认（可让我立即改）')
console.log('  5. SMTP / 邮件服务密码       —— 若配置过则需改')
console.log('  6. 任何第三方 API Key        —— 若数据库里有')
console.log('======================================================================')
