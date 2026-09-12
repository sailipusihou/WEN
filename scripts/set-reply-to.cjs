// 设置 SMTP Reply-To (客户回信地址)
// 用法: node scripts/set-reply-to.cjs [email]     (不带参数则显示当前值)
const path = require('path')
const Database = require('better-sqlite3')

const value = process.argv[2]
const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const row = db.prepare("SELECT value FROM settings WHERE key='site_settings'").get()
if (!row || !row.value) { console.log('未找到 site_settings'); process.exit(1) }

const s = JSON.parse(row.value)
console.log('当前 smtpReplyTo =', JSON.stringify(s.smtpReplyTo))
console.log('当前 smtpFromEmail =', JSON.stringify(s.smtpFromEmail))

if (!value) { console.log('\n未指定新值, 只显示。用法: node scripts/set-reply-to.cjs hello@lowflame.store'); process.exit(0) }
if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value)) { console.log('邮箱格式不对:', value); process.exit(1) }

s.smtpReplyTo = value
db.prepare("UPDATE settings SET value = ?, updatedAt = datetime('now') WHERE key = 'site_settings'").run(JSON.stringify(s))
console.log('\n已写入 smtpReplyTo =', value, ' → 请执行 pm2 restart lowflame 让缓存失效')
db.close()
