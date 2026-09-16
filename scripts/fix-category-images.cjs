/**
 * fix-category-images.cjs —— 修正分类图：空图 + 与整站配色冲突的图
 *
 * 问题（实测）：
 *   · textile-lacquer / lighting-decor 的分类图是空的 → 前台轮播是空白
 *   · incense-rituals 用的是一张高饱和"粉红礼物盒"→ 在整套低饱和暖调里极其刺眼
 *
 * 做法：改用**同分类下商品自己的照片** —— 保证贴切，且与商品图的拍摄风格一致。
 *
 * 用法：node scripts/fix-category-images.cjs [--apply]
 */
const path = require('path')
const Database = require('better-sqlite3')

const APPLY = process.argv.includes('--apply')
const db = new Database(path.join(process.cwd(), 'data', 'site.db'))

/** 分类 → 用哪个商品的图 */
const MAP = {
  'incense-rituals': 'ceramic-incense',   // 香道 → 陶瓷香薰炉
  'textile-lacquer': 'silk-scarf',        // 织绣漆艺 → 真丝方绣
  'lighting-decor': 'bamboo-lamp',        // 灯与陈设 → 竹编落地灯
}

const imgOf = (id) => db.prepare('SELECT image FROM products WHERE id = ?').get(id)?.image || ''

console.log('=== 分类图修正 ===')
const plan = []
for (const [slug, pid] of Object.entries(MAP)) {
  const cur = db.prepare('SELECT image FROM categories WHERE slug = ?').get(slug)?.image
  const to = imgOf(pid)
  plan.push({ slug, to })
  console.log(`  ${slug.padEnd(18)} ${cur ? '当前 ' + String(cur).slice(0, 46) : '当前 (空)'}`)
  console.log(`  ${''.padEnd(18)} → 改用 ${pid} 的图: ${String(to).slice(0, 50)}`)
}

if (!APPLY) { console.log('\n只报告模式，加 --apply 执行'); db.close(); process.exit(0) }

const stmt = db.prepare("UPDATE categories SET image = ?, updatedAt = datetime('now') WHERE slug = ?")
db.transaction(() => { for (const x of plan) stmt.run(x.to, x.slug) })()

console.log('\n=== 复核 ===')
for (const c of db.prepare('SELECT slug, image FROM categories ORDER BY sortOrder').all()) {
  console.log(`  ${String(c.slug).padEnd(18)} ${c.image ? '✅ ' + String(c.image).slice(0, 55) : '❌ 仍然为空'}`)
}
db.close()
