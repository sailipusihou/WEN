/**
 * dump-orders-schema.cjs —— 打印 orders 与 order_items 的真实表结构，
 * 并抽样看几条订单的原始数据（找出哪个字段是 undefined）。
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

console.log('=== orders 表结构 ===')
const ocols = db.prepare('PRAGMA table_info(orders)').all()
ocols.forEach(c => console.log(`  ${c.name.padEnd(24)} ${c.type}`))

console.log('\n=== order_items 表结构 ===')
const icols = db.prepare('PRAGMA table_info(order_items)').all()
icols.forEach(c => console.log(`  ${c.name.padEnd(24)} ${c.type}`))

console.log('\n=== 全部订单（关键字段）===')
const orders = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all()
console.log('订单数:', orders.length)

for (const o of orders) {
  console.log('\n' + '─'.repeat(70))
  console.log(`  orderNo      : ${o.orderNo}`)
  console.log(`  id           : ${o.id}`)
  console.log(`  email        : ${o.customerEmail || '(空)'}`)
  console.log(`  status       : ${o.status} / ${o.paymentStatus}`)
  console.log(`  createdAt    : ${o.createdAt}`)
  // 打印所有「金额类」字段及其类型
  for (const c of ocols) {
    if (!/amount|total|subtotal|cost|shipping|price|fee|net/i.test(c.name)) continue
    const v = o[c.name]
    const t = typeof v
    const flag = t === 'number' ? '✅' : (v === null || v === undefined ? '⚠️ 空' : `⚠️ ${t}`)
    console.log(`  ${c.name.padEnd(20)}: ${JSON.stringify(v)}  ${flag}`)
  }
  // paypalTransaction 内容
  if (o.paypalTransaction) {
    let pt = null
    try { pt = JSON.parse(o.paypalTransaction) } catch { pt = '(非法JSON)' }
    console.log(`  paypalTransaction: ${JSON.stringify(pt).slice(0, 220)}`)
    if (pt && typeof pt === 'object') {
      for (const k of ['amount', 'fee', 'netAmount', 'captureId', 'paypalOrderId']) {
        const v = pt[k]
        console.log(`      .${k.padEnd(14)} = ${JSON.stringify(v)} (${typeof v})`)
      }
    }
  }
  // 明细
  const items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(o.id)
  console.log(`  明细（order_items 表）: ${items.length} 条`)
  items.forEach((it, i) => {
    console.log(`    [${i + 1}] ${JSON.stringify(it).slice(0, 220)}`)
  })
}

console.log('\n\n=== 结论：找出会崩溃的订单 ===')
for (const o of orders) {
  const items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(o.id)
  const probs = []
  if (typeof o.totalAmount !== 'number') probs.push(`totalAmount=${JSON.stringify(o.totalAmount)}(${typeof o.totalAmount})`)
  items.forEach((it, i) => {
    const priceCol = icols.find(c => c.name === 'price')
    const qtyCol = icols.find(c => c.name === 'quantity')
    if (priceCol && typeof it.price !== 'number') probs.push(`items[${i + 1}].price=${JSON.stringify(it.price)}(${typeof it.price})`)
    if (qtyCol && typeof it.quantity !== 'number') probs.push(`items[${i + 1}].quantity=${JSON.stringify(it.quantity)}(${typeof it.quantity})`)
  })
  if (probs.length) console.log(`  ❌ ${o.orderNo}  ${o.customerEmail || '(无邮箱)'}  → ${probs.join(', ')}`)
  else console.log(`  ✅ ${o.orderNo}  字段正常`)
}
