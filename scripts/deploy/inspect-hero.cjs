/**
 * 排查 hero 配置来源：JSON 库 vs SQLite 库。
 * 在服务器上从 /var/www/lowflame 运行。
 */
const fs = require('fs')
const path = require('path')

const root = process.cwd()
console.log('cwd =', root)
console.log('--- .env.local ---')
try { console.log(fs.readFileSync(path.join(root, '.env.local'), 'utf8')) } catch (e) { console.log('(none)') }
console.log('--- DATABASE_BACKEND =', process.env.DATABASE_BACKEND, '---')

console.log('--- data/settings.json ---')
try {
  const j = JSON.parse(fs.readFileSync(path.join(root, 'data/settings.json'), 'utf8'))
  console.log('top keys:', Object.keys(j).join(','))
  const fc = j.frontendContent
  console.log('has frontendContent:', !!fc)
  if (fc && fc.hero) {
    const h = fc.hero
    console.log('JSON hero:', JSON.stringify({
      videoEnabled: h.videoEnabled,
      videoUrl: h.videoUrl,
      heroBrightness: h.heroBrightness,
      heroTemperature: h.heroTemperature,
      overlayOpacity: h.overlayOpacity,
    }))
  }
} catch (e) { console.log('read error:', e.message) }

console.log('--- sqlite settings.site_settings ---')
try {
  const Database = require('better-sqlite3')
  const db = new Database(path.join(root, 'data/site.db'), { readonly: true })
  const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
  const s = JSON.parse(row.value)
  console.log('top keys:', Object.keys(s).join(','))
  const fc = s.frontendContent
  console.log('has frontendContent:', !!fc)
  if (fc && fc.hero) {
    const h = fc.hero
    console.log('DB hero:', JSON.stringify({
      videoEnabled: h.videoEnabled,
      videoUrl: h.videoUrl,
      heroBrightness: h.heroBrightness,
      heroTemperature: h.heroTemperature,
      overlayOpacity: h.overlayOpacity,
    }))
  }
} catch (e) { console.log('read error:', e.message) }
