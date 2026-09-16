/**
 * inspect-collections.cjs —— 只读排查：settings 里存了哪些分类 slug
 *
 * 背景：分类已重整为 tea-ceremony / ceramic-art / incense-rituals /
 *       textile-lacquer / lighting-decor。旧 slug（cultural-gifts /
 *       home-decor / creative-gifts / "Chinese Tea Culture"）若还留在
 *       settings 的 frontendContent.collections 或 footer.collections 里，
 *       前台就会出现点进去 404 的链接。
 */
const path = require('path')
const Database = require('better-sqlite3')

const db = new Database(path.join(process.cwd(), 'data', 'site.db'), { readonly: true })
const row = db.prepare("SELECT value FROM settings WHERE key = 'site_settings'").get()
const s = JSON.parse(row.value)
const fc = s.frontendContent || {}

const REAL = ['tea-ceremony', 'ceramic-art', 'incense-rituals', 'textile-lacquer', 'lighting-decor']

function report(label, list) {
  console.log(`\n=== ${label} （${(list || []).length} 条）===`)
  if (!list || list.length === 0) { console.log('  (空)'); return }
  for (const c of list) {
    const slug = c.slug
    const ok = REAL.includes(slug)
    console.log(`  ${ok ? '✅' : '❌ 失效'}  ${String(c.title || c.label || '?').padEnd(26)} slug = ${slug}`)
  }
}

report('frontendContent.collections （首页用；实测 HomeClient 已改用 /api/categories，此处为死数据）', fc.collections)
report('footer.collections （页脚在用！失效会产生 404 链接）', (fc.footer || {}).collections)

console.log('\n=== 当前真实分类 slug ===')
console.log('  ' + REAL.join(', '))
db.close()
