/**
 * 分类体系重整（默认只报告，加 --apply 才写入）
 *
 * 问题：
 *  1) 商品归属错配 ——「东方茶道」里放的是水墨画卷轴和丝绸围巾，「香道」里放的是漆器盒和手工皂
 *  2) 分类名与内容不符，客户点进去会立刻失去信任
 *  3) slug 中英混用 —— 有一个分类 slug 是 "Chinese Tea Culture"（含空格大写），URL 变成 /category/Chinese%20Tea%20Culture
 *  4) 青瓷茶具（唯一的茶具）反而不在茶道分类里
 *
 * 方案：重整为 5 个「名实相符」的分类，每个分类都有真实商品：
 *   tea-ceremony    茶道茶器 / Tea Ceremony      ← Celadon Tea Set
 *   ceramic-art     陶瓷器物 / Ceramic Art       ← Ceramic Incense Burner
 *   incense-rituals 香道香事 / Incense Rituals   ← Herbal Cold-Process Soap
 *   textile-lacquer 织绣漆艺 / Textile & Lacquer ← Silk Scarf, Lacquer Jewelry Box
 *   lighting-decor  灯与陈设 / Lighting & Décor  ← Bamboo Lamp, Paper-Cut Lamp, Ink Scroll
 *
 * 用法：node scripts/rebuild-categories.cjs [--apply]
 */
const path = require('path')
const Database = require('better-sqlite3')

const APPLY = process.argv.includes('--apply')
const db = new Database(path.join(process.cwd(), 'data', 'site.db'))

const DESIRED = [
  { slug: 'tea-ceremony',    name: '茶道茶器', nameEn: 'Tea Ceremony',     desc: '青瓷、宜兴紫砂与茶的仪式', descEn: 'Celadon and Yixing ware for the art of tea' },
  { slug: 'ceramic-art',     name: '陶瓷器物', nameEn: 'Ceramic Art',      desc: '景德镇与龙泉的手作器物',   descEn: 'Hand-thrown vessels fired in Jingdezhen and Longquan' },
  { slug: 'incense-rituals', name: '香道香事', nameEn: 'Incense Rituals',  desc: '一缕香，一段静',           descEn: 'Ritual scents and objects for quiet moments' },
  { slug: 'textile-lacquer', name: '织绣漆艺', nameEn: 'Textile & Lacquer', desc: '苏绣与大漆螺钿',          descEn: 'Suzhou embroidery and polished lacquerware' },
  { slug: 'lighting-decor',  name: '灯与陈设', nameEn: 'Lighting & Décor', desc: '竹编、剪纸与文人案头',     descEn: 'Hand-woven lamps and scholar\u2019s wall pieces' },
]

// 旧 slug → 新 slug（含那条中英混用的 slug）
const SLUG_RENAMES = { 'Chinese Tea Culture': 'textile-lacquer' }

// 商品 → 目标分类 (key 必须是真实 product id)
const PRODUCT_MAP = {
  'celadon-tea-set': 'tea-ceremony',
  'ceramic-incense': 'ceramic-art',
  'ink-painting-scroll': 'lighting-decor',
  'silk-scarf': 'textile-lacquer',
  'bamboo-lamp': 'lighting-decor',
  'paper-cutting-light': 'lighting-decor',
  'lacquer-jewelry-box': 'textile-lacquer',
  'handmade-soap-set': 'incense-rituals',
}

console.log('=== 当前分类 ===')
const before = db.prepare('SELECT * FROM categories').all()
before.forEach(c => console.log(`  ${c.slug.padEnd(24)} ${c.name} / ${c.nameEn}  count=${c.productCount}`))

console.log('\n=== 当前商品归属 ===')
const products = db.prepare('SELECT id, nameEn, name, category FROM products ORDER BY createdAt').all()
products.forEach(p => console.log(`  [${p.category}] ${p.nameEn || p.name}  (id=${p.id})`))

