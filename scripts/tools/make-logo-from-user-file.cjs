/**
 * make-logo-from-user-file.cjs —— 用用户自己提供的 logo 文件重新生成，
 * **严格保留原文件的颜色**（不再擅自改成金色）。
 *
 * 用户给的：D:\2026-06-20\logo.png
 *   305×286，白色线条 #F2F1EE + 黑底
 *
 * 输出（放在 public/images/）：
 *   low-flame-logo.png        线条 #F2F1EE + 透明底（深色背景用 —— 页头/页脚徽标）
 *   low-flame-logo-gold.png   线条 #8A6A2E + 透明底（浅色背景备用，颜色取自站点主色）
 *   low-flame-logo-ink.png    线条 #2A2118 + 透明底（浅色背景备用）
 *   low-flame-icon.png        512×512 深色圆角底 + 白色 logo（favicon / PWA）
 *
 * ⚠️ 上一轮的错误：我拿了临时目录里的截图当源文件，还把颜色擅自改成金色。
 *    这次用用户文件本身，默认输出**原色**。
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd()
const SRC = process.argv[2] || path.join(ROOT, '..', 'logo.png')
const IMG = path.join(ROOT, 'public', 'images')

/** 原文件的线条颜色（实测平均 #F2F1EE） */
const ORIGINAL = { r: 0xf2, g: 0xf1, b: 0xee }
/** 站点主色（仅作备用版本） */
const GOLD = { r: 0x8a, g: 0x6a, b: 0x2e }
const INK = { r: 0x2a, g: 0x21, b: 0x18 }
/** 深色底（与原文件的黑色底接近，但用站点墨色更搭） */
const DARK = { r: 0x2a, g: 0x21, b: 0x18 }

const LOW = 70, HIGH = 170

async function colorize(srcPath, { r, g, b }, outPath, label) {
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
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
  console.log('  ✅ ' + path.basename(outPath).padEnd(30) + m.width + '×' + m.height + '  ' +
    Math.round(fs.statSync(outPath).size / 1024) + ' KB   ' + hex + '  ' + label)
  console.log('        实心 ' + opaque + ' px · 全透明 ' + clear + ' px')
  return { width: m.width, height: m.height }
}

;(async () => {
  console.log('源文件:', SRC)
  if (!fs.existsSync(SRC)) { console.error('找不到源文件'); process.exit(1) }
  const meta = await sharp(SRC).metadata()
  console.log('源图:', meta.width + '×' + meta.height, meta.format, '\n')

  console.log('生成透明版（默认保留原色）：')
  const white = await colorize(SRC, ORIGINAL, path.join(IMG, 'low-flame-logo.png'), '← 你的原色，作为主 logo')
  await colorize(SRC, GOLD, path.join(IMG, 'low-flame-logo-gold.png'), '(备用：浅色背景)')
  await colorize(SRC, INK, path.join(IMG, 'low-flame-logo-ink.png'), '(备用：浅色背景)')

  // 方形应用图标：深色圆角底 + 白色 logo（与原文件的"白线+深底"观感一致）
  console.log('\n生成方形应用图标：')
  const SIZE = 512, PAD = 0.18
  const inner = Math.round(SIZE * (1 - PAD * 2))
  const scale = Math.min(inner / white.width, inner / white.height)
  const w = Math.round(white.width * scale), h = Math.round(white.height * scale)
  const r = Math.round(SIZE * 0.22)

  const bgDark = Buffer.from(
    '<svg width="' + SIZE + '" height="' + SIZE + '" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="' + SIZE + '" height="' + SIZE + '" rx="' + r + '" ry="' + r +
    '" fill="rgb(' + DARK.r + ',' + DARK.g + ',' + DARK.b + ')"/></svg>'
  )
  const whiteBuf = await sharp(path.join(IMG, 'low-flame-logo.png')).resize(w, h).toBuffer()
  await sharp(bgDark).composite([{ input: whiteBuf, gravity: 'center' }])
    .png({ compressionLevel: 9 }).toFile(path.join(IMG, 'low-flame-icon.png'))
  console.log('  ✅ low-flame-icon.png              512×512  ' +
    Math.round(fs.statSync(path.join(IMG, 'low-flame-icon.png')).size / 1024) + ' KB   深色圆角底 + 白色 logo')

  // 浅色底版本（米色圆角底 + 金色 logo），供浅色主题备用
  const CREAM = { r: 0xf8, g: 0xf2, b: 0xe2 }
  const bgLight = Buffer.from(
    '<svg width="' + SIZE + '" height="' + SIZE + '" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="' + SIZE + '" height="' + SIZE + '" rx="' + r + '" ry="' + r +
    '" fill="rgb(' + CREAM.r + ',' + CREAM.g + ',' + CREAM.b + ')"/></svg>'
  )
  const goldBuf = await sharp(path.join(IMG, 'low-flame-logo-gold.png')).resize(w, h).toBuffer()
  await sharp(bgLight).composite([{ input: goldBuf, gravity: 'center' }])
    .png({ compressionLevel: 9 }).toFile(path.join(IMG, 'low-flame-icon-light.png'))
  console.log('  ✅ low-flame-icon-light.png        512×512  ' +
    Math.round(fs.statSync(path.join(IMG, 'low-flame-icon-light.png')).size / 1024) + ' KB   米色圆角底 + 金色 logo')

  console.log('\n完成。主 logo 用的是你的原色 #F2F1EE。')
})().catch(e => { console.error('失败:', e.message); process.exit(1) })
