/**
 * probe-server-settings.cjs —— 只读：查服务器上 site.db 的实际设置
 * 用法（服务器上，从 /var/www/lowflame 执行）：
 *   node /root/probe.cjs
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
const s = JSON.parse(row.value)

console.log('=== 服务器上的 shippingZones ===')
for (const z of (s.shippingZones || [])) {
  console.log(`  ${String(z.id).padEnd(16)} ${z.estimatedDaysMin}-${z.estimatedDaysMax}天  基础 $${z.baseCost}  免邮 $${z.freeThreshold}`)
  console.log(`      国家: ${JSON.stringify(z.countries)}`)
}
console.log('  全局 shippingFreeThreshold:', s.shippingFreeThreshold)
console.log('  全局 shippingCost:', s.shippingCost)

console.log('\n=== 服务器上的 categories ===')
for (const c of db.prepare('SELECT slug, name, nameEn, productCount FROM categories ORDER BY sortOrder').all()) {
  console.log(`  ${String(c.slug).padEnd(20)} ${c.name} / ${c.nameEn}  count=${c.productCount}`)
}

console.log('\n=== 服务器上的 rating / reviewCount ===')
for (const p of db.prepare('SELECT id, nameEn, rating, reviewCount FROM products ORDER BY createdAt').all()) {
  console.log(`  ${String(p.nameEn || p.id).slice(0, 32).padEnd(34)} ${p.rating} / ${p.reviewCount}`)
}

console.log('\n=== 评价表 ===')
console.log('  行数:', db.prepare('SELECT COUNT(*) c FROM reviews').get().c)
console.log('  product_variants 行数:', db.prepare('SELECT COUNT(*) c FROM product_variants').get().c)
console.log('  product_bundles  行数:', db.prepare('SELECT COUNT(*) c FROM product_bundles').get().c)

console.log('\n=== 数据库文件信息 ===')
const fs = require('fs')
const st = fs.statSync(path.join(process.cwd(), 'data', 'site.db'))
console.log('  大小:', (st.size / 1024).toFixed(0), 'KB   最后修改:', st.mtime.toISOString())

db.close()
