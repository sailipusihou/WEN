/**
 * 批量调整各分区免邮门槛
 *
 * 依据：线上真实客单价 AOV $150.74 / 中位数 $129.17，而原门槛 $416.67 是客单价的
 * 2.76 倍，需要凑 5–6 件才免邮 —— 等于几乎无人可达，进度条只会一直显示"还差 $342"。
 *
 * 新值按「1.3~1.9 倍客单价」设定，让客户处于"差一点就到"的位置：
 *   United States & Canada  $416.67 → $199
 *   Asia Pacific            $486.11 → $229
 *   Europe                  $555.56 → $249
 *   Rest of World           $694.44 → $279
 *
 * 用法：node set-free-thresholds.cjs                （只报告）
 *       node set-free-thresholds.cjs --apply        （写入）
 *       node set-free-thresholds.cjs --apply 199 249 229 279   （自定义，按分区顺序）
 */
const path = require('path')
const Database = require('better-sqlite3')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const custom = args.filter(a => /^\d+(\.\d+)?$/.test(a)).map(Number)

const isCatchAll = (z) => (z.countries || []).length === 1 && String(z.countries[0]).toLowerCase() === 'other'
const DEFAULTS = { 'United States & Canada': 199, 'Asia Pacific': 229, 'Europe': 249, 'Rest of World': 279 }

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const row = db.prepare("SELECT value FROM settings WHERE key='site_settings'").get()
if (!row?.value) { console.log('未找到 site_settings'); process.exit(1) }
const s = JSON.parse(row.value)
const zones = s.shippingZones || []

// 无自定义值时，按「具体分区优先、通配分区最后」的顺序套用默认值
const order = [...zones.filter(z => !isCatchAll(z)), ...zones.filter(isCatchAll)]
const plan = new Map()
if (custom.length === order.length) {
  order.forEach((z, i) => plan.set(z.id || z.name, custom[i]))
} else {
  order.forEach((z, i) => {
    const v = DEFAULTS[z.name]
    if (v) plan.set(z.id || z.name, v)
    else if (custom[i] !== undefined) plan.set(z.id || z.name, custom[i])
  })
}

console.log('=== 调整计划 ===')
let changed = 0
for (const z of zones) {
  const next = plan.get(z.id || z.name)
  const mark = next === undefined ? '（保持）' : next === z.freeThreshold ? '（同值）' : '← 调整'
  if (next !== undefined && next !== z.freeThreshold) changed++
  console.log(`  ${String(z.name).padEnd(22)} $${String(z.freeThreshold).padStart(7)} → ${next === undefined ? String(z.freeThreshold).padStart(7) : '$' + String(next).padStart(6)}  ${mark}`)
  console.log(`      运费 $${z.baseCost} ｜ 免邮后运费占订单比 ${(((z.baseCost) / (next ?? z.freeThreshold)) * 100).toFixed(1)}%`)
}

if (!APPLY) { console.log('\n只报告模式，加 --apply 执行'); db.close(); process.exit(0) }
if (!changed) { console.log('\n无需修改'); db.close(); process.exit(0) }

for (const z of zones) {
  const next = plan.get(z.id || z.name)
  if (next !== undefined) z.freeThreshold = next
}
s.shippingZones = zones
db.prepare("UPDATE settings SET value = ?, updatedAt = datetime('now') WHERE key='site_settings'").run(JSON.stringify(s))
console.log(`\n✅ 已写入 ${changed} 个分区 —— 请执行 pm2 restart lowflame`)
db.close()
