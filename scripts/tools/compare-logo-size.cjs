/**
 * compare-logo-size.cjs —— 把新旧 logo 按页面实际显示尺寸并排渲染，
 * 看清"为什么看不出区别"。
 *
 * 关键：页头里 logo 只显示 23×32 px（塞在 44px 圆徽标里）。
 * 这个尺寸下，新旧 logo 都是一小块金色，肉眼几乎分不出。
 *
 * 用法（从 WEN 目录）: node scripts/tools/compare-logo-size.cjs <旧logo路径>
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const ROOT = process.cwd()
const NEW_LOGO = path.join(ROOT, 'public', 'images', 'low-flame-logo.png')
const OLD_LOGO = process.argv[2] || path.join(process.env.TEMP || '/tmp', 'old-logo.png')
const OUT = path.join(ROOT, '..', 'browser-automation', 'shots', 'logo-compare-size.png')

const CREAM = { r: 0xed, g: 0xe3, b: 0xd2 }   // 页头徽标底色 #EDE3D2

/** 造一个「圆形徽标 + 内部 logo」的预览块，模拟页头的实际渲染 */
async function badge(logoPath, boxPx) {
  const inner = Math.round(boxPx * 0.72)   // 页头用的是 h-[72%]
  const logo = await sharp(logoPath).resize({ height: inner, fit: 'inside' }).toBuffer()
  const circle =
    '<svg width="' + boxPx + '" height="' + boxPx + '" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="' + (boxPx / 2) + '" cy="' + (boxPx / 2) + '" r="' + (boxPx / 2) +
    '" fill="rgb(' + CREAM.r + ',' + CREAM.g + ',' + CREAM.b + ')"/></svg>'
  return sharp(Buffer.from(circle))
    .composite([{ input: logo, gravity: 'center' }])
    .png().toBuffer()
}

;(async () => {
  if (!fs.existsSync(OLD_LOGO)) { console.error('找不到旧 logo:', OLD_LOGO); process.exit(1) }

  const W = 1000, H = 470
  const parts = []

  // 第一行：页面实际尺寸（44px 徽标），新旧并排
  parts.push({ input: await badge(OLD_LOGO, 44), left: 60, top: 60 })
  parts.push({ input: await badge(NEW_LOGO, 44), left: 170, top: 60 })

  // 第二行：放大 4 倍看清差异
  parts.push({ input: await badge(OLD_LOGO, 176), left: 60, top: 190 })
  parts.push({ input: await badge(NEW_LOGO, 176), left: 300, top: 190 })

  // 右侧：新 logo 原始比例大图
  parts.push({
    input: await sharp(NEW_LOGO).resize({ height: 210, fit: 'inside' }).toBuffer(),
    left: 610, top: 180,
  })

  // 标注层
  const labels = [
    '<svg width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">',
    '<style>',
    '.h { font-family: Arial, sans-serif; font-size: 17px; font-weight: bold; fill: #111; }',
    '.t { font-family: Arial, sans-serif; font-size: 15px; fill: #333; }',
    '.s { font-family: Arial, sans-serif; font-size: 12px; fill: #999; }',
    '</style>',
    '<text x="60" y="40" class="h">页面实际显示尺寸（页头徽标 44px）</text>',
    '<text x="52" y="132" class="t">旧</text>',
    '<text x="162" y="132" class="t">新</text>',
    '<text x="60" y="165" class="s">这个尺寸下两者几乎看不出区别 —— 都是 44px 圆里的一小块金色</text>',
    '<text x="60" y="390" class="h">放大 4 倍（176px）看真实设计</text>',
    '<text x="52" y="440" class="t">旧 logo</text>',
    '<text x="292" y="440" class="t">新 logo</text>',
    '<text x="610" y="440" class="t">新 logo（原始比例）</text>',
    '</svg>',
  ].join('')

  parts.push({ input: Buffer.from(labels), left: 0, top: 0 })

  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite(parts).png().toFile(OUT)

  console.log('对比图已生成:', OUT)
  const om = await sharp(OLD_LOGO).metadata()
  const nm = await sharp(NEW_LOGO).metadata()
  console.log('  旧: ' + om.width + '×' + om.height + '  ' + Math.round(fs.statSync(OLD_LOGO).size / 1024) + ' KB  alpha=' + (om.hasAlpha ? '有' : '无'))
  console.log('  新: ' + nm.width + '×' + nm.height + '  ' + Math.round(fs.statSync(NEW_LOGO).size / 1024) + ' KB  alpha=' + (nm.hasAlpha ? '有' : '无'))
})().catch(e => { console.error('失败:', e.message); process.exit(1) })
