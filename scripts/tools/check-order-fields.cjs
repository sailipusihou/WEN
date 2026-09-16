/**
 * check-order-fields.cjs —— 查订单对象里到底有没有 orderNo 字段
 * （催付邮件里用了 o.orderNo，如果为空，邮件会写成 "Order reference: undefined"）
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

console.log('=== 数据库里的原始字段 ===')
const rows = db.prepare('SELECT id, orderNo, customerEmail, status, paymentStatus, totalAmount, lastReminderAt, reminderCount FROM orders ORDER BY createdAt DESC').all()
rows.forEach(r => {
  console.log(`  id=${JSON.stringify(r.id)}`)
  console.log(`    orderNo=${JSON.stringify(r.orderNo)}  email=${JSON.stringify(r.customerEmail)}`)
  console.log(`    status=${r.status}/${r.paymentStatus}  total=${r.totalAmount}`)
  console.log(`    催付记录: lastReminderAt=${JSON.stringify(r.lastReminderAt)} count=${JSON.stringify(r.reminderCount)}`)
})
