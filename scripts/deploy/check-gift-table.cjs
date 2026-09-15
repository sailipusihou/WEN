/**
 * check-gift-table.cjs - 检查 product_gifts 表是否已创建、有多少绑定。
 * 在服务器上从 /var/www/lowflame 运行。
 */
const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name)
console.log('product_gifts 表存在:', tables.includes('product_gifts'))
console.log('全部表:', tables.join(', '))

if (tables.includes('product_gifts')) {
  const cols = db.prepare('PRAGMA table_info(product_gifts)').all().map(c => c.name)
  console.log('列:', cols.join(', '))
  const rows = db.prepare('SELECT * FROM product_gifts').all()
  console.log('当前绑定数:', rows.length)
  rows.forEach(r => console.log('  ', JSON.stringify(r)))
} else {
  console.log('→ 表还没建。initDatabase() 可能只在库不存在时执行建表。')
}
