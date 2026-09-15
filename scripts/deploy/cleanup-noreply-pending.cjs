/**
 * cleanup-noreply-pending.cjs —— 清掉「没有邮箱的 pending/unpaid 测试单」。
 * 真实客户下单必然留邮箱（结算页 Email 是必填），所以没有邮箱的 pending 单一定是测试残留。
 * 用法：node /root/cleanup-noreply-pending.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const rows = db.prepare(`
  SELECT id, orderNo, createdAt, status, paymentStatus, totalAmount, customerEmail
  FROM orders
  WHERE (customerEmail IS NULL OR TRIM(customerEmail) = '')
    AND paymentStatus != 'paid'
`).all()

console.log('=== 无邮箱的未付款订单 ===')
if (!rows.length) console.log('  （无）')
rows.forEach(r => console.log(`  ${String(r.createdAt).slice(0, 19)}  ${r.orderNo}  ${r.status}/${r.paymentStatus}  $${r.totalAmount}`))

if (mode !== 'run') { console.log(`\n[dry run] 共 ${rows.length} 张。`); process.exit(0) }
if (!rows.length) process.exit(0)

const backup = []
const tx = db.transaction(() => {
  for (const r of rows) {
    const rec = { order: db.prepare('SELECT * FROM orders WHERE id = ?').get(r.id), children: {} }
    for (const t of ['order_items', 'order_status_history', 'shipments']) {
      try {
        const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
        if (!cols.includes('orderId')) continue
        rec.children[t] = db.prepare(`SELECT * FROM ${t} WHERE orderId = ?`).all(r.id)
        db.prepare(`DELETE FROM ${t} WHERE orderId = ?`).run(r.id)
      } catch { /* ignore */ }
    }
    db.prepare('DELETE FROM orders WHERE id = ?').run(r.id)
    backup.push(rec)
  }
})
fs.writeFileSync('/root/deleted-noreply-pending.json', JSON.stringify(backup, null, 2))
tx()

console.log(`\n已删除 ${rows.length} 张，备份: /root/deleted-noreply-pending.json`)
console.log('剩余订单总数:', db.prepare('SELECT COUNT(*) n FROM orders').get().n)
db.prepare('SELECT orderNo, customerEmail, status, paymentStatus, totalAmount FROM orders ORDER BY createdAt DESC').all()
  .forEach(o => console.log(`  ${o.orderNo}  ${o.status}/${o.paymentStatus}  $${o.totalAmount}  ${o.customerEmail}`))
