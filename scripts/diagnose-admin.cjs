// 诊断管理员登录配置（服务器上运行）
const Database = require('better-sqlite3')
const fs = require('fs')

function report(label, s) {
  console.log('=== ' + label + ' ===')
  console.log('adminUsername:', JSON.stringify(s.adminUsername))
  console.log('adminEmail:', JSON.stringify(s.adminEmail))
  console.log('hasPasswordHash:', !!s.adminPasswordHash)
  console.log('hasPasswordSalt:', !!s.adminPasswordSalt)
  console.log('hashPrefix:', s.adminPasswordHash ? s.adminPasswordHash.slice(0, 16) + '...' : '(无)')
  console.log('saltPrefix:', s.adminPasswordSalt ? s.adminPasswordSalt.slice(0, 12) + '...' : '(无)')
  console.log('staffCount:', (s.staffMembers || []).length)
  console.log('')
}

try {
  const db = new Database('data/site.db', { readonly: true })
  const row = db.prepare("SELECT value, updatedAt FROM settings WHERE key = 'site_settings'").get()
  db.close()
  if (row && row.value) {
    report('SQLite（主数据源）', JSON.parse(row.value))
    console.log('SQLite 更新时间:', row.updatedAt ? new Date(Number(row.updatedAt)).toLocaleString('zh-CN') : '(未知)')
    console.log('')
  } else {
    console.log('SQLite 无 site_settings 记录\n')
  }
} catch (e) {
  console.log('SQLite 读取失败:', e.message, '\n')
}

try {
  const raw = fs.readFileSync('data/settings.json', 'utf-8').replace(/^\uFEFF/, '')
  report('JSON 镜像', JSON.parse(raw))
  const stat = fs.statSync('data/settings.json')
  console.log('JSON 文件修改时间:', stat.mtime.toLocaleString('zh-CN'))
} catch (e) {
  console.log('JSON 读取失败:', e.message)
}
