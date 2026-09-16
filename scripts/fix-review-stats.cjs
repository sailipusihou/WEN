/**
 * fix-review-stats.cjs —— 把商品的 rating / reviewCount 订正为真实评价的统计值
 *
 * 问题（实测）：
 *   青瓷茶具套装   存 4.9 / 128 条  →  真实 5.0 / 2 条
 *   水墨山水卷轴   存 4.8 /  56 条  →  真实 5.0 / 1 条
 *   真丝手绣方巾   存 4.7 /   1 条  →  真实 5.0 / 1 条
 *   陶瓷香薰炉 / 竹编落地灯 / 大漆首饰盒 / 手工冷皂：
 *                  存 4.6~4.9 的评分，但一条评价都没有
 *
 * 为什么要改：这个数字不只给客户看，还写进了首页 JSON-LD 的 aggregateRating
 * 提交给搜索引擎。声称 128 条评价而实际只有 2 条，属于编造的信任信号，
 * 可能触发 Google 结构化数据处罚。
 *
 * 订正口径与前台渲染一致：只统计 approved=1 且 hidden=0 且 deleted=0 的评价；
 * 没有可见评价则评分归 0（前台靠 reviewCount > 0 决定是否显示星级）。
 *
 * 用法：node scripts/fix-review-stats.cjs [--apply]
 */
const path = require('path')
const Database = require('better-sqlite3')

const APPLY = process.argv.includes('--apply')
const db = new Database(path.join(process.cwd(), 'data', 'site.db'))

const products = db.prepare('SELECT id, name, nameEn, rating, reviewCount FROM products ORDER BY createdAt').all()
const stats = db.prepare(`
  SELECT COUNT(*) AS n, AVG(rating) AS avg
  FROM reviews
  WHERE productId = ? AND approved = 1 AND hidden = 0 AND deleted = 0
`)

console.log('=== 订正前 → 订正后 ===')
const plan = []
for (const p of products) {
  const s = stats.get(p.id)
  const n = Number(s.n) || 0
  const avg = n > 0 ? Math.round((Number(s.avg) || 0) * 10) / 10 : 0
  const changed = Number(p.reviewCount) !== n || Number(p.rating) !== avg
  plan.push({ id: p.id, name: p.nameEn || p.name, n, avg })
  console.log(
    `  ${changed ? '✏️ ' : '   '}${String(p.nameEn || p.name).slice(0, 30).padEnd(32)} ` +
    `${String(p.rating).padStart(4)} / ${String(p.reviewCount).padStart(4)} 条  →  ` +
    `${String(avg).padStart(4)} / ${String(n).padStart(4)} 条`
  )
}

const totalReal = plan.reduce((s, x) => s + x.n, 0)
const toFix = products.filter((p, i) => Number(p.reviewCount) !== plan[i].n || Number(p.rating) !== plan[i].avg)
console.log(`\n  需要订正的商品: ${toFix.length} 个`)
console.log(`  全站真实可见评价总数: ${totalReal} 条`)

if (!APPLY) { console.log('\n只报告模式，加 --apply 执行'); db.close(); process.exit(0) }
if (toFix.length === 0) { console.log('\n无需订正'); db.close(); process.exit(0) }

const now = new Date().toISOString()
const upd = db.prepare('UPDATE products SET rating = ?, reviewCount = ?, updatedAt = ? WHERE id = ?')
const tx = db.transaction(() => {
  for (const x of plan) upd.run(x.avg, x.n, now, x.id)
})
tx()

console.log('\n=== 写入后复核 ===')
db.prepare('SELECT nameEn, name, rating, reviewCount FROM products ORDER BY createdAt').all().forEach(p =>
  console.log(`  ${String(p.nameEn || p.name).slice(0, 30).padEnd(32)} ${String(p.rating).padStart(4)} / ${p.reviewCount} 条`))

console.log('\n✅ 已订正 —— 请执行 pm2 restart lowflame 让缓存失效')
db.close()
