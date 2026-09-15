/**
 * fix-variant-test-images.cjs —— 清掉测试时误填进 image 字段的货号
 * （image 里出现 "CG-0001-A" 这种明显是货号的值）。
 * 用法：node /root/fix-variant-test-images.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const rows = db.prepare('SELECT id, productId, label, image, valueCode FROM product_variants').all()
console.log('=== 当前所有规格 ===')
rows.forEach(r => console.log(`  ${r.productId} | ${r.label} | image=${JSON.stringify(r.image)} | code=${JSON.stringify(r.valueCode)}`))

// 判定脏数据：image 不像 URL（不含 http / 不以 / 开头）但有值
const bad = rows.filter(r => r.image && !/^https?:\/\//i.test(r.image) && !r.image.startsWith('/'))
console.log('\n疑似误填进 image 的值:', bad.length)
bad.forEach(r => console.log(`  ${r.label}: ${r.image}  → 移回 valueCode 并清空 image`))

if (mode !== 'run') { console.log('\n[dry run] 加 run 才写入。'); process.exit(0) }
if (!bad.length) { console.log('没有需要修的。'); process.exit(0) }

const tx = db.transaction(() => {
  const upd = db.prepare('UPDATE product_variants SET image = NULL, valueCode = ? WHERE id = ?')
  for (const r of bad) upd.run(r.valueCode || r.image, r.id)
})
tx()
console.log('\n已修正', bad.length, '条')
db.prepare('SELECT productId, label, price, image, valueCode FROM product_variants').all()
  .forEach(r => console.log(`  ${r.productId} | ${r.label} | $${r.price} | image=${JSON.stringify(r.image)} | code=${JSON.stringify(r.valueCode)}`))
