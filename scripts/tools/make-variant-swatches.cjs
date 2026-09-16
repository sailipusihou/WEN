/**
 * make-variant-swatches.cjs —— 为商品款式生成演示用缩略图
 *
 * 背景：线上这两个款式（Classic Duoqiu / Fresh Jade Green）没有配图，
 * 所以详情页的款式选择器只能退回"文字按钮"形态。为了让色块形态能演示，
 * 这里以商品主图为底、按釉色做色调处理，生成两张方形缩略图。
 *
 * ⚠️ 这是**演示用占位图**：整个商品目录目前都是虚拟数据，没有真实商品。
 *    等有真实商品时，替换成真实拍摄的款式图即可（后台可直接上传）。
 *
 * 输出到 public/images/ —— 这个目录**会随部署同步**（public/uploads 不会，
 * 所以不能放 uploads），这样线上也能看到。
 *
 * 用法：node scripts/tools/make-variant-swatches.cjs
 */
const fs = require('fs')
const path = require('path')
const https = require('https')
const sharp = require('sharp')

const OUT_DIR = path.join(process.cwd(), 'public', 'images')
const SIZE = 400

/** 取图（跟随重定向） */
function fetchBuffer(url, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('重定向过多'))
    https.get(url, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume()
        return resolve(fetchBuffer(r.headers.location, depth + 1))
      }
      if (r.statusCode !== 200) { r.resume(); return reject(new Error('HTTP ' + r.statusCode)) }
      const chunks = []
      r.on('data', (d) => chunks.push(d))
      r.on('end', () => resolve(Buffer.concat(chunks)))
      r.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * 生成一张款式缩略图：中心裁方 → 按釉色叠一层色 → 输出 png
 * @param tintHex  叠加色；null = 不叠（保留原色）
 * @param opacity  叠加强度 0–1
 */
async function makeSwatch(src, outName, tintHex, opacity, label) {
  // 先统一裁成方形底图
  const base = await sharp(src)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .toBuffer()

  let img = sharp(base)
  if (tintHex) {
    // 用 multiply 叠加保留器物质感；纯覆盖会让缩略图变成一块死色
    const overlay = Buffer.from(
      `<svg width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${tintHex}" fill-opacity="${opacity}"/></svg>`
    )
    img = sharp(await img.composite([{ input: overlay, blend: 'multiply' }]).png().toBuffer())
  }

  const out = path.join(OUT_DIR, outName)
  await img.png({ compressionLevel: 9 }).toFile(out)
  const kb = (fs.statSync(out).size / 1024).toFixed(0)
  console.log(`  ✓ ${outName}  (${label})  ${kb} KB`)
}

;(async () => {
  /*
   * 两张缩略图都取自**同一张商品主图** —— 因为款式本来就是"同一器型、不同釉色"，
   * 用同一张图才能体现这个语义。
   *
   * 做法：先把饱和度压到很低（近似灰度），再叠一层釉色。
   * 试过直接在原图上轻叠一层，颜色被原图本身的暖色吃掉，两个色块几乎看不出区别；
   * 先去色再染色，颜色才明确。
   */
  const BASE_URL = 'https://images.pexels.com/photos/746383/pexels-photo-746383.jpeg?auto=compress&cs=tinysrgb&w=1200'
  const SRC = [
    {
      out: 'variant-classic-duoqiu.png',
      tint: null,                 // 经典青瓷：原色，只略提亮
      sat: 0.95, bright: 1.08,
      label: '经典青瓷（原色）',
    },
    {
      out: 'variant-fresh-jade-green.png',
      tint: '#5F8F70',            // 玉绿釉
      sat: 0.18, bright: 1.12,    // 先大幅去色，绿色才压得住
      opacity: 0.72,
      label: '玉绿釉（去色后重染）',
    },
  ]

  fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('取底图（两个款式同源）:', BASE_URL.slice(0, 64) + '…')
  const src = await fetchBuffer(BASE_URL)
  console.log('  已取到', (src.length / 1024).toFixed(0), 'KB\n')

  for (const s of SRC) {
    let img = sharp(src)
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .modulate({ brightness: s.bright, saturation: s.sat })

    if (s.tint) {
      const pre = await img.png().toBuffer()
      const overlay = Buffer.from(
        `<svg width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${s.tint}" fill-opacity="${s.opacity}"/></svg>`
      )
      img = sharp(await sharp(pre).composite([{ input: overlay, blend: 'multiply' }]).png().toBuffer())
    }

    const out = path.join(OUT_DIR, s.out)
    await img.png({ compressionLevel: 9 }).toFile(out)
    console.log(`  ✓ ${s.out}  (${s.label})  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`)
  }

  console.log('\n完成。输出目录:', OUT_DIR)
})().catch((e) => { console.error('❌ 失败:', e.message); process.exit(1) })
