/**
 * analyze-logo-color.cjs —— 分析用户提供的 logo 文件里到底是什么颜色
 * 用法: node scripts/tools/analyze-logo-color.cjs <图片路径>
 */
const sharp = require('sharp')
const path = require('path')

const SRC = process.argv[2]
if (!SRC) { console.error('用法: node scripts/tools/analyze-logo-color.cjs <图片路径>'); process.exit(1) }

;(async () => {
  const img = sharp(SRC).ensureAlpha()
  const meta = await img.metadata()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })

  console.log('=== 文件信息 ===')
  console.log('  尺寸:', meta.width + '×' + meta.height)
  console.log('  格式:', meta.format, ' 通道:', info.channels, ' 有 alpha:', meta.hasAlpha)

  // 统计颜色分布
  const counts = new Map()
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * info.channels
      const r = data[o], g = data[o + 1], b = data[o + 2]
      // 量化到 8 级，聚合相近颜色
      const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5)
      counts.set(key, (counts.get(key) || 0) + 1)
      // 亮像素的包围盒（用来判断图形占比）
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      if (lum > 128) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  const total = info.width * info.height
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  console.log('\n=== 颜色分布（前 12 名）===')
  sorted.forEach(([k, n]) => {
    const r = ((k >> 10) & 31) << 3
    const g = ((k >> 5) & 31) << 3
    const b = (k & 31) << 3
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    const pct = (n / total * 100).toFixed(1)
    console.log(`  ${hex}  rgb(${r},${g},${b})  ${pct}%  (${n} px)`)
  })

  console.log('\n=== 亮像素（图形部分）包围盒 ===')
  console.log(`  x: ${minX} → ${maxX}  (宽 ${maxX - minX + 1})`)
  console.log(`  y: ${minY} → ${maxY}  (高 ${maxY - minY + 1})`)
  console.log(`  图形占比: ${((maxX - minX + 1) / info.width * 100).toFixed(1)}% × ${((maxY - minY + 1) / info.height * 100).toFixed(1)}%`)

  // 采样图形内部的平均颜色（避开背景）
  let sr = 0, sg = 0, sb = 0, n = 0
  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * info.channels
    const r = data[o], g = data[o + 1], b = data[o + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    if (lum > 200) { sr += r; sg += g; sb += b; n++ }
  }
  if (n) {
    const avg = '#' + [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)]
      .map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    console.log('\n=== 图形（亮部）平均颜色 ===')
    console.log(`  ${avg}  rgb(${Math.round(sr / n)},${Math.round(sg / n)},${Math.round(sb / n)})  采样 ${n} px`)
  }
})().catch(e => { console.error('失败:', e.message); process.exit(1) })
