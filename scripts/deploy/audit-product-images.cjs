/**
 * 列出全部商品及其图片，并标注每张图是否可访问。
 * 在服务器上从 /var/www/lowflame 运行。
 */
const Database = require('better-sqlite3')
const path = require('path')
const https = require('https')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'))

function head(url) {
  return new Promise(resolve => {
    if (!/^https?:/.test(url)) return resolve('local')
    const req = https.request(url, { method: 'HEAD', timeout: 12000 }, res => resolve(res.statusCode))
    req.on('error', () => resolve('err'))
    req.on('timeout', () => { req.destroy(); resolve('timeout') })
    req.end()
  })
}

;(async () => {
  const rows = db.prepare('SELECT id, name, nameEn, category, image FROM products ORDER BY sortOrder').all()
  const detailStmt = db.prepare('SELECT imageUrl FROM product_images WHERE productId = ?')
  for (const r of rows) {
    const st = await head(r.image)
    console.log(`\n${r.id}  [${r.category}]  ${r.nameEn || r.name}`)
    console.log(`   主图 ${st}  ${r.image}`)
    for (const d of detailStmt.all(r.id)) {
      const s2 = await head(d.imageUrl)
      console.log(`   详情 ${s2}  ${d.imageUrl}`)
    }
  }
})()
