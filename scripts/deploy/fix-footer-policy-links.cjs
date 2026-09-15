/**
 * fix-footer-policy-links.cjs —— 把数据库里已保存的页脚链接指向真实政策页。
 *
 * 背景：Footer 读的是 settings.footer.companyLinks（存在 settings 表里），
 * 改 lib/settings.ts 里的 DEFAULTS 对已保存的配置无效 ——
 * 实测发版后页脚 "Returns" / "Shipping" 仍然指向 /contact。
 * 所以必须直接改库里的值。
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   node /root/fix-footer-policy-links.cjs dry
 *   node /root/fix-footer-policy-links.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
if (!row) { console.error('settings 表里没有 site_settings'); process.exit(1) }
const cfg = JSON.parse(row.value)

console.log('=== 修改前 ===')
console.log('  footer.companyLinks   :', JSON.stringify(cfg.footer && cfg.footer.companyLinks))
console.log('  footerPrivacyLink     :', cfg.footerPrivacyLink)
console.log('  footerTermsLink       :', cfg.footerTermsLink)

const WANT = [
  { label: 'About', href: '/#philosophy' },
  { label: 'Journal', href: '/#journal' },
  { label: 'Contact', href: '/contact' },
  { label: 'Shipping', href: '/shipping-policy' },
  { label: 'Returns', href: '/refund-policy' },
]

if (!cfg.footer) cfg.footer = {}
cfg.footer.companyLinks = WANT
cfg.footerPrivacyLink = '/privacy'
cfg.footerTermsLink = '/terms'

console.log('\n=== 修改后 ===')
console.log('  footer.companyLinks   :', JSON.stringify(cfg.footer.companyLinks))
console.log('  footerPrivacyLink     :', cfg.footerPrivacyLink)
console.log('  footerTermsLink       :', cfg.footerTermsLink)

if (mode !== 'run') {
  console.log('\n[dry run] 加参数 run 才写入。')
  process.exit(0)
}

fs.writeFileSync('/root/settings-backup-footer.json', JSON.stringify({ value: row.value }, null, 2))
db.prepare("UPDATE settings SET value = ? WHERE key = 'site_settings'").run(JSON.stringify(cfg))
console.log('\n已写入。原值备份: /root/settings-backup-footer.json')
console.log('记得重启让设置缓存失效： pm2 restart lowflame')
