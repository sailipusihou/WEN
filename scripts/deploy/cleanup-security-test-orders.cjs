/**
 * cleanup-security-test-orders.cjs - 删除安全测试造的订单
 * （notes 里带 'SECURITY TEST' 的那些）。只删这些，不碰其它数据。
 * 服务器上从 /var/www/lowflame 运行：node /root/cleanup-security-test-orders.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const rows = db.prepare("SELECT id, orderNo, createdAt, notes, totalAmount, customerEmail FROM orders WHERE notes LIKE '%SECURITY TEST%'").all()

console.log('=== 待清理的安全测试订单 ===')
if (!rows.length) console.log('  （无）')
rows.forEach(r => console.log(`  ${r.createdAt.slice(0, 19)}  ${r.orderNo}  $${r.totalAmount}  ${r.customerEmail}  | ${String(r.notes).slice(0, 60)}`))

if (mode !== 'run') { console.log('\n[dry run] 加参数 run 才真删。'); process.exit(0) }
if (!rows.length) process.exit(0)

const backup = []
const tx = db.transaction(() => {
  for (const r of rows) {
    backup.push(db.prepare('SELECT * FROM orders WHERE id = ?').get(r.id))
    const kids = {}
    for (const t of ['order_items', 'order_status_history', 'shipments']) {
      try {
        const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name)
        if (!cols.includes('orderId')) continue
        kids[t] = db.prepare(`SELECT * FROM ${t} WHERE orderId = ?`).all(r.id)
        const n = db.prepare(`DELETE FROM ${t} WHERE orderId = ?`).run(r.id).changes
        if (n) console.log(`  删除 ${t} ${n} 行 (${r.orderNo})`)
      } catch { /* 表不存在就跳过 */ }
    }
    backup[backup.length - 1].children = kids
    db.prepare('DELETE FROM orders WHERE id = ?').run(r.id)
    console.log(`  删除 orders 1 行 (${r.orderNo})`)
  }
})
fs.writeFileSync('/root/deleted-security-test-orders.json', JSON.stringify(backup, null, 2))
tx()
console.log('\n备份: /root/deleted-security-test-orders.json')
console.log('剩余订单总数:', db.prepare('SELECT COUNT(*) n FROM orders').get().n)
