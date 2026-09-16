/**
 * check-paypal-tx.cjs —— 确认"点开报错"的订单里 paypalTransaction 到底存了什么
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })
const orders = db.prepare('SELECT orderNo, customerEmail, paymentStatus, paypalTransaction FROM orders ORDER BY createdAt DESC').all()

console.log('=== 每张订单的 paypalTransaction 内容 ===')
for (const o of orders) {
  console.log('\n' + '─'.repeat(66))
  console.log(`订单: ${o.orderNo}  (${o.customerEmail || '无邮箱'})  付款状态: ${o.paymentStatus}`)
  if (!o.paypalTransaction) {
    console.log('  paypalTransaction: (空) → 渲染时不会进那个分支，安全')
    continue
  }
  let pt = null
  try { pt = JSON.parse(o.paypalTransaction) } catch { console.log('  ⚠️ 不是合法 JSON:', String(o.paypalTransaction).slice(0, 120)); continue }
  console.log('  原始值:', JSON.stringify(pt))
  console.log('  字段检查:')
  for (const k of ['amount', 'fee', 'netAmount', 'status', 'transactionId', 'paypalOrderId', 'captureId']) {
    const v = pt[k]
    const ok = v !== undefined && v !== null
    const isNum = typeof v === 'number'
    const need = ['amount', 'fee', 'netAmount'].includes(k)
    let flag = ''
    if (need) flag = isNum ? ' ✅ 数字' : ` ❌ 会导致 toFixed 崩溃（${v === undefined ? 'undefined' : typeof v}）`
    else flag = ok ? ' —' : ' (空)'
    console.log(`    ${k.padEnd(16)} = ${JSON.stringify(v)}${flag}`)
  }
}

console.log('\n\n=== 结论 ===')
let crash = 0
for (const o of orders) {
  if (!o.paypalTransaction) continue
  let pt = null
  try { pt = JSON.parse(o.paypalTransaction) } catch { continue }
  const bad = ['amount', 'fee', 'netAmount'].filter(k => typeof pt[k] !== 'number')
  if (bad.length) {
    crash++
    console.log(`  ❌ ${o.orderNo} 缺少字段: ${bad.join(', ')} → 后台展开时会崩溃`)
  }
}
console.log(`\n  会导致后台崩溃的订单: ${crash} 张`)
