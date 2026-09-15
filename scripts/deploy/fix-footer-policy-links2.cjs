/**
 * fix-footer-policy-links2.cjs —— 修正页脚政策链接（改对 key）。
 *
 * 上一版改错位置：Footer 组件读的是 /api/frontend-content，
 * 该接口返回 settings.frontendContent，
 * 页脚实际路径是 settings.frontendContent.footer.companyLinks，
 * 而我上次改的是 settings.footer.companyLinks —— 所以线上没变化。
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   node /root/fix-footer-policy-links2.cjs dry
 *   node /root/fix-footer-policy-links2.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
if (!row) { console.error('settings 表里没有 site_settings'); process.exit(1) }
const cfg = JSON.parse(row.value)

console.log('=== 现状（正确的 key）===')
console.log('  frontendContent.footer          :', JSON.stringify(cfg.frontendContent && cfg.frontendContent.footer))
console.log('  （上次误改的 settings.footer）   :', JSON.stringify(cfg.footer))

const WANT = [
  { label: 'About', href: '/#philosophy' },
  { label: 'Journal', href: '/#journal' },
  { label: 'Contact', href: '/contact' },
  { label: 'Shipping', href: '/shipping-policy' },
  { label: 'Returns', href: '/refund-policy' },
]

if (!cfg.frontendContent) cfg.frontendContent = {}
if (!cfg.frontendContent.footer) cfg.frontendContent.footer = {}
cfg.frontendContent.footer.companyLinks = WANT

// 顺手把上次误写进 settings.footer 的字段清掉，避免两处并存造成以后误判
if (cfg.footer && cfg.footer.companyLinks) {
  delete cfg.footer.companyLinks
  if (Object.keys(cfg.footer).length === 0) delete cfg.footer
}

console.log('\n=== 修改后 ===')
console.log('  frontendContent.footer.companyLinks :', JSON.stringify(cfg.frontendContent.footer.companyLinks))

if (mode !== 'run') { console.log('\n[dry run] 加参数 run 才写入。'); process.exit(0) }

fs.writeFileSync('/root/settings-backup-footer2.json', JSON.stringify({ value: row.value }, null, 2))
db.prepare("UPDATE settings SET value = ? WHERE key = 'site_settings'").run(JSON.stringify(cfg))
console.log('\n已写入。备份: /root/settings-backup-footer2.json')
console.log('重启让缓存失效： pm2 restart lowflame')
