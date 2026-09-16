/**
 * preview-logo.cjs —— 生成 logo 效果预览图（白底 / 深底 / 原图对比）
 */
const sharp = require('sharp')
const path = require('path')

const ROOT = process.cwd()
const OUT = path.join(ROOT, '..', 'browser-automation', 'shots')

;(async () => {
  // 1. 浅色底（金色 logo）
  await sharp({ create: { width: 620, height: 340, channels: 4, background: { r: 250, g: 247, b: 240, alpha: 1 } } })
    .composite([{ input: path.join(ROOT, 'public/images/low-flame-logo.png'), gravity: 'center' }])
    .png().toFile(path.join(OUT, 'logo-preview-light.png'))

  // 2. 深色底（白色 logo）
  await sharp({ create: { width: 620, height: 340, channels: 4, background: { r: 26, g: 26, b: 26, alpha: 1 } } })
    .composite([{ input: path.join(ROOT, 'public/images/low-flame-logo-white.png'), gravity: 'center' }])
    .png().toFile(path.join(OUT, 'logo-preview-dark.png'))

  // 3. 原图 vs 抠图 并排对比
  await sharp({ create: { width: 760, height: 310, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite([
      { input: path.join(ROOT, 'scripts/tools/logo-source.png'), left: 30, top: 10 },
      { input: path.join(ROOT, 'public/images/low-flame-logo.png'), left: 400, top: 10 },
    ])
    .png().toFile(path.join(OUT, 'logo-compare.png'))

  console.log('已生成 3 张预览图')
})().catch(e => { console.error('失败:', e.message); process.exit(1) })
