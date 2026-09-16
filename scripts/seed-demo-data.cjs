/**
 * seed-demo-data.cjs —— 生成演示用的虚拟数据：搭配（配套品）、赠品、款式
 *
 * ⚠️ 演示数据：当前商品目录全是虚拟的，没有真实商品。
 *    这是为了把前台的交互效果（搭配区、赠品区、款式选择、快捷查看弹窗）跑出来看。
 *
 * 做三件事：
 *   1. 款式：给若干商品各加 2 个款式，并用 sharp 生成对应的色块缩略图
 *      （以商品自己的主图为底，一个原色、一个按釉色去色重染）
 *   2. 搭配：给**每个**商品配 2 件搭配商品（按分类挑得比较合理的组合）
 *   3. 赠品：给**每个**商品配 1 件免费赠品
 *
 * 输出图片到 public/images/（该目录随部署同步）
 *
 * 用法：node scripts/seed-demo-data.cjs            # 只报告
 *       node scripts/seed-demo-data.cjs --apply    # 写入
 */
const path = require('path')
const fs = require('fs')
const https = require('https')
const sharp = require('sharp')
const Database = require('better-sqlite3')

const APPLY = process.argv.includes('--apply')
const IMG_DIR = path.join(process.cwd(), 'public', 'images')
const SIZE = 400

// ---------- 款式配置：商品 → 两个款式（名称 + 釉色） ----------
const VARIANTS = {
  'silk-scarf': { option: 'Colour', a: { label: 'Natural Ivory', tint: null }, b: { label: 'Indigo Dyed', tint: '#4A5B7A' } },
  'ceramic-incense': { option: 'Glaze', a: { label: 'Crackle White', tint: null }, b: { label: 'Ash Grey', tint: '#6B6B66' } },
  'lacquer-jewelry-box': { option: 'Finish', a: { label: 'Natural Lacquer', tint: null }, b: { label: 'Cinnabar Red', tint: '#9E3B2E' } },
  'bamboo-lamp': { option: 'Weave', a: { label: 'Natural Bamboo', tint: null }, b: { label: 'Smoked Amber', tint: '#A97B4A' } },
}

// ---------- 搭配：每个商品配 2 件 ----------
// 按分类挑组合，让搭配看起来合理一些（不是为了真实销售，只为看效果）
const BUNDLES = {
  'celadon-tea-set': [
    { to: 'silk-scarf', title: 'Pair with a tea cloth', desc: 'Keeps your table dry' },
    { to: 'ceramic-incense', title: 'Add some atmosphere', desc: 'Burns alongside your brew' },
  ],
  'ink-painting-scroll': [
    { to: 'bamboo-lamp', title: 'Light it properly', desc: 'Warm light for hanging scrolls' },
    { to: 'lacquer-jewelry-box', title: 'Store your seals', desc: 'Same restrained palette' },
  ],
  'silk-scarf': [
    { to: 'lacquer-jewelry-box', title: 'Keep it safe', desc: 'Lacquer box for delicate silk' },
    { to: 'celadon-tea-set', title: 'Complete the set', desc: 'The teaware it was made for' },
  ],
  'ceramic-incense': [
    { to: 'handmade-soap-set', title: 'Add a scent set', desc: 'Natural, like the burner' },
    { to: 'celadon-tea-set', title: 'Brew alongside', desc: 'Incense and tea, the old pairing' },
  ],
  'bamboo-lamp': [
    { to: 'ink-painting-scroll', title: 'Hang beside it', desc: 'Reads well in warm light' },
    { to: 'paper-cutting-light', title: 'Pair two lamps', desc: 'Matching bedside glow' },
  ],
  'paper-cutting-light': [
    { to: 'bamboo-lamp', title: 'Pair two lamps', desc: 'Woven shade, paper glow' },
    { to: 'handmade-soap-set', title: 'Add a gift set', desc: 'Both come gift-ready' },
  ],
  'lacquer-jewelry-box': [
    { to: 'silk-scarf', title: 'Made for each other', desc: 'Silk deserves a proper box' },
    { to: 'ink-painting-scroll', title: 'Same workshop', desc: 'Both finished by hand' },
  ],
  'handmade-soap-set': [
    { to: 'ceramic-incense', title: 'Add a burner', desc: 'For the soap dish' },
    { to: 'paper-cutting-light', title: 'Gift it together', desc: 'Two easy presents' },
  ],
}

