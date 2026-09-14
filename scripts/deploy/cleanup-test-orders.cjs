/**
 * cleanup-test-orders.cjs - delete the automated-test orders I created,
 * including their child rows, and report what else looks like test data.
 *
 * Usage (server, from /var/www/lowflame):
 *   node /root/cleanup-test-orders.cjs dry    # 只报告，不删
 *   node /root/cleanup-test-orders.cjs run    # 真删
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

// 我这次自动化测试留下的（确认是我建的）
const MINE = ['OTM-MU0XO1XU-826FD821E126', 'OTM-MU0XHKQA-D6915D60EA9B']

function childTables(orderId) {
  const out = []
  for (const t of ['order_items', 'order_status_history', 'shipments']) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
      if (cols.includes('orderId')) out.push({ table: t, col: 'orderId', cols })
    } catch { /* ignore */ }
  }
  return out
}

console.log('=== 待清理（我建的自动化测试订单）===')
const targets = db.prepare(
  `SELECT id, orderNo, createdAt, status, paymentStatus, totalAmount, customerEmail, paypalTransaction
   FROM orders WHERE orderNo IN (${MINE.map(() => '?').join(',')})`
).all(...MINE)

if (!targets.length) { console.log('  （没有找到，可能已经清过了）'); }
for (const t of targets) {
  console.log(`  ${t.createdAt.slice(0, 19)}  ${t.orderNo}  ${t.status}/${t.paymentStatus}  ${t.currency || ''}${t.totalAmount}  ${t.customerEmail}`)
  const kids = childTables(t.id)
  for (const k of kids) {
    const n = db.prepare(`SELECT COUNT(*) n FROM ${k.table} WHERE ${k.col} = ?`).get(t.id).n
    console.log(`      └ ${k.table}: ${n} 行`)
  }
  const pp = String(t.paypalTransaction || '')
  if (pp && pp !== 'null') {
    console.log(`      └ PayPal 交易记录: ${pp.slice(0, 120)}`)
  }
}

console.log('\n=== 其他看起来像测试数据的订单（没动，等你确认）===')
const others = db.prepare(`
  SELECT orderNo, createdAt, status, customerEmail FROM orders
  WHERE customerEmail LIKE '%example.com%' OR orderNo LIKE 'OTM-TEST-%' OR customerEmail LIKE '%test%'
  ORDER BY createdAt DESC
`).all()
for (const o of others) {
  if (MINE.includes(o.orderNo)) continue
  console.log(`  ${o.createdAt.slice(0, 19)}  ${String(o.orderNo).padEnd(24)}  ${String(o.status).padEnd(10)} ${o.customerEmail}`)
}
console.log(`  合计 ${others.filter(o => !MINE.includes(o.orderNo)).length} 张`)

if (mode !== 'run') {
  console.log('\n[dry run] 没有做任何修改。加参数 run 才会真删。')
  process.exit(0)
}

// 备份后删除
const backup = { orders: [], children: {} }
const tx = db.transaction(() => {
  for (const t of targets) {
    backup.orders.push(db.prepare('SELECT * FROM orders WHERE id = ?').get(t.id))
    for (const k of childTables(t.id)) {
      const rows = db.prepare(`SELECT * FROM ${k.table} WHERE ${k.col} = ?`).all(t.id)
      if (!backup.children[k.table]) backup.children[k.table] = []
      backup.children[k.table].push(...rows)
      const r = db.prepare(`DELETE FROM ${k.table} WHERE ${k.col} = ?`).run(t.id)
      console.log(`  删除 ${k.table} ${r.changes} 行 (${t.orderNo})`)
    }
    const r = db.prepare('DELETE FROM orders WHERE id = ?').run(t.id)
    console.log(`  删除 orders ${r.changes} 行 (${t.orderNo})`)
  }
})
fs.writeFileSync('/root/deleted-test-orders-backup.json', JSON.stringify(backup, null, 2))
tx()

console.log('\n备份已存到 /root/deleted-test-orders-backup.json（万一要恢复）')
console.log('剩余订单总数:', db.prepare('SELECT COUNT(*) n FROM orders').get().n)
