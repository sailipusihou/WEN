// 重置管理员密码 + 修复 SQLite/JSON 数据不一致
// 用法（服务器上）：node reset-admin.cjs "新密码" ["用户名"]
const crypto = require('crypto')
const Database = require('better-sqlite3')
const fs = require('fs')

const ADMIN_ITERATIONS = 210000

function hashAdminPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, s, ADMIN_ITERATIONS, 64, 'sha512').toString('hex')
  return { hash, salt: s }
}

const NEW_PASSWORD = process.argv[2]
const NEW_USERNAME = process.argv[3] || null

if (!NEW_PASSWORD) {
  console.log('用法: node reset-admin.cjs "新密码" ["用户名"]')
  process.exit(1)
}

// ---------- 读取当前 SQLite 配置 ----------
const db = new Database('data/site.db')
const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
if (!row || !row.value) {
  console.log('❌ 未找到 site_settings 记录')
  db.close()
  process.exit(1)
}
const s = JSON.parse(row.value)

console.log('=== 修改前 ===')
console.log('adminUsername:', JSON.stringify(s.adminUsername))
console.log('hashPrefix:', s.adminPasswordHash ? s.adminPasswordHash.slice(0, 16) + '...' : '(无)')

// ---------- 生成新凭据 ----------
const username = NEW_USERNAME || s.adminUsername || 'admin'
const { hash, salt } = hashAdminPassword(NEW_PASSWORD)

s.adminUsername = username
s.adminPasswordHash = hash
s.adminPasswordSalt = salt
s.adminPassword = ''   // 清除旧版明文字段

// ---------- 写回 SQLite ----------
const updatedAt = Date.now()
db.prepare("UPDATE settings SET value = ?, updatedAt = ? WHERE key = 'site_settings'").run(JSON.stringify(s), updatedAt)
db.close()

// ---------- 写回 JSON 镜像（保持双源一致） ----------
fs.writeFileSync('data/settings.json', JSON.stringify(s, null, 2), 'utf-8')

console.log('')
console.log('=== 修改后 ===')
console.log('adminUsername:', JSON.stringify(username))
console.log('hashPrefix:', hash.slice(0, 16) + '...')
console.log('saltPrefix:', salt.slice(0, 12) + '...')
console.log('')
console.log('✅ 密码已重置，SQLite 与 JSON 已同步')
console.log('   登录用户名:', username)
