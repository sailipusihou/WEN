/**
 * 读取线上 PayPal 配置（只输出是否启用/环境/clientId，不打印 secret）
 * 在服务器上从 /var/www/lowflame 运行。
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
const s = JSON.parse(row.value)

const mask = v => (v ? String(v).slice(0, 10) + '…' + String(v).slice(-6) + ` (len ${String(v).length})` : '(空)')

console.log('paypalEnabled   =', s.paypalEnabled)
console.log('paypalEnv       =', s.paypalEnv)
console.log('paypalClientId  =', mask(s.paypalClientId))
console.log('paypalSecret    =', s.paypalClientSecret ? '(已设置)' : '(空)')
console.log('paypalWebhookId =', s.paypalWebhookId || '(空)')
console.log('payoneerEnabled =', s.payoneerEnabled)
console.log('payoneerEnv     =', s.payoneerEnv)
console.log('payoneerClientId=', mask(s.payoneerClientId))
console.log('currency        =', s.currency)
console.log('siteUrl         =', s.siteUrl)