// ---------- 赠品：每个商品配 1 件免费小物 ----------
const GIFTS = {
  'celadon-tea-set': 'handmade-soap-set',
  'ink-painting-scroll': 'handmade-soap-set',
  'silk-scarf': 'handmade-soap-set',
  'ceramic-incense': 'handmade-soap-set',
  'bamboo-lamp': 'handmade-soap-set',
  'paper-cutting-light': 'handmade-soap-set',
  'lacquer-jewelry-box': 'handmade-soap-set',
  'handmade-soap-set': 'paper-cutting-light',
}

function fetchBuffer(url, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('重定向过多'))
    https.get(url, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume(); return resolve(fetchBuffer(r.headers.location, depth + 1))
      }
      if (r.statusCode !== 200) { r.resume(); return reject(new Error('HTTP ' + r.statusCode)) }
      const c = []; r.on('data', d => c.push(d)); r.on('end', () => resolve(Buffer.concat(c))); r.on('error', reject)
    }).on('error', reject)
  })
}

/** 以主图为底生成款式色块：tint 为 null 时保留原色 */
async function makeSwatch(srcBuf, outName, tint) {
  const out = path.join(IMG_DIR, outName)
  let img = sharp(srcBuf)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .modulate(tint ? { brightness: 1.12, saturation: 0.18 } : { brightness: 1.08, saturation: 0.95 })

  if (tint) {
    const pre = await img.png().toBuffer()
    const overlay = Buffer.from(
      `<svg width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${tint}" fill-opacity="0.68"/></svg>`
    )
    img = sharp(await sharp(pre).composite([{ input: overlay, blend: 'multiply' }]).png().toBuffer())
  }

  await img.png({ compressionLevel: 9 }).toFile(out)
  return (fs.statSync(out).size / 1024).toFixed(0)
}

