/**
 * audit-orders2.cjs - after unban: check for real customer orders and the state
 * of the leftover automated-test orders. Read-only.
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

const rows = db.prepare(`
  SELECT orderNo, createdAt, status, paymentStatus, paymentMethod, totalAmount, currency,
         customerEmail, paypalTransaction
  FROM orders ORDER BY createdAt DESC LIMIT 20
`).all()

console.log('最近 20 张订单:')
for (const r of rows) {
  const pp = String(r.paypalTransaction || '')
  console.log(
    ` ${String(r.createdAt).slice(0, 19)}  ${String(r.orderNo).padEnd(24)}  ` +
    `${String(r.status).padEnd(11)} ${String(r.paymentStatus || '-').padEnd(9)} ` +
    `${String(r.paymentMethod || '-').padEnd(8)} ${r.currency || ''}${String(r.totalAmount).padEnd(9)} ` +
    `${(r.customerEmail || '').slice(0, 28)}` + (pp && pp !== 'null' ? '  [PayPal]' : '')
  )
}

console.log('\n按状态汇总:')
db.prepare('SELECT status, COUNT(*) n FROM orders GROUP BY status').all()
  .forEach(s => console.log(`  ${s.status}: ${s.n}`))

console.log('\n需要我清理的自动化测试订单:')
const junk = db.prepare(`
  SELECT orderNo, createdAt, customerEmail FROM orders
  WHERE customerEmail LIKE '%john.smith@example.com%'
`).all()
junk.forEach(j => console.log(`  ${String(j.createdAt).slice(0, 19)}  ${j.orderNo}  ${j.customerEmail}`))

// 当前设置里的钱包开关状态
const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
const s = JSON.parse(row.value)
console.log('\n钱包开关当前状态:')
console.log('  paypalWalletsEnabled   =', s.paypalWalletsEnabled === true)
console.log('  paypalApplePayEnabled  =', s.paypalApplePayEnabled !== false)
console.log('  paypalGooglePayEnabled =', s.paypalGooglePayEnabled !== false)
