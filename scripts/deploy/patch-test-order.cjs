/**
 * patch-test-order.cjs —— 把测试订单的 paypalTransaction 改成"触发崩溃的坏形状"，
 * 用于验证代码修复是否真的扛得住。
 * 用法（服务器上从 /var/www/lowflame）：
 *   node /root/patchtest.cjs patch        # 改成坏形状
 *   node /root/patchtest.cjs clean        # 删除测试订单
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'patch'

const target = db.prepare(`
  SELECT id, orderNo, paypalTransaction, notes FROM orders
  WHERE notes LIKE '%ZZ CRASHTEST%' OR customerEmail = 'zz-crashtest@example.com'
  ORDER BY createdAt DESC
`).all()

console.log('=== 匹配到的测试订单 ===')
if (!target.length) { console.log('  （无）'); process.exit(0) }
target.forEach(o => console.log(`  ${o.orderNo}  pt=${o.paypalTransaction}`))

if (mode === 'patch') {
  const bad = JSON.stringify({ paypalOrderId: 'ZZ-TEST-CRASH-0001' })
  for (const o of target) {
    db.prepare('UPDATE orders SET paypalTransaction = ?, paymentMethod = ?, paymentStatus = ? WHERE id = ?')
      .run(bad, 'paypal', 'unpaid', o.id)
    console.log(`  ✅ ${o.orderNo} → paypalTransaction 已改为 ${bad}`)
  }
  console.log('\n现在这张订单的数据形状 === 之前导致整个后台崩溃的那种')
  console.log('     {"paypalOrderId":"ZZ-TEST-CRASH-0001"}   （没有 amount/fee/netAmount）')
} else if (mode === 'clean') {
  const tx = db.transaction(() => {
    for (const o of target) {
      for (const t of ['order_items', 'order_status_history', 'shipments']) {
        try {
          const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
          if (cols.includes('orderId')) db.prepare(`DELETE FROM ${t} WHERE orderId = ?`).run(o.id)
        } catch {}
      }
      db.prepare('DELETE FROM orders WHERE id = ?').run(o.id)
      console.log(`  🗑️ 已删除 ${o.orderNo}`)
    }
  })
  tx()
  console.log('\n剩余订单:', db.prepare('SELECT COUNT(*) n FROM orders').get().n)
}
