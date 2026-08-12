import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'site.db')
const db = new Database(dbPath)

console.log('=== Settings Table Structure ===')
const cols = db.prepare("PRAGMA table_info(settings)").all()
cols.forEach(c => console.log(`  ${c.name} (${c.type})`))

console.log('')
console.log('=== All Tables ===')
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
tables.forEach(t => console.log('  ' + t.name))

// Check if settings table has data
const row = db.prepare("SELECT * FROM settings LIMIT 1").get()
console.log('')
console.log('=== Settings Data ===')
if (row) {
  Object.keys(row).forEach(key => {
    const val = row[key]
    if (typeof val === 'string' && val.length > 50) {
      console.log(`  ${key}: "${val.substring(0, 50)}..." (len: ${val.length})`)
    } else {
      console.log(`  ${key}: ${val === null ? 'NULL' : typeof val === 'string' ? `"${val}"` : val}`)
    }
  })
} else {
  console.log('  No data in settings table')
}

db.close()