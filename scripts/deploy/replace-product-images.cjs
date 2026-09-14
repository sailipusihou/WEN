/**
 * replace-product-images.cjs - swap the mismatched main product images for
 * on-theme ones (Pexels, verified reachable and visually checked).
 *
 * Usage (server, from /var/www/lowflame):
 *   node /root/replace-product-images.cjs dry
 *   node /root/replace-product-images.cjs run
 */
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
const mode = process.argv[2] || 'dry'

const px = (id, w = 1200) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`

// [productId, 新主图, 新详情图1, 说明]
const CHANGES = [
  ['celadon-tea-set', px(746383), px(27921816), '手持茶杯（暗调石面）'],
  ['ink-painting-scroll', px(38549431), px(12008077), '毛笔+宣纸+墨字（木桌）'],
  ['silk-scarf', px(16049198), px(7956629), '戴围巾的女性 / 粉色丝绸垂坠'],
  ['ceramic-incense', px(18507871), px(34470639), '陶瓷器皿+升腾水汽 / 干燥花草'],
  ['handmade-soap-set', px(7797738), px(6915310), '手工皂+精油瓶（陶盘） / 精油瓶'],
]

const backup = []

console.log(mode === 'run' ? '=== 执行替换 ===' : '=== DRY RUN（不改动）===')
for (const [id, newMain, newDetail, note] of CHANGES) {
  const p = db.prepare('SELECT id, nameEn, image FROM products WHERE id = ?').get(id)
  if (!p) { console.log(`  ⚠ 找不到商品 ${id}`); continue }

  const details = db.prepare('SELECT rowid, imageUrl, sortOrder FROM product_images WHERE productId = ? ORDER BY sortOrder').all(id)
  console.log(`\n${id}  (${p.nameEn})`)
  console.log(`  主图: ${String(p.image).slice(0, 70)}`)
  console.log(`    → ${newMain}`)
  console.log(`  说明: ${note}`)
  if (details.length) {
    console.log(`  详情图1 (rowid ${details[0].rowid}): ${String(details[0].imageUrl).slice(0, 60)}`)
    console.log(`    → ${newDetail}`)
  } else {
    console.log('  （没有详情图，只改主图）')
  }

  backup.push({ id, image: p.image, details: details.map(d => ({ rowid: d.rowid, imageUrl: d.imageUrl })) })

  if (mode === 'run') {
    db.prepare('UPDATE products SET image = ? WHERE id = ?').run(newMain, id)
    // 任何「详情图等于旧主图」的行也要一起处理，否则画廊里还残留着货不对板的旧图
    const staleRows = details.filter(d => d.imageUrl === p.image)
    const primary = details.find(d => !staleRows.includes(d)) || details[0]

    if (primary) {
      const dup = db.prepare('SELECT rowid FROM product_images WHERE productId = ? AND imageUrl = ?').get(id, newDetail)
      if (dup && dup.rowid !== primary.rowid) db.prepare('DELETE FROM product_images WHERE rowid = ?').run(dup.rowid)
      db.prepare('UPDATE product_images SET imageUrl = ? WHERE rowid = ?').run(newDetail, primary.rowid)
    }
    // 旧主图残留在详情里的行直接删掉（内容已经被上面的新详情图替代）
    for (const s of staleRows) {
      if (primary && s.rowid === primary.rowid) continue
      const exists = db.prepare('SELECT rowid FROM product_images WHERE productId = ? AND imageUrl = ?').get(id, newDetail)
      if (exists) db.prepare('DELETE FROM product_images WHERE rowid = ?').run(s.rowid)
      else db.prepare('UPDATE product_images SET imageUrl = ? WHERE rowid = ?').run(newDetail, s.rowid)
    }
  }
}

if (mode === 'run') {
  fs.writeFileSync('/root/product-images-replace-backup.json', JSON.stringify(backup, null, 2))
  console.log('\n原值已备份到 /root/product-images-replace-backup.json')
  console.log('改完记得重启清缓存: pm2 restart lowflame')
} else {
  console.log('\n[dry run] 没有做任何修改。加参数 run 才会真改。')
}
