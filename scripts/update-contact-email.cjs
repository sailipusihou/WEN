// 把「对外公示邮箱」统一改成 hello@lowflame.store (旧值 hello@lowflame.com)
// 用法: node scripts/update-contact-email.cjs          → 只报告
//       node scripts/update-contact-email.cjs --apply  → 写入
// 注意: 写入后需要 `pm2 restart lowflame` 让设置缓存失效。
const path = require('path')
const Database = require('better-sqlite3')

const OLD = 'hello@lowflame.com'
const NEW = 'hello@lowflame.store'
const APPLY = process.argv.includes('--apply')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const row = db.prepare("SELECT value FROM settings WHERE key='site_settings'").get()
if (!row || !row.value) { console.log('未找到 site_settings'); process.exit(1) }

const s = JSON.parse(row.value)
let changes = 0

if (s.footerEmail === OLD) { s.footerEmail = NEW; changes++; console.log('footerEmail:', OLD, '->', NEW) }
else console.log('footerEmail 当前为:', JSON.stringify(s.footerEmail))

const contacts = s.frontendContent && s.frontendContent.footer && s.frontendContent.footer.contacts
if (Array.isArray(contacts)) {
  for (const c of contacts) {
    if (c && c.label === 'Email' && c.value === OLD) { c.value = NEW; changes++; console.log('footer.contacts Email:', OLD, '->', NEW) }
  }
}

if (!changes) { console.log('没有需要修改的字段 (已经是新值或未被设置)') }
if (!APPLY) { console.log('\n只报告模式, 未写入。加 --apply 执行修改。'); process.exit(0) }

db.prepare("UPDATE settings SET value = ?, updatedAt = datetime('now') WHERE key = 'site_settings'")
  .run(JSON.stringify(s))
console.log(`\n已写入 ${changes} 处修改。请执行: pm2 restart lowflame`)
db.close()
