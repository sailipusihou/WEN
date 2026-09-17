// 冒烟测试: 发货通知客户 (后台手动发送) —— 邮件 / 站内消息
// ⚠️ 仅用于本地开发库: 会临时创建测试订单/发货单 (结束后自动清理), 请勿在服务器上运行。
//    用法: 先本地 `npm run build && npx next start -p 3100`, 再 `node scripts/smoke-shipment-notify.mjs`
import { execFileSync } from 'child_process'
import Database from 'better-sqlite3'

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3100'
const DB_PATH = 'data/site.db'
const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`)
}

const NOW = new Date().toISOString()
const db = new Database(DB_PATH)
const created = { orders: [], shipments: [], messages: [] }

function makeOrder(id, email, name) {
  db.prepare(`INSERT OR REPLACE INTO orders (id, orderNo, userId, status, totalAmount, currency, subtotal, shipping, tax, discount,
      customerName, customerEmail, userEmail, shippingName, shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry,
      createdAt, updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, id, null, 'processing', 99.5, 'USD', 99.5, 0, 0, 0,
    name, email, email, name, '1 Test Street', 'Shenzhen', 'Guangdong', '518000', 'China',
    NOW, NOW
  )
  created.orders.push(id)
}

function makeShipment(id, orderId, tracking) {
  db.prepare(`INSERT OR REPLACE INTO shipments (id, orderId, orderNo, shipmentNo, carrierCode, carrierName, trackingNumber, status, shippedAt, events, createdAt, updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, orderId, orderId, 'SHP-9999', 'yunexpress', 'YunExpress', tracking, 'picked_up', NOW, '[]', NOW, NOW
  )
  created.shipments.push(id)
}

async function notify(adminCookie, shipmentId, channel) {
  const r = await fetch(BASE + '/api/shipments/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ shipmentId, channel }),
  })
  const d = await r.json().catch(() => ({}))
  return { status: r.status, data: d }
}

async function main() {
  const token = execFileSync(process.execPath, ['scripts/new-admin-session.cjs'], {
    encoding: 'utf8',
    // new-admin-session.cjs 默认拒绝执行（无认证即可铸造管理员会话），测试里显式放行
    env: { ...process.env, ALLOW_SESSION_MINT: '1' },
  }).trim().replace(/^NEW_TOKEN=/, '')
  const adminCookie = 'admin_token=' + token
  check('生成管理员会话', token.length === 64, token.slice(0, 12) + '…')

  // ---------- A. 无邮箱订单: 两种渠道都应被挡下 ----------
  makeOrder('ORD-SMOKE-NOMAIL', null, 'No Mail')
  makeShipment('SHP-SMOKE-NOMAIL', 'ORD-SMOKE-NOMAIL', 'SMOKE-NOMAIL-1')
  {
    const a = await notify(adminCookie, 'SHP-SMOKE-NOMAIL', 'email')
    check('无邮箱订单: 邮件被拒', a.status === 400, `${a.status} ${a.data.error || ''}`)
    const b = await notify(adminCookie, 'SHP-SMOKE-NOMAIL', 'message')
    check('无邮箱订单: 站内消息被拒', b.status === 400, `${b.status} ${b.data.error || ''}`)
    const row = db.prepare('SELECT notifiedAt FROM shipments WHERE id = ?').get('SHP-SMOKE-NOMAIL')
    check('失败时不写入已发送记录', !row.notifiedAt, String(row.notifiedAt))
  }

  // ---------- B. 站内消息渠道: 完整链路 ----------
  const msgEmail = 'smoke-notify@example.com'
  makeOrder('ORD-SMOKE-MSG', msgEmail, 'Msg Smoke')
  makeShipment('SHP-SMOKE-MSG', 'ORD-SMOKE-MSG', 'SMOKE-MSG-1')
  {
    const before = db.prepare("SELECT COUNT(*) c FROM messages WHERE email = ? AND source = 'shipment'").get(msgEmail).c
    const r = await notify(adminCookie, 'SHP-SMOKE-MSG', 'message')
    check('站内通知发送成功', r.status === 200 && r.data.ok, `${r.status} ${JSON.stringify(r.data)}`)
    const after = db.prepare("SELECT COUNT(*) c FROM messages WHERE email = ? AND source = 'shipment'").get(msgEmail).c
    check('站内消息已写入', after === before + 1, `${before} → ${after}`)
    const msg = db.prepare("SELECT id,senderType,subject,message FROM messages WHERE email = ? ORDER BY createdAt DESC LIMIT 1").get(msgEmail)
    if (msg) created.messages.push(msg.id)
    check('消息标为管理员发出', msg?.senderType === 'admin', msg?.senderType)
    check('消息含追踪号', (msg?.message || '').includes('SMOKE-MSG-1'), (msg?.message || '').slice(0, 60).replace(/\n/g, ' | '))
    const sh = db.prepare('SELECT notifiedAt, notifiedChannel, notifiedTo FROM shipments WHERE id = ?').get('SHP-SMOKE-MSG')
    check('发货单记录已发送状态', !!sh.notifiedAt && sh.notifiedChannel === 'message' && sh.notifiedTo === msgEmail,
      `${sh.notifiedChannel} ${sh.notifiedTo} ${sh.notifiedAt}`)
  }

  // ---------- C. 邮件渠道: 真实走一次 SMTP (发到站点自己的发件邮箱, 不外发客户) ----------
  const selfEmail = 'noreply@lowflame.store'
  makeOrder('ORD-SMOKE-MAIL', selfEmail, 'Mail Smoke')
  makeShipment('SHP-SMOKE-MAIL', 'ORD-SMOKE-MAIL', 'SMOKE-MAIL-1')
  {
    const r = await notify(adminCookie, 'SHP-SMOKE-MAIL', 'email')
    if (r.status === 200) {
      check('发货通知邮件发送成功', r.data.ok === true, JSON.stringify(r.data))
      const sh = db.prepare('SELECT notifiedAt, notifiedChannel, notifiedTo FROM shipments WHERE id = ?').get('SHP-SMOKE-MAIL')
      check('邮件发送后写入记录', !!sh.notifiedAt && sh.notifiedChannel === 'email', `${sh.notifiedChannel} ${sh.notifiedAt}`)
    } else {
      // SMTP 不可用时的失败路径也必须干净 (不写记录)
      check('邮件失败时不写记录 (SMTP 不可用)', r.status === 502 && !db.prepare('SELECT notifiedAt FROM shipments WHERE id = ?').get('SHP-SMOKE-MAIL').notifiedAt,
        `${r.status} ${r.data.error || ''}`)
    }
  }

  // ---------- D. 参数校验 ----------
  {
    const r = await notify(adminCookie, 'SHP-NOT-EXIST', 'email')
    check('发货单不存在 → 404', r.status === 404, String(r.status))
    const r2 = await notify(adminCookie, 'SHP-SMOKE-MSG', 'telegram')
    check('非法渠道 → 400', r2.status === 400, String(r2.status))
  }

  // ---------- 清理 ----------
  for (const id of created.shipments) db.prepare('DELETE FROM shipments WHERE id = ?').run(id)
  for (const id of created.orders) db.prepare('DELETE FROM orders WHERE id = ?').run(id)
  for (const id of created.messages) db.prepare('DELETE FROM messages WHERE id = ?').run(id)
  console.log('\n测试数据已清理:', created)

  const failed = results.filter(r => !r.ok)
  console.log(`\n===== ${results.length - failed.length}/${results.length} 通过 =====`)
  if (failed.length) { failed.forEach(f => console.log('FAILED:', f.name, f.detail)); process.exit(1) }
}

main().catch(e => { console.error('脚本异常:', e); process.exit(1) })
