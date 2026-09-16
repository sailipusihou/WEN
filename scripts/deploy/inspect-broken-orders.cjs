/**
 * inspect-broken-orders.cjs —— 查那几张"点开报错"的订单，看哪个字段是 undefined
 * 用法（服务器上从 /var/www/lowflame）：
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/inspect-orders.cjs
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

console.log('======================================================================')
console.log(' 有问题的订单：字段完整性检查')
console.log('======================================================================')

const orders = db.prepare(`
  SELECT id, orderNo, customerEmail, status, paymentStatus, subtotal, shippingCost, totalAmount,
         createdAt, paypalTransaction, returnInfo, items
  FROM orders ORDER BY createdAt DESC
`).all()

console.log('\n订单总数:', orders.length)

for (const o of orders) {
  console.log('\n──────────────────────────────────────────────────────────────')
  console.log(`订单号 : ${o.orderNo}`)
  console.log(`内部ID : ${o.id}`)
  console.log(`邮箱   : ${o.customerEmail || '(空)'}`)
  console.log(`状态   : ${o.status} / ${o.paymentStatus}`)
  console.log(`金额   : subtotal=${o.subtotal} shippingCost=${o.shippingCost} totalAmount=${o.totalAmount}`)
  console.log(`创建于 : ${o.createdAt}`)

  // 字段类型诊断
  const issues = []
  if (typeof o.subtotal !== 'number') issues.push(`subtotal 不是数字（${typeof o.subtotal}）`)
  if (typeof o.shippingCost !== 'number') issues.push(`shippingCost 不是数字（${typeof o.shippingCost}）`)
  if (typeof o.totalAmount !== 'number') issues.push(`totalAmount 不是数字（${typeof o.totalAmount}）`)

  // paypalTransaction
  let pt = null
  try { pt = o.paypalTransaction ? JSON.parse(o.paypalTransaction) : null } catch { issues.push('paypalTransaction 不是合法 JSON') }
  if (pt) {
    if (typeof pt.amount !== 'number') issues.push(`paypalTransaction.amount 不是数字（${typeof pt.amount}＝${pt.amount}）`)
    if (typeof pt.fee !== 'number') issues.push(`paypalTransaction.fee 不是数字（${typeof pt.fee}＝${pt.fee}）`)
    if (typeof pt.netAmount !== 'number') issues.push(`paypalTransaction.netAmount 不是数字（${typeof pt.netAmount}＝${pt.netAmount}）`)
  }

  // returnInfo
  let ri = null
  try { ri = o.returnInfo ? JSON.parse(o.returnInfo) : null } catch { issues.push('returnInfo 不是合法 JSON') }
  if (ri && ri.refundAmount !== undefined && typeof ri.refundAmount !== 'number') {
    issues.push(`returnInfo.refundAmount 不是数字（${typeof ri.refundAmount}）`)
  }

  // 明细：优先看 order_items 表，其次看 orders.items 字段
  let items = []
  const tableItems = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(o.id)
  if (tableItems.length) {
    items = tableItems
    console.log(`明细来源 : order_items 表（${tableItems.length} 条）`)
  } else if (o.items) {
    try { items = JSON.parse(o.items) } catch {}
    console.log(`明细来源 : orders.items 字段（${items.length} 条）`)
  } else {
    console.log('明细来源 : 无')
    issues.push('没有任何商品明细')
  }

  console.log('明细内容 :')
  items.forEach((it, i) => {
    console.log(`  [${i + 1}] name=${it.name || it.nameEn || '(空)'} price=${JSON.stringify(it.price)} qty=${JSON.stringify(it.quantity)} subtotal=${JSON.stringify(it.subtotal)}`)
    if (typeof it.price !== 'number') issues.push(`明细[${i + 1}].price 不是数字（${typeof it.price}）→ 前台渲染会崩`)
    if (typeof it.quantity !== 'number') issues.push(`明细[${i + 1}].quantity 不是数字（${typeof it.quantity}）`)
  })

  // orders.items 字段本身是否合法 JSON
  if (o.items) {
    try { JSON.parse(o.items) } catch { issues.push('orders.items 不是合法 JSON') }
  }

  if (issues.length) {
    console.log('⚠️ 发现的问题:')
    issues.forEach(x => console.log('   · ' + x))
  } else {
    console.log('✅ 字段完整')
  }
}

console.log('\n======================================================================')
console.log(' 汇总：哪些订单会让后台订单页崩溃')
console.log('======================================================================')
let bad = 0
for (const o of orders) {
  const tableItems = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(o.id)
  let items = tableItems
  if (!items.length && o.items) { try { items = JSON.parse(o.items) } catch { items = [] } }
  const broken = items.some(it => typeof it.price !== 'number' || typeof it.quantity !== 'number')
  if (broken || typeof o.totalAmount !== 'number') {
    bad++
    console.log(`  ❌ ${o.orderNo}  ${o.customerEmail || '(无邮箱)'}  $${o.totalAmount}`)
  }
}
console.log(`\n  会崩溃的订单: ${bad} 张 / 共 ${orders.length} 张`)
