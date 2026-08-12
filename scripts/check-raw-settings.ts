import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'site.db')
const db = new Database(DB_PATH)

// 读取 settings 表中的原始数据
const row = db.prepare('SELECT key, value, updatedAt FROM settings WHERE key = ?').get('site_settings') as any
console.log('=== SQLite settings 表原始数据 ===')
if (row) {
  console.log('key:', row.key)
  console.log('updatedAt:', row.updatedAt)
  console.log('value 长度:', row.value?.length)

  // 解析 JSON
  const settings = JSON.parse(row.value)
  console.log()
  console.log('=== 解析后的 settings ===')
  console.log('adminUsername:', settings.adminUsername)
  console.log('adminPassword:', settings.adminPassword ? '[exists]' : '[empty]')
  console.log('adminPasswordHash:', settings.adminPasswordHash ? '[exists]' : '[empty]')
  console.log('adminPasswordSalt:', settings.adminPasswordSalt ? '[exists]' : '[empty]')
  console.log('adminEmail:', settings.adminEmail)
  console.log('adminAvatar:', settings.adminAvatar || '[empty]')

  // 检查所有以 admin 开头的键
  console.log()
  console.log('=== 所有 admin 开头的键 ===')
  Object.keys(settings).filter(k => k.startsWith('admin')).forEach(k => {
    console.log(`  ${k}: ${typeof settings[k] === 'string' ? (settings[k] ? '[exists]' : '[empty]') : JSON.stringify(settings[k])}`)
  })
} else {
  console.log('No settings found in database!')
  // 检查所有 settings 键
  const allRows = db.prepare('SELECT key FROM settings').all() as any[]
  console.log('Available keys:', allRows.map(r => r.key))
}

db.close()
