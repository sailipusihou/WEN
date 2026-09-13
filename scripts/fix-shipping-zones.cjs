/**
 * 修复分区配置：从「非通配分区」里移除 "Other"
 *
 * 问题：Europe 分区的 countries 里混进了 "Other"，而它在数组中排在
 * 「Rest of World」之前，getShippingZoneForCountry 用的是 Array.find()，
 * 于是 country=Other 永远先命中 Europe —— 收 $48.61 而不是 $55.56，
 * 免邮门槛也按 555.56 而非 694.44 判定。非洲/南美/中东/印度等客户都受影响。
 *
 * 规则：一个分区如果除了 "Other" 还有别的国家，那它是具体分区，不该含通配；
 *       只有「国家列表里仅有 Other」的分区才是通配分区。
 *
 * 用法：node fix-shipping-zones.cjs [--apply]
 */
const path = require('path')
const Database = require('better-sqlite3')

const APPLY = process.argv.includes('--apply')
const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const row = db.prepare("SELECT value FROM settings WHERE key='site_settings'").get()
if (!row || !row.value) { console.log('未找到 site_settings'); process.exit(1) }

const s = JSON.parse(row.value)
const zones = s.shippingZones || []

console.log('=== 修复前 ===')
zones.forEach((z, i) => console.log(`  [${i}] ${z.name.padEnd(22)} 国家=${JSON.stringify(z.countries)}`))

let changed = 0
for (const z of zones) {
  const list = z.countries || []
  const isCatchAll = list.length === 1 && String(list[0]).toLowerCase() === 'other'
  if (isCatchAll) continue
  const before = list.length
  z.countries = list.filter(c => String(c).toLowerCase() !== 'other')
  if (z.countries.length !== before) {
    console.log(`  修正: ${z.name} 移除 "Other" (${before} → ${z.countries.length} 个国家)`)
    changed++
  }
}

console.log('\n=== 修复后 ===')
zones.forEach((z, i) => console.log(`  [${i}] ${z.name.padEnd(22)} 国家=${JSON.stringify(z.countries)}`))

// 预演命中结果
const match = (country) => {
  const z = zones.find(x => (x.countries || []).some(c => String(c).toLowerCase() === String(country).toLowerCase()))
  return z
}
console.log('\n=== 命中预演 ===')
for (const c of ['United States', 'United Kingdom', 'Japan', 'Other', 'India']) {
  const z = match(c)
  console.log(`  ${c.padEnd(16)} → ${z ? `${z.name} (运费 $${z.baseCost} / 免邮 $${z.freeThreshold})` : '无匹配 → 回退默认'}`)
}

if (!APPLY) { console.log('\n只报告模式，加 --apply 执行'); db.close(); process.exit(0) }
if (!changed) { console.log('\n无需修改'); db.close(); process.exit(0) }

s.shippingZones = zones
db.prepare("UPDATE settings SET value = ?, updatedAt = datetime('now') WHERE key='site_settings'").run(JSON.stringify(s))
console.log(`\n✅ 已写入 ${changed} 处修改 —— 请执行 pm2 restart lowflame 让缓存失效`)
db.close()