console.log('\n=== 计划变更 ===')
console.log('  分类：')
DESIRED.forEach(d => console.log(`    ${d.slug.padEnd(24)} ${d.name} / ${d.nameEn}`))
console.log('  商品归属：')
for (const p of products) {
  const to = PRODUCT_MAP[p.id] || p.category
  const flag = to !== p.category ? '  ← 改动' : ''
  console.log(`    ${(p.nameEn || p.name).slice(0, 34).padEnd(36)} ${p.category} → ${to}${flag}`)
}

if (!APPLY) { console.log('\n只报告模式，加 --apply 执行'); db.close(); process.exit(0) }

// ---------- 写入 ----------
const now = new Date().toISOString()
const tx = db.transaction(() => {
  // 1) 重命名旧 slug（id 一起改 —— 脏 id 'CAT-Chinese Tea Culture' 会被
  //    前端 categoryLabel() 当成兜底匹配键，留着是隐患）
  for (const [from, to] of Object.entries(SLUG_RENAMES)) {
    const c = db.prepare('SELECT * FROM categories WHERE slug = ?').get(from)
    if (c) {
      const newId = String(c.id).startsWith('CAT-') ? 'CAT-' + to : c.id
      db.prepare('UPDATE categories SET slug = ?, id = ?, updatedAt = ? WHERE id = ?').run(to, newId, now, c.id)
      db.prepare('UPDATE products SET category = ? WHERE category = ?').run(to, from)
    }
  }

  // 2) 新增 / 更新分类
  for (const d of DESIRED) {
    const existing = db.prepare('SELECT * FROM categories WHERE slug = ?').get(d.slug)
    if (existing) {
      db.prepare('UPDATE categories SET name = ?, nameEn = ?, description = ?, descriptionEn = ?, active = 1, updatedAt = ? WHERE slug = ?')
        .run(d.name, d.nameEn, d.desc, d.descEn, now, d.slug)
    } else {
      const id = 'CAT-' + d.slug
      db.prepare(`INSERT INTO categories (id, name, nameEn, slug, description, descriptionEn, icon, iconType, sortOrder, productCount, active, createdAt, updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, d.name, d.nameEn, d.slug, d.desc, d.descEn, '', 'emoji', DESIRED.indexOf(d), 0, 1, now, now)
    }
  }

  // 3) 商品归属
  for (const [pid, to] of Object.entries(PRODUCT_MAP)) {
    db.prepare('UPDATE products SET category = ?, updatedAt = ? WHERE id = ?').run(to, now, pid)
  }

  // 4) 重算 productCount + 删除不在方案内的分类（仅当它已无商品）
  const valid = DESIRED.map(d => d.slug)
  for (const c of db.prepare('SELECT * FROM categories').all()) {
    const n = db.prepare('SELECT COUNT(*) c FROM products WHERE category = ?').get(c.slug).c
    if (!valid.includes(c.slug) && n === 0) {
      db.prepare('DELETE FROM categories WHERE id = ?').run(c.id)
      console.log('  已删除空分类:', c.slug)
    } else if (valid.includes(c.slug)) {
      db.prepare('UPDATE categories SET productCount = ?, sortOrder = ?, updatedAt = ? WHERE slug = ?')
        .run(n, valid.indexOf(c.slug), now, c.slug)
    }
  }
})
tx()

console.log('\n=== 写入后 ===')
db.prepare('SELECT * FROM categories ORDER BY sortOrder').all().forEach(c =>
  console.log(`  ${c.slug.padEnd(24)} ${c.name} / ${c.nameEn}  count=${c.productCount}`))
console.log('  商品：')
db.prepare('SELECT id, nameEn, name, category FROM products ORDER BY category').all().forEach(p =>
  console.log(`    [${p.category}] ${p.nameEn || p.name}`))

console.log('\n✅ 完成 —— 请执行 pm2 restart lowflame')
db.close()
