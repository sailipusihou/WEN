/**
 * 找出引用了已知 404 图链的商品，并可选替换。
 *
 * 用法（服务器上从 /var/www/lowflame 运行）:
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/fix-broken-images.cjs list
 *   NODE_PATH=/var/www/lowflame/node_modules node /root/fix-broken-images.cjs fix
 */
const Database = require('better-sqlite3')
const path = require('path')

const root = process.cwd()
const db = new Database(path.join(root, 'data', 'site.db'))

const DEAD = [
  'photo-1607532941432-5e0d3cba768b', // silk-scarf 详情图
  'photo-1603974372059-ef0a3a775ce1', // lacquer-jewelry-box 主图 + 详情图
  'photo-1507398941214-572c25f4b1c6', // paper-cutting-light 主图
  'photo-1595526114035-0d45ed16cf88', // handmade-soap-set 详情图
]

// 替换候选（实测 200，且主题对得上）：
//   纸雕夜灯 → 成串发光和纸灯笼（Pexels 37672377）
//   漆器首饰盒 → 红漆描金首饰盒（Pexels 34988800）
const REPLACEMENTS = {
  'photo-1507398941214-572c25f4b1c6': 'https://images.pexels.com/photos/37672377/pexels-photo-37672377.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'photo-1603974372059-ef0a3a775ce1': 'https://images.pexels.com/photos/34988800/pexels-photo-34988800.jpeg?auto=compress&cs=tinysrgb&w=1200',
  // 详情图坏链：回退到该商品自己的可用主图（内容一定相关）
  'photo-1607532941432-5e0d3cba768b': null,
  'photo-1595526114035-0d45ed16cf88': null,
}

// 打印 products 表结构，避免猜列名
if (process.argv[2] === 'cols') {
  console.log(db.prepare('PRAGMA table_info(products)').all().map(c => c.name).join(', '))
  process.exit(0)
}

// products 表没有 detail_images 列，详情图在 product_images 表里
const imgCols = db.prepare('PRAGMA table_info(product_images)').all().map(c => c.name)
const urlCol = ['imageUrl', 'url', 'image', 'src'].find(c => imgCols.includes(c))
if (!urlCol) throw new Error('无法识别 product_images 的图片列: ' + imgCols.join(', '))

// 一次性修复：上一版脚本把候选图当成子串替换，拼出了形如
//   https://images.unsplash.com/https://images.pexels.com/...jpeg?w=1200?w=800&q=80
// 的畸形 URL。这里按里面的 pexels photo id 重建出正确链接。
if (process.argv[2] === 'repair') {
  const PEXELS = {
    '37672377': 'https://images.pexels.com/photos/37672377/pexels-photo-37672377.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '34988800': 'https://images.pexels.com/photos/34988800/pexels-photo-34988800.jpeg?auto=compress&cs=tinysrgb&w=1200',
  }
  let n = 0
  for (const r of db.prepare('SELECT id, nameEn, image FROM products').all()) {
    const img = String(r.image || '')
    if (img.split('https://').length <= 2) continue
    const m = img.match(/images\.pexels\.com\/photos\/(\d+)\//)
    const fixed = m && PEXELS[m[1]]
    if (!fixed) { console.log(`无法自动修复: ${r.id}  ${img.slice(0, 120)}`); continue }
    db.prepare('UPDATE products SET image = ? WHERE id = ?').run(fixed, r.id)
    console.log(`修复畸形主图: ${r.id} → ${fixed}`)
    n++
  }
  console.log(`\n共修复 ${n} 条`)
  process.exit(0)
}

const rows = db.prepare('SELECT id, name, nameEn, image FROM products').all()
const detailStmt = db.prepare(`SELECT rowid, ${urlCol} AS u FROM product_images WHERE productId = ?`)

// fix 前先把受影响的原始值落盘，便于回滚（已存在则不覆盖，避免二次运行时冲掉原始备份）
if (process.argv[2] === 'fix') {
  const fs = require('fs')
  if (!fs.existsSync('/root/product-images-backup.json')) {
    const backup = rows.map(r => ({
      id: r.id, image: r.image,
      details: detailStmt.all(r.id).map(x => ({ rowid: x.rowid, u: x.u })),
    }))
    fs.writeFileSync('/root/product-images-backup.json', JSON.stringify(backup, null, 2))
    console.log('已备份到 /root/product-images-backup.json\n')
  } else {
    console.log('备份已存在，跳过（/root/product-images-backup.json）\n')
  }
}

let hits = 0, changed = 0

for (const r of rows) {
  const imgs = detailStmt.all(r.id)
  const blob = [r.image || '', ...imgs.map(x => String(x.u || ''))].join(' | ')
  const hitsHere = DEAD.filter(d => blob.includes(d))
  if (!hitsHere.length) continue
  hits++
  const where = []
  if (hitsHere.some(d => String(r.image || '').includes(d))) where.push('主图')
  if (hitsHere.some(d => imgs.some(x => String(x.u || '').includes(d)))) where.push('详情图/' + imgs.length + '张')
  console.log(`命中: ${r.id}  ${r.nameEn || r.name}  [${where.join(' + ')}]`)
  console.log(`   主图: ${String(r.image || '').slice(0, 110)}`)
  imgs.forEach(x => console.log(`   详情${x.sortOrder}: ${String(x.u || '').slice(0, 110)}`))

  if (process.argv[2] === 'fix') {
    // 主图坏链：整条替换成候选图（不能做子串替换 —— 候选本身就是完整 URL，
    // 拼进 https://images.unsplash.com/... 里会产生畸形链接）
    let newImage = r.image || ''
    const deadMain = DEAD.find(d => newImage.includes(d))
    if (deadMain) {
      newImage = REPLACEMENTS[deadMain] || newImage
      console.log(`   → 主图改为 ${newImage.slice(0, 100)}`)
    }
    db.prepare('UPDATE products SET image = ? WHERE id = ?').run(newImage, r.id)

    // 详情图坏链：优先用刚修好的主图兜底，保证内容相关
    // product_images 上有 (productId, imageUrl) 唯一约束 —— 若目标图该商品已存在，
    // 直接删掉这条坏链记录，否则 UPDATE 会撞唯一键。
    const existingStmt = db.prepare(`SELECT rowid FROM product_images WHERE productId = ? AND ${urlCol} = ?`)
    for (const x of imgs) {
      const out = String(x.u || '')
      const dead = DEAD.find(d => out.includes(d))
      if (!dead) continue
      const next = REPLACEMENTS[dead] || newImage
      const dup = existingStmt.get(r.id, next)
      if (dup) {
        db.prepare('DELETE FROM product_images WHERE rowid = ?').run(x.rowid)
        console.log(`   → 详情图与已有图片重复，已移除该坏链记录`)
      } else {
        db.prepare(`UPDATE product_images SET ${urlCol} = ? WHERE rowid = ?`).run(next, x.rowid)
        console.log(`   → 详情图改为 ${String(next).slice(0, 100)}`)
      }
    }
    changed++
  }
}

console.log(`\n受影响商品 ${hits} 个，已修改 ${changed} 个`)
console.log('(product_images 列: ' + imgCols.join(', ') + ')')
