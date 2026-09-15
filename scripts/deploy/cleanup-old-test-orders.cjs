/**
 * cleanup-old-test-orders.cjs —— 清理早期种子/测试数据订单。
 *
 * 目标（按用户确认）：OTM-TEST-* 系列 + 邮箱为 example.com 的测试单。
 * 这些都不是真实客户：orderNo 里直接写着 TEST，或邮箱是 RFC 保留的 example.com。
 * 真实客户的订单（qq.com / 163.com / gmail.com 等）一律不动。
 *
 * 用法（服务器上从 /var/www/lowflame）：
 *   node /root/cleanup-old-test-orders.cjs dry
 *   node /root/cleanup-old-test-orders.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const rows = db.prepare(`
  SELECT id, orderNo, createdAt, status, paymentStatus, totalAmount, customerEmail, paypalTransaction
  FROM orders
  WHERE orderNo LIKE 'OTM-TEST-%'
     OR customerEmail LIKE '%@example.com'
  ORDER BY createdAt DESC
`).all()

console.log('=== 待清理（种子/测试数据）===')
if (!rows.length) console.log('  （无）')
for (const r of rows) {
  const pp = String(r.paypalTransaction || '')
  const hasPaypal = pp && pp !== 'null' && pp !== '{}'
  console.log(`  ${String(r.createdAt).slice(0, 19)}  ${String(r.orderNo).padEnd(24)}  ${String(r.status).padEnd(10)} ${String(r.paymentStatus).padEnd(8)} $${String(r.totalAmount).padEnd(9)} ${r.customerEmail}${hasPaypal ? '  ⚠含PayPal交易记录' : ''}`)
}

// 安全检查：绝不能删真实已付款订单
const paid = rows.filter(r => r.paymentStatus === 'paid')
if (paid.length) {
  console.log(`\n⚠️ 其中 ${paid.length} 张标记为已付款 —— 已中止，请人工确认后再处理。`)
  process.exit(2)
}

if (mode !== 'run') {
  console.log(`\n[dry run] 共 ${rows.length} 张，加参数 run 才真删。`)
  process.exit(0)
}

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
fs.writeFileSync('/root/deleted-old-test-orders.json', JSON.stringify(backup, null, 2))
tx()

console.log(`\n已删除 ${rows.length} 张，备份: /root/deleted-old-test-orders.json`)
console.log('剩余订单总数:', db.prepare('SELECT COUNT(*) n FROM orders').get().n)
const left = db.prepare("SELECT orderNo, customerEmail, status, paymentStatus, totalAmount FROM orders ORDER BY createdAt DESC").all()
console.log('\n剩余订单:')
left.forEach(o => console.log(`  ${o.orderNo}  ${o.status}/${o.paymentStatus}  $${o.totalAmount}  ${o.customerEmail}`))
