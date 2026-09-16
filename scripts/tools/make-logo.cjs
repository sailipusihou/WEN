/**
 * make-logo.cjs —— 从用户提供的新 logo 生成网站用的透明背景 logo
 *
 * 输入：用户给的黑底白线图（对比度极大，最适合做阈值抠图）
 * 输出：
 *   public/images/low-flame-logo.png        —— 金色线条 + 透明底（浅色背景用，站点主色 #8A6A2E）
 *   public/images/low-flame-logo-white.png  —— 白色线条 + 透明底（深色背景用，如页脚/深色区）
 *   public/images/low-flame-logo-dark.png   —— 墨色线条 + 透明底（备用）
 *
 * 为什么不用 CSS 混合模式糊过去：
 *   黑底白线的图直接放到浅色网页上会是一块黑方块；用 mix-blend-mode 在带阴影/渐变
 *   的容器里会露馅。做真正的 alpha 通道才是正解。
 *
 * 用法：node scripts/tools/make-logo.cjs <输入图片路径>
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SRC = process.argv[2]
if (!SRC || !fs.existsSync(SRC)) {
  console.error('用法: node scripts/tools/make-logo.cjs <输入图片路径>')
  process.exit(1)
}

const OUT_DIR = path.join(process.cwd(), 'public', 'images')

/** 站点主色（logo 金） */
const GOLD = { r: 0x8a, g: 0x6a, b: 0x2e }
/** 页脚等深色背景用的白 */
const WHITE = { r: 0xff, g: 0xff, b: 0xff }
/** 备用墨色 */
const INK = { r: 0x2a, g: 0x21, b: 0x18 }

/**
 * 把「有色线条 + 纯色背景」的图转成「指定颜色线条 + 透明背景」。
 *
 * ⚠️ 关键：不能直接把亮度当 alpha。
 *    源图的"黑底"实际是深灰（RGB≈25），直接当 alpha 会得到 alpha≈25 的半透明底 ——
 *    贴到网页上就是 logo 周围浮着一块浅色方块（第一版踩过）。
 *    正确做法是做个「电平映射」：
 *      亮度 ≤ LOW  → 全透明（背景）
 *      亮度 ≥ HIGH → 全不透明（线条）
 *      中间        → 线性过渡（保留抗锯齿的平滑边缘，比硬阈值无锯齿）
 */
const LOW = 70    // 低于此亮度视为背景
const HIGH = 170  // 高于此亮度视为线条

async function colorize(srcPath, { r, g, b }, outPath) {
  const img = sharp(srcPath).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })

  const out = Buffer.alloc(info.width * info.height * 4)
  let opaque = 0, clear = 0
  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * 4
    const R = data[o], G = data[o + 1], B = data[o + 2]
    // 感知亮度（ITU-R BT.601）
    const lum = 0.299 * R + 0.587 * G + 0.114 * B
    let a
    if (lum <= LOW) a = 0
    else if (lum >= HIGH) a = 255
    else a = Math.round(((lum - LOW) / (HIGH - LOW)) * 255)

    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a
    if (a > 200) opaque++
    else if (a < 20) clear++
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })     // 裁掉透明边（threshold 要够大，否则抗锯齿的微透明像素会挡住裁剪）
    .png({ compressionLevel: 9 })
    .toFile(outPath)

  const m2 = await sharp(outPath).metadata()
  const total = info.width * info.height
  console.log(`  ✅ ${path.basename(outPath)}  ${m2.width}×${m2.height}  (${Math.round(fs.statSync(outPath).size / 1024)} KB)`)
  console.log(`      实心线条 ${opaque} px · 全透明 ${clear} px · 过渡 ${total - opaque - clear} px`)
}

;(async () => {
  console.log('输入:', SRC)
  const meta = await sharp(SRC).metadata()
  console.log(`源图: ${meta.width}×${meta.height}  ${meta.format}\n`)

  console.log('生成三个版本：')
  await colorize(SRC, GOLD, path.join(OUT_DIR, 'low-flame-logo.png'))
  await colorize(SRC, WHITE, path.join(OUT_DIR, 'low-flame-logo-white.png'))
  await colorize(SRC, INK, path.join(OUT_DIR, 'low-flame-logo-dark.png'))

  console.log('\n完成。下一步：确认代码里的引用路径，并部署。')
})().catch(e => { console.error('失败:', e.message); process.exit(1) })
