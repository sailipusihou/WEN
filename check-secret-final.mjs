import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'site.db')
const db = new Database(dbPath)

const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
const settings = JSON.parse(row.value)

console.log('=== PayPal Settings from DB ===')
console.log('paypalEnabled:', settings.paypalEnabled)
console.log('paypalEnv:', settings.paypalEnv)
console.log('paypalClientId:', settings.paypalClientId ? settings.paypalClientId.substring(0, 30) + '...' : 'NOT SET')
console.log('paypalClientSecret:', settings.paypalClientSecret ? settings.paypalClientSecret.substring(0, 20) + '...' : 'NOT SET')
console.log('paypalClientSecret length:', settings.paypalClientSecret ? settings.paypalClientSecret.length : 0)

if (!settings.paypalClientSecret || settings.paypalClientSecret.length < 10) {
  console.log('')
  console.log('❌ ERROR: PayPal Client Secret is missing or too short!')
  console.log('Please re-save the PayPal settings with the correct Secret.')
}

db.close()