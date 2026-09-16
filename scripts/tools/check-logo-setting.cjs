/**
 * check-logo-setting.cjs —— 查后台是否设了自定义 logo（会覆盖代码里的默认路径）
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })
const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
const s = row ? JSON.parse(row.value) : {}

console.log('=== 与 logo 相关的设置 ===')
for (const k of ['siteLogo', 'siteName', 'siteNameEn', 'favicon', 'adminLogo', 'adminBgImage', 'logoText']) {
  console.log(`  ${k.padEnd(16)} = ${JSON.stringify(s[k])}`)
}

console.log('\n=== 现有 logo 文件 ===')
const fs = require('fs')
for (const f of fs.readdirSync(path.join(process.cwd(), 'public', 'images')).filter(x => /logo|icon|favicon/i.test(x))) {
  const st = fs.statSync(path.join(process.cwd(), 'public', 'images', f))
  console.log(`  ${f.padEnd(34)} ${Math.round(st.size / 1024)} KB`)
}
