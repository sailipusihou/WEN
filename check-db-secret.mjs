import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'site.db')
const db = new Database(dbPath)

console.log('=== Direct SQLite Check ===')

// Check if settings table has paypalClientSecret column
const cols = db.prepare("PRAGMA table_info(settings)").all()
const paypalCols = cols.filter(c => c.name.toLowerCase().includes('paypal'))
console.log('PayPal columns in settings:')
paypalCols.forEach(c => console.log(`  - ${c.name} (${c.type})`))

// Get the actual values
const row = db.prepare("SELECT * FROM settings LIMIT 1").get()
console.log('')
console.log('Actual PayPal values:')
paypalCols.forEach(c => {
  const val = row[c.name]
  if (val === null || val === undefined) {
    console.log(`  ${c.name}: NULL`)
  } else if (typeof val === 'string' && val.length === 0) {
    console.log(`  ${c.name}: EMPTY STRING (length: 0)`)
  } else if (typeof val === 'string') {
    console.log(`  ${c.name}: "${val.substring(0, 30)}..." (length: ${val.length})`)
  } else {
    console.log(`  ${c.name}: ${val}`)
  }
})

db.close()