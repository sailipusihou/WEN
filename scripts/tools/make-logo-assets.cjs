/**
 * make-logo-assets.cjs —— 生成全站需要的全部 logo 资源
 *
 * 产出：
 *   public/images/low-flame-logo.png        金色线条 + 透明底（页面内用，页头/页脚徽标）
 *   public/images/low-flame-logo-white.png  白色线条 + 透明底（深色背景用）
 *   public/images/low-flame-logo-dark.png   墨色线条 + 透明底（备用）
 *   public/images/low-flame-icon.png        512×512 方形应用图标（favicon / PWA）
 *
 * 为什么要单独的方形图标：
 *   logo 本身是 176×239 的竖版，直接当 favicon 在 16×16 下细线条会糊成一团。
 *   方形图标做法 = 米色圆角方块底 + 金色 logo 居中（留 ~18% 边距），
 *   在浏览器浅色/深色标签栏上都清晰可辨。
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const IMG = path.join(ROOT, 'public', 'images')
const SRC = path.join(ROOT, 'scripts', 'tools', 'logo-source.png')

const GOLD = { r: 0x8a, g: 0x6a, b: 0x2e }
const WHITE = { r: 0xff, g: 0xff, b: 0xff }
const INK = { r: 0x2a, g: 0x21, b: 0x18 }
const CREAM = { r: 0xf8, g: 0xf2, b: 0xe2 }

// 电平映射阈值（见 make-logo.cjs 的说明：不能直接把亮度当 alpha，
// 否则源图的深灰"黑底"会变成一块半透明方块）
const LOW = 70, HIGH = 170

async function colorize(srcPath, { r, g, b }, outPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 4)
  let opaque = 0, clear = 0
  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * 4
    const lum = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
    const a = lum <= LOW ? 0 : lum >= HIGH ? 255 : Math.round(((lum - LOW) / (HIGH - LOW)) * 255)
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a
    if (a > 200) opaque++; else if (a < 20) clear++
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })
    .png({ compressionLevel: 9 })
    .toFile(outPath)
  const m = await sharp(outPath).metadata()
  console.log(`  ✅ ${path.basename(outPath).padEnd(30)} ${m.width}×${m.height}  ${Math.round(fs.statSync(outPath).size / 1024)} KB   (实心 ${opaque} / 透明 ${clear})`)
  return { width: m.width, height: m.height }
}

;(async () => {
  if (!fs.existsSync(SRC)) { console.error('找不到源图:', SRC); process.exit(1) }
  console.log('源图:', SRC, `(${(await sharp(SRC).metadata()).width}×${(await sharp(SRC).metadata()).height})`)
  console.log('\n生成透明版：')
  const gold = await colorize(SRC, GOLD, path.join(IMG, 'low-flame-logo.png'))
  await colorize(SRC, WHITE, path.join(IMG, 'low-flame-logo-white.png'))
  await colorize(SRC, INK, path.join(IMG, 'low-flame-logo-dark.png'))

  // ---- 方形应用图标：米色底 + 金色 logo 居中 ----
  console.log('\n生成方形应用图标：')
  const SIZE = 512
  const PAD = 0.18                      // 四周留 18% 边距
  const inner = Math.round(SIZE * (1 - PAD * 2))
  // 按比例缩放到内框（保持长宽比，竖版图以高度为准）
  const scale = Math.min(inner / gold.width, inner / gold.height)
  const w = Math.round(gold.width * scale)
  const h = Math.round(gold.height * scale)

  const logoBuf = await sharp(path.join(IMG, 'low-flame-logo.png')).resize(w, h).toBuffer()
  // 圆角方块底：用 SVG 画圆角矩形再合成
  const r = Math.round(SIZE * 0.22)
  const bgSvg = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${SIZE}" height="${SIZE}" rx="${r}" ry="${r}" fill="rgb(${CREAM.r},${CREAM.g},${CREAM.b})"/>` +
    `</svg>`
  )

  await sharp(bgSvg)
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(IMG, 'low-flame-icon.png'))
  console.log(`  ✅ low-flame-icon.png              ${SIZE}×${SIZE}  ${Math.round(fs.statSync(path.join(IMG, 'low-flame-icon.png')).size / 1024)} KB   (米色圆角底 + 金色 logo)`)

  // 深色底版本（PWA 在深色主题下用）
  const bgDark = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${SIZE}" height="${SIZE}" rx="${r}" ry="${r}" fill="rgb(42,33,24)"/>` +
    `</svg>`
  )
  const whiteBuf = await sharp(path.join(IMG, 'low-flame-logo-white.png')).resize(w, h).toBuffer()
  await sharp(bgDark)
    .composite([{ input: whiteBuf, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(IMG, 'low-flame-icon-dark.png'))
  console.log(`  ✅ low-flame-icon-dark.png         ${SIZE}×${SIZE}  ${Math.round(fs.statSync(path.join(IMG, 'low-flame-icon-dark.png')).size / 1024)} KB   (墨色底 + 白色 logo)`)

  console.log('\n完成。')
})().catch(e => { console.error('失败:', e.message); process.exit(1) })
