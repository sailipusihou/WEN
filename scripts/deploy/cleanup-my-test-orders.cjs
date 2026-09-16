/**
 * cleanup-my-test-orders.cjs —— 删除我测试时产生的订单
 *
 * 判定依据（必须同时满足，避免误删真实客户订单）：
 *   1. 没有邮箱（customerEmail 为空）—— 真实结账页 Email 是必填，不可能为空
 *   2. 未付款（paymentStatus = 'unpaid'）
 *   3. 只有 paypalOrderId、没有真实交易记录（amount/fee/netAmount 都缺）
 *      —— 说明是"点了 PayPal 但没完成付款"的中间态
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   node /root/clean-mytest.cjs dry
 *   node /root/clean-mytest.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const all = db.prepare(`
  SELECT id, orderNo, customerEmail, customerName, status, paymentStatus, totalAmount, createdAt, paypalTransaction, notes
  FROM orders ORDER BY createdAt DESC
`).all()

console.log('=== 全部订单（' + all.length + ' 张）===')
all.forEach(o => {
  let pt = null
  try { pt = o.paypalTransaction ? JSON.parse(o.paypalTransaction) : null } catch {}
  const tag = []
  if (!o.customerEmail) tag.push('无邮箱')
  if (o.paymentStatus === 'unpaid') tag.push('未付款')
  if (pt && typeof pt.amount !== 'number') tag.push('PayPal未完成')
  console.log(`  ${o.orderNo.padEnd(28)} ${String(o.customerEmail || '(空)').padEnd(26)} $${String(o.totalAmount).padEnd(9)} ${o.status}/${o.paymentStatus}  ${String(o.createdAt).slice(0, 16)}  ${tag.join(' · ')}`)
})

// 判定：三条同时满足才算我的测试单
const targets = all.filter(o => {
  if (o.customerEmail && String(o.customerEmail).trim()) return false   // 有邮箱 → 真实客户
  if (o.paymentStatus !== 'unpaid') return false                        // 已付款 → 绝对不动
  let pt = null
  try { pt = o.paypalTransaction ? JSON.parse(o.paypalTransaction) : null } catch {}
  const paypalIncomplete = pt && typeof pt.amount !== 'number'
  const noPaypalAtAll = !o.paypalTransaction
  return paypalIncomplete || noPaypalAtAll
})

console.log('\n=== 判定为「测试订单」的（无邮箱 + 未付款 + 无真实交易）===')
if (!targets.length) console.log('  （没有）')
targets.forEach(o => console.log(`  ${o.orderNo}  $${o.totalAmount}  ${String(o.createdAt).slice(0, 19)}`))

console.log('\n=== 保留的订单（不动）===')
all.filter(o => !targets.includes(o)).forEach(o => console.log(`  ${o.orderNo}  ${o.customerEmail || '(无邮箱)'}  $${o.totalAmount}  ${o.status}/${o.paymentStatus}`))

if (mode !== 'run') {
  console.log(`\n[dry run] 将删除 ${targets.length} 张。加参数 run 才执行。`)
  process.exit(0)
}
if (!targets.length) { console.log('\n无需删除'); process.exit(0) }

const backup = []
const tx = db.transaction(() => {
  for (const o of targets) {
    const rec = { order: db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id), children: {} }
    for (const t of ['order_items', 'order_status_history', 'shipments']) {
      try {
        const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
        if (!cols.includes('orderId')) continue
        rec.children[t] = db.prepare(`SELECT * FROM ${t} WHERE orderId = ?`).all(o.id)
        db.prepare(`DELETE FROM ${t} WHERE orderId = ?`).run(o.id)
      } catch { /* ignore */ }
    }
    db.prepare('DELETE FROM orders WHERE id = ?').run(o.id)
    backup.push(rec)
  }
})
fs.writeFileSync('/root/deleted-my-test-orders-' + Date.now() + '.json', JSON.stringify(backup, null, 2))
tx()

console.log(`\n✅ 已删除 ${targets.length} 张测试订单`)
console.log('剩余订单:', db.prepare('SELECT COUNT(*) n FROM orders').get().n)
db.prepare('SELECT orderNo, customerEmail, status, paymentStatus, totalAmount FROM orders ORDER BY createdAt DESC').all()
  .forEach(o => console.log(`  ${o.orderNo}  ${o.customerEmail || '(无邮箱)'}  $${o.totalAmount}  ${o.status}/${o.paymentStatus}`))
