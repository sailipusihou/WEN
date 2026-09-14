/**
 * audit-orders.cjs - list recent orders so we can see whether automated
 * checkout tests left unpaid junk orders behind, and what the payment state is.
 * Read-only. Run on the server from /var/www/lowflame.
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

const cols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name)
console.log('orders 列:', cols.join(', '))

const rows = db.prepare(`
  SELECT id, orderNo, createdAt, status, paymentMethod, paymentStatus,
         totalAmount, currency, customerEmail, customerName, shippingName, paypalTransaction
  FROM orders ORDER BY createdAt DESC LIMIT 40
`).all()

console.log('\n最近 40 张订单:')
for (const r of rows) {
  const pp = String(r.paypalTransaction || '')
  console.log(
    ` ${String(r.createdAt).slice(0, 19)}  ${String(r.orderNo || r.id).padEnd(16)}  ` +
    `${String(r.status).padEnd(11)} ${String(r.paymentStatus || '-').padEnd(10)} ` +
    `${String(r.paymentMethod || '-').padEnd(9)} ${r.currency || ''}${r.totalAmount}  ` +
    `${(r.customerEmail || r.shippingName || '').slice(0, 30)}` +
    (pp && pp !== 'null' ? '  [已关联 PayPal 交易]' : '')
  )
}

const byStatus = db.prepare('SELECT status, COUNT(*) n FROM orders GROUP BY status').all()
console.log('\n按状态汇总:')
byStatus.forEach(s => console.log(`  ${s.status}: ${s.n}`))

// 找出明显的测试痕迹
const tests = db.prepare(`
  SELECT COUNT(*) n FROM orders
  WHERE customerEmail LIKE '%example.com%' OR customerEmail LIKE '%test%'
`).get()
console.log(`\n邮箱含 example.com / test 的订单: ${tests.n} 张`)

const ppOrders = db.prepare(`
  SELECT COUNT(*) n FROM orders
  WHERE paypalTransaction IS NOT NULL AND paypalTransaction != '' AND paypalTransaction != 'null'
`).get()
console.log(`已关联 PayPal 交易的订单: ${ppOrders.n} 张`)
