/**
 * fix-contact-info.cjs —— 更新线上客服联系方式（邮箱/电话/营业时间）。
 *
 * 为什么必须改库：Footer 读的是 /api/frontend-content →
 * settings.frontendContent.footer.contacts，改代码里的 DEFAULTS 对已保存的配置无效。
 *
 * 本次设定（与 Google Pay 商户资料申请表保持一致）：
 *   邮箱   hello@lowflame.store
 *   电话   +86 183 3734 0646
 *   时间   Mon–Fri, 9:00 AM – 6:00 PM (EST)
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   node /root/fix-contact-info.cjs dry
 *   node /root/fix-contact-info.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
if (!row) { console.error('settings 表里没有 site_settings'); process.exit(1) }
const cfg = JSON.parse(row.value)

const CONTACTS = [
  { label: 'Email', value: 'hello@lowflame.store' },
  { label: 'Phone', value: '+86 183 3734 0646' },
  { label: 'Hours', value: 'Mon–Fri, 9:00 AM – 6:00 PM (EST)' },
]

console.log('=== 修改前 ===')
console.log('  frontendContent.footer.contacts :', JSON.stringify(cfg.frontendContent && cfg.frontendContent.footer && cfg.frontendContent.footer.contacts))
console.log('  footerEmail                     :', cfg.footerEmail)
console.log('  footerPhone                     :', cfg.footerPhone)

if (!cfg.frontendContent) cfg.frontendContent = {}
if (!cfg.frontendContent.footer) cfg.frontendContent.footer = {}
cfg.frontendContent.footer.contacts = CONTACTS
cfg.footerEmail = 'hello@lowflame.store'
cfg.footerPhone = '+86 183 3734 0646'

console.log('\n=== 修改后 ===')
console.log('  frontendContent.footer.contacts :', JSON.stringify(cfg.frontendContent.footer.contacts))
console.log('  footerEmail                     :', cfg.footerEmail)
console.log('  footerPhone                     :', cfg.footerPhone)

if (mode !== 'run') { console.log('\n[dry run] 加参数 run 才写入。'); process.exit(0) }

fs.writeFileSync('/root/settings-backup-contact.json', JSON.stringify({ value: row.value }, null, 2))
db.prepare("UPDATE settings SET value = ? WHERE key = 'site_settings'").run(JSON.stringify(cfg))
console.log('\n已写入。备份: /root/settings-backup-contact.json')
console.log('重启让缓存失效： pm2 restart lowflame')
