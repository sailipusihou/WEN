// 清理线上 QA 临时数据 (只删除 qa-/smoke-/dbg- 前缀的测试账号及其消息/附件)
// 用法: node scripts/cleanup-qa-data.cjs          → 只报告
//       node scripts/cleanup-qa-data.cjs --apply  → 执行
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const APPLY = process.argv.includes('--apply')
const PREFIXES = ['qa-%@example.com', 'qa-live-%@example.com', 'smoke-%@example.com', 'dbg-%@example.com']

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const uploadDir = path.join(process.cwd(), 'public', 'uploads')

const victims = []
for (const p of PREFIXES) {
  for (const u of db.prepare('SELECT id,email FROM users WHERE email LIKE ?').all(p)) victims.push(u)
}
const emails = [...new Set(victims.map(v => v.email))]
console.log('待清理测试账号:', emails.join(', ') || '(无)')

const msgRows = emails.length
  ? db.prepare(`SELECT id,email,attachments,adminAttachments FROM messages WHERE email IN (${emails.map(() => '?').join(',')})`).all(...emails)
  : []
console.log('待清理消息条数:', msgRows.length)

// 收集这些消息里引用的附件文件名
const files = new Set()
for (const m of msgRows) {
  for (const col of ['attachments', 'adminAttachments']) {
    let arr = []
    try { arr = JSON.parse(m[col] || '[]') } catch {}
    for (const a of arr) {
      const url = a && a.url ? String(a.url) : ''
      const mm = /(?:file=|uploads\/)([^&"']+)/.exec(url)
      if (mm) files.add(decodeURIComponent(mm[1]))
    }
  }
}
console.log('待清理附件:', [...files].join(', ') || '(无)')

if (!APPLY) { console.log('\n只报告模式, 加 --apply 执行'); process.exit(0) }

let del = { users: 0, msgs: 0, files: 0 }
db.transaction(() => {
  for (const e of emails) del.msgs += db.prepare('DELETE FROM messages WHERE email = ?').run(e).changes
  for (const v of victims) del.users += db.prepare('DELETE FROM users WHERE id = ?').run(v.id).changes
})()
for (const f of files) {
  const p = path.join(uploadDir, f)
  if (fs.existsSync(p)) { fs.unlinkSync(p); del.files++ }
}
console.log('已清理:', del)
db.close()