;(async () => {
  const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
  const products = db.prepare('SELECT id, name, nameEn, price, image FROM products').all()
  const byId = new Map(products.map(p => [p.id, p]))

  console.log('=== 计划生成的演示数据 ===')
  console.log(`  款式: ${Object.keys(VARIANTS).length} 个商品 × 2 款 = ${Object.keys(VARIANTS).length * 2} 个款式（含生成缩略图）`)
  console.log(`  搭配: ${Object.keys(BUNDLES).length} 个商品 × 2 件 = ${Object.keys(BUNDLES).length * 2} 条`)
  console.log(`  赠品: ${Object.keys(GIFTS).length} 个商品 × 1 件 = ${Object.keys(GIFTS).length} 条`)

  if (!APPLY) { console.log('\n只报告模式，加 --apply 执行'); db.close(); process.exit(0) }

  fs.mkdirSync(IMG_DIR, { recursive: true })
  const now = new Date().toISOString()

  // ---------- 1. 款式（含缩略图） ----------
  console.log('\n=== 1. 生成款式与缩略图 ===')
  const variantRows = []
  for (const [pid, cfg] of Object.entries(VARIANTS)) {
    const p = byId.get(pid)
    if (!p) { console.log(`  跳过 ${pid}（商品不存在）`); continue }
    console.log(`  ${p.nameEn || p.name}:`)
    let srcBuf
    try { srcBuf = await fetchBuffer(p.image) } catch (e) { console.log(`    ✗ 取图失败: ${e.message}`); continue }

    const sides = [
      { v: cfg.a, slug: 'a' },
      { v: cfg.b, slug: 'b' },
    ]
    for (const { v, slug } of sides) {
      const fname = `variant-${pid}-${slug}.png`
      try {
        const kb = await makeSwatch(srcBuf, fname, v.tint)
        console.log(`    ✓ ${v.label.padEnd(18)} → /images/${fname}  ${kb} KB`)
      } catch (e) { console.log(`    ✗ ${v.label} 生成失败: ${e.message}`); continue }
      variantRows.push({
        id: `${pid}-var-seed-${slug}`,
        productId: pid,
        optionName: cfg.option,
        label: v.label,
        valueCode: slug,
        price: slug === 'a' ? Number(p.price) : Math.round(Number(p.price) * 1.12 * 100) / 100,
        image: `/images/${fname}`,
        sortOrder: slug === 'a' ? 0 : 1,
      })
    }
  }

  // ---------- 2 & 3. 搭配与赠品 ----------
  const bundleRows = []
  for (const [pid, list] of Object.entries(BUNDLES)) {
    const p = byId.get(pid)
    if (!p) continue
    list.forEach((b, i) => {
      const target = byId.get(b.to)
      if (!target) return
      // 搭配价 = 目标商品价 - 小额优惠；优惠取原价的 ~12%，凑成整数
      const discount = Math.max(1, Math.round(Number(target.price) * 0.12))
      const price = Math.round((Number(target.price) - discount) * 100) / 100
      bundleRows.push({ productId: pid, bundleProductId: b.to, title: b.title, description: b.desc, price, discount, sortOrder: i })
    })
  }

  const giftRows = []
  for (const [pid, gid] of Object.entries(GIFTS)) {
    if (!byId.get(pid) || !byId.get(gid)) continue
    if (pid === gid) continue
    giftRows.push({ productId: pid, giftProductId: gid, quantity: 1, sortOrder: 0 })
  }

  const tx = db.transaction(() => {
    // 款式：先清掉旧的本脚本生成的，再插（可重复跑）
    db.prepare("DELETE FROM product_variants WHERE id LIKE '%-var-seed-%'").run()
    const iv = db.prepare('INSERT OR REPLACE INTO product_variants (id,productId,optionName,label,valueCode,price,image,stock,sortOrder,active) VALUES (?,?,?,?,?,?,?,?,?,1)')
    for (const v of variantRows) iv.run(v.id, v.productId, v.optionName, v.label, v.valueCode, v.price, v.image, null, v.sortOrder)

    // 搭配 / 赠品：先清空再插（这两张表目前只有演示数据）
    db.prepare('DELETE FROM product_bundles').run()
    const ib = db.prepare('INSERT INTO product_bundles (productId,bundleProductId,title,description,image,price,discount,sortOrder) VALUES (?,?,?,?,?,?,?,?)')
    for (const b of bundleRows) ib.run(b.productId, b.bundleProductId, b.title, b.description, null, b.price, b.discount, b.sortOrder)

    db.prepare('DELETE FROM product_gifts').run()
    const ig = db.prepare('INSERT INTO product_gifts (productId,giftProductId,quantity,sortOrder) VALUES (?,?,?,?)')
    for (const g of giftRows) ig.run(g.productId, g.giftProductId, g.quantity, g.sortOrder)
  })
  tx()

  console.log('\n=== 写入完成 ===')
  console.log('  款式行数:', db.prepare('SELECT COUNT(*) c FROM product_variants').get().c)
  console.log('  搭配行数:', db.prepare('SELECT COUNT(*) c FROM product_bundles').get().c)
  console.log('  赠品行数:', db.prepare('SELECT COUNT(*) c FROM product_gifts').get().c)
  console.log('\n提示：图片在 public/images/，部署时会随 public/ 同步。')
  db.close()
})().catch(e => { console.error('❌ 失败:', e.message); process.exit(1) })
