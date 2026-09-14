// 依据真实商品价与历史订单，算建议的免邮门槛
const path = require('path')
const Database = require('better-sqlite3')
const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

const prods = db.prepare('SELECT nameEn, name, price, originalPrice FROM products WHERE active = 1').all()
console.log('=== 在售商品价格 ===')
let sum = 0
prods.forEach(p => { sum += p.price; console.log(`  $${String(p.price).padStart(7)}  ${(p.nameEn || p.name).slice(0, 40)}`) })
const avg = prods.length ? sum / prods.length : 0
console.log(`\n商品均价: $${avg.toFixed(2)}   最低: $${Math.min(...prods.map(p => p.price)).toFixed(2)}   最高: $${Math.max(...prods.map(p => p.price)).toFixed(2)}`)

// 历史订单客单价
try {
  const rows = db.prepare('SELECT id, totalAmount, status FROM orders').all()
  const valid = rows.filter(o => !['cancelled', 'refunded'].includes(o.status))
  const amts = valid.map(o => Number(o.totalAmount) || 0).filter(a => a > 0)
  console.log(`\n=== 历史订单 ===`)
  console.log(`  订单数: ${rows.length}   有效: ${valid.length}`)
  if (amts.length) {
    const aov = amts.reduce((a, b) => a + b, 0) / amts.length
    const sorted = [...amts].sort((a, b) => a - b)
    console.log(`  客单价 AOV: $${aov.toFixed(2)}`)
    console.log(`  中位数: $${sorted[Math.floor(sorted.length / 2)].toFixed(2)}`)
    console.log(`  区间: $${sorted[0].toFixed(2)} ~ $${sorted[sorted.length - 1].toFixed(2)}`)
  } else {
    console.log('  (暂无有效金额)')
  }
} catch (e) { console.log('订单读取失败:', e.message) }

// 分区
const s = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='site_settings'").get().value)
console.log('\n=== 当前分区 ===')
;(s.shippingZones || []).forEach(z => {
  console.log(`  ${String(z.name).padEnd(22)} 运费 $${String(z.baseCost).padStart(6)}  免邮门槛 $${String(z.freeThreshold).padStart(7)}   = 客单价${(z.freeThreshold / avg).toFixed(1)}倍 / ${(z.freeThreshold / z.baseCost).toFixed(1)}件运费`)
})

// 建议：以「2 件均价」为基准，按各分区运费成本等比缩放
console.log('\n=== 建议门槛（以 2 件均价为锚，按运费成本等比）===')
const anchor = Math.round((avg * 2) / 10) * 10
console.log(`  锚点 = 2 × 均价 = $${(avg * 2).toFixed(2)} → 取整 $${anchor}`)
const baseRef = (s.shippingZones || [])[0]?.baseCost || 34.72
;(s.shippingZones || []).forEach(z => {
  const scaled = Math.round((anchor * (z.baseCost / baseRef)) / 10) * 10 - 1
  console.log(`  ${String(z.name).padEnd(22)} $${String(z.freeThreshold).padStart(7)} → 建议 $${scaled}`)
})
db.close()
