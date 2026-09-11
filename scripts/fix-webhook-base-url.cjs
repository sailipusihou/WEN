// 一次性脚本：把 SQLite + settings.json 中的 webhookBaseUrl 更新为 lowflame.store
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath = path.join(__dirname, '..', 'data', 'site.db')
const jsonPath = path.join(__dirname, '..', 'data', 'settings.json')

const db = new Database(dbPath)
const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
if (!row) {
  console.error('site_settings row not found')
  process.exit(1)
}

const s = JSON.parse(row.value)
const before = s.webhookBaseUrl
s.webhookBaseUrl = 'https://lowflame.store'
db.prepare("UPDATE settings SET value = ? WHERE key = 'site_settings'").run(JSON.stringify(s))
db.close()
console.log('SQLite updated:', before, '->', s.webhookBaseUrl)

// settings.json 同步（若存在旧值）
const jsonPath2 = jsonPath
if (fs.existsSync(jsonPath2)) {
  const raw = fs.readFileSync(jsonPath2, 'utf8')
  const j = JSON.parse(raw)
  if (j.webhookBaseUrl) {
    const jBefore = j.webhookBaseUrl
    j.webhookBaseUrl = 'https://lowflame.store'
    fs.writeFileSync(jsonPath2, JSON.stringify(j, null, 2), 'utf8')
    console.log('settings.json updated:', jBefore, '->', j.webhookBaseUrl)
  } else {
    console.log('settings.json: webhookBaseUrl not present')
  }
}
