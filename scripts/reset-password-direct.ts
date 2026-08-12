import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'

const DB_PATH = path.join(process.cwd(), 'data', 'site.db')
const db = new Database(DB_PATH)

// 直接在 SQLite 中重置密码
const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('site_settings') as any
const settings = JSON.parse(row.value)

// 生成新的密码哈希
const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.pbkdf2Sync('admin123', salt, 100000, 64, 'sha512').toString('hex')

settings.adminPassword = ''
settings.adminPasswordHash = hash
settings.adminPasswordSalt = salt

// 写回数据库
db.prepare(`
  INSERT OR REPLACE INTO settings (key, value, updatedAt)
  VALUES (?, ?, datetime('now'))
`).run('site_settings', JSON.stringify(settings))

console.log('密码已重置为 admin123')
console.log('adminPasswordHash:', hash.substring(0, 30) + '...')
console.log('adminPasswordSalt:', salt.substring(0, 30) + '...')

// 验证
const updatedRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('site_settings') as any
const updatedSettings = JSON.parse(updatedRow.value)
console.log()
console.log('验证:')
console.log('adminUsername:', updatedSettings.adminUsername)
console.log('adminPasswordHash:', updatedSettings.adminPasswordHash ? '[exists]' : '[empty]')
console.log('adminPasswordSalt:', updatedSettings.adminPasswordSalt ? '[exists]' : '[empty]')

db.close()
