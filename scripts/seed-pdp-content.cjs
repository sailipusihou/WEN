/**
 * seed-pdp-content.cjs —— 给每个商品生成演示用的「详情页内容」
 *
 * 生成四类：卖点要点 / 自由规格 / 常见问题 / 配送退货说明（分享栏保持默认开启）
 *
 * ⚠️ 演示数据：商品目录目前全是虚拟的。等有真实商品时，在后台
 *    「商品编辑 → 详情页内容」里按真实信息改即可，代码不用动。
 *
 * 用法：node scripts/seed-pdp-content.cjs [--apply]
 */
const path = require('path')
const Database = require('better-sqlite3')

const APPLY = process.argv.includes('--apply')

/** 按商品定制；没有专门配的走下面的通用模板 */
const BY_PRODUCT = {
  'celadon-tea-set': {
    highlights: [
      'Longquan celadon, fired at 1280°C for a jade-like glaze',
      'Four cups and a teapot — a complete set for daily brewing',
      'Each piece is thrown and glazed by hand, so no two are identical',
    ],
    specs: [
      { label: 'Capacity', value: 'Teapot 320 ml · Cups 60 ml' },
      { label: 'Pieces', value: '5 (1 teapot, 4 cups)' },
      { label: 'Material', value: 'Longquan celadon clay, sky-blue glaze' },
      { label: 'Origin', value: 'Longquan, Zhejiang' },
      { label: 'Care', value: 'Hand wash; avoid thermal shock' },
    ],
    faqs: [
      { q: 'Is the glaze food-safe?', a: 'Yes — fired at 1280°C with a lead-free glaze that meets food-contact standards.' },
      { q: 'Can it go in the dishwasher?', a: 'We recommend hand washing. Dishwashers and thermal shock are the two things that most often damage celadon.' },
      { q: 'Why does my cup look slightly different from the photo?', a: 'Celadon glaze shifts with kiln position and temperature. That variation is the signature of hand-fired work, not a defect.' },
    ],
    shippingNotes: [
      'Every piece is wrapped individually, then double-boxed — celadon chips if it shifts in transit.',
      '30-day money-back guarantee. If anything arrives damaged, send a photo and we replace it free.',
    ],
  },
  'bamboo-lamp': {
    highlights: [
      'Hand-woven bamboo shade, no two weaves identical',
      'Warm, directional light — reads well beside a chair or bed',
      'Natural bamboo, finished without lacquer or stain',
    ],
    specs: [
      { label: 'Dimensions', value: '38 × 38 × 120 cm' },
      { label: 'Material', value: 'Natural bamboo, cotton cable' },
      { label: 'Bulb', value: 'E27, max 40 W (not included)' },
      { label: 'Cable', value: '180 cm, inline switch' },
    ],
    faqs: [
      { q: 'Is the shade removable?', a: 'The shade lifts off for dusting — it is held by three bamboo pins, no tools needed.' },
      { q: 'Can it be used outdoors?', a: 'Indoors only. Bamboo will warp with sustained humidity.' },
    ],
    shippingNotes: [
      'Shipped flat-packed with the shade already woven — only the stand needs attaching, about two minutes.',
      '30-day money-back guarantee.',
    ],
  },
}

const GENERIC = {
  highlights: [
    'Made by hand in small batches',
    'Ships from the workshop within 1–2 business days',
  ],
  specs: [
    { label: 'Material', value: '' },      // 会被商品自身的 material 填上
    { label: 'Origin', value: '' },
  ],
  faqs: [
    { q: 'Is this piece genuinely handmade?', a: 'Yes. Each piece is made by hand in the workshop named above — small variations in finish are the signature of handmade work, not defects.' },
    { q: 'Will it arrive safely?', a: 'Every order ships double-boxed with padding. If anything arrives damaged, send us a photo and we will replace it at no cost.' },
  ],
  shippingNotes: [
    'Every piece is packed in protective, gift-ready packaging. Damaged in transit? We replace it free.',
    '30-day money-back guarantee — return it unused in original packaging.',
  ],
}

;(async () => {
  const db = new Database(path.join(process.cwd(), 'data', 'site.db'))
  const products = db.prepare('SELECT id, name, nameEn, material, origin, craft FROM products').all()

  console.log('=== 计划写入的详情页内容 ===')
  const plan = []
  for (const p of products) {
    const custom = BY_PRODUCT[p.id]
    // 通用模板里把 material/origin 用商品自身的数据填上（没有就丢掉该行）
    const base = custom || {
      ...GENERIC,
      specs: GENERIC.specs
        .map(s => ({
          label: s.label,
          value: s.label === 'Material' ? (p.material || '') : s.label === 'Origin' ? (p.origin || '') : s.value,
        }))
        .filter(s => s.value),
    }
    plan.push({ id: p.id, content: base })
    console.log(`  ${String(p.nameEn || p.name).slice(0, 30).padEnd(32)} 卖点 ${base.highlights.length} · 规格 ${base.specs.length} · 问答 ${base.faqs.length} · 配送 ${base.shippingNotes.length}`)
  }

  if (!APPLY) { console.log('\n只报告模式，加 --apply 执行'); db.close(); process.exit(0) }

  const upd = db.prepare('UPDATE products SET pdpContent = ?, updatedAt = datetime(\'now\') WHERE id = ?')
  const tx = db.transaction(() => {
    for (const x of plan) upd.run(JSON.stringify(x.content), x.id)
  })
  tx()

  console.log('\n✅ 已写入', plan.length, '个商品的详情页内容')
  console.log('   分享栏：全部保持默认开启（可在后台单个商品关闭或改文案）')
  db.close()
})().catch(e => { console.error('❌ 失败:', e.message); process.exit(1) })
