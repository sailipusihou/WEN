/**
 * 色彩压实 第三轮：回到净白 + 商品区微黄 + 文字加深 + 字体对齐参考站
 *
 * 前两轮的偏差：第二轮把底色压成 #F1E9DC 深羊皮纸，反而更闷。
 * 参考站实测页面底是 #FAFAF6 —— 近乎纯白只带一丝暖调。
 * 原理：对比是相对的，底色越接近白，深色字越"跳"；底色一旦发深，字反而显闷。
 *
 * 本轮：
 *   1) 白 → 真正的净白（卡片纯白 #FFFFFF，页面 #FBFAF7）
 *   2) 商品图区/暖块 → 单独泛微黄 #F8F2E2（与白卡片形成层次）
 *   3) 文字 → 再加深，且去掉偏灰的成分，改成暖深棕（贴参考站 #4A3422 的路子）
 *   4) 字体 → 对齐参考站的字距策略：标题更轻更大、按钮/标签字距拉宽
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

const MAP = {
  // ---- 1) 净白 ----
  '#F1E9DC': '#FBFAF7',   // 页面底 → 近乎纯白（参考站 #FAFAF6）
  '#EFE6D6': '#FFFFFF',   // 卡片底 → 纯白
  '#EAE0CE': '#FDFCFA',   // paper
  '#F3ECE0': '#FBFAF7',
  '#F2EADF': '#FBFAF7',
  '#EDE4D4': '#FCFBF8',
  '#FFFCF7': '#FFFFFF',   // 上一轮的暖白 → 纯白

  // ---- 2) 商品区/暖块：单独泛微黄 ----
  '#E6D8C2': '#F8F2E2',   // 商品图面板
  '#E2D5C0': '#F7F0DE',
  '#E5DFD5': '#F6EFDD',
  '#D8C9AE': '#F2EBD8',
  '#DDCEB4': '#EFE7D4',

  // ---- 3) 文字：加深 + 去灰改暖深棕 ----
  '#221E1A': '#2A2118',
  '#1C1814': '#241C12',
  '#171310': '#1F1811',
  '#57503F': '#5A4A36',
  '#403A31': '#4A3E2E',
  '#8A8071': '#7A6B54',
  '#6B6B6B': '#5A4A36',

  // ---- 边框 / 浅暖块：净白底上要更清晰 ----
  '#DDCEB4': '#EFE7D4',
  '#DBD0BC': '#E7DFCE',
}

const RGBA_MAP = {
  'rgba(58,44,26,0.10)': 'rgba(74,58,36,0.12)',
  'rgba(58,44,26,0.18)': 'rgba(74,58,36,0.20)',
  'rgba(58,44,26,0.22)': 'rgba(74,58,36,0.24)',
  'rgba(58,44,26,0.26)': 'rgba(74,58,36,0.28)',
  'rgba(58,44,26,0.42)': 'rgba(74,58,36,0.46)',
  'rgba(58,44,26,0.50)': 'rgba(74,58,36,0.54)',
  'rgba(58,44,26,0.52)': 'rgba(74,58,36,0.56)',
  'rgba(58,44,26,0.55)': 'rgba(74,58,36,0.58)',
  'rgba(58,44,26,0.62)': 'rgba(74,58,36,0.65)',
}

const SKIP = [/[\\/]admin[\\/]/, /[\\/]api[\\/]/, /node_modules/, /\.next/]

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!SKIP.some(re => re.test(p))) walk(p, out) }
    else if (/\.(tsx|ts)$/.test(e.name) && !SKIP.some(re => re.test(p))) out.push(p)
  }
  return out
}

const files = []
for (const d of ['app', 'components']) {
  const full = path.join(ROOT, d)
  if (fs.existsSync(full)) walk(full, files)
}

let touched = 0, n = 0
const report = {}
for (const f of files) {
  let src = fs.readFileSync(f, 'utf-8')
  const before = src
  for (const [o, nw] of Object.entries(MAP)) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(o)) continue
    const re = new RegExp(o, 'gi')
    const m = src.match(re)
    if (m) { src = src.replace(re, nw); n += m.length; report[`${o} → ${nw}`] = (report[`${o} → ${nw}`] || 0) + m.length }
  }
  for (const [o, nw] of Object.entries(RGBA_MAP)) {
    if (src.includes(o)) { const c = src.split(o).length - 1; src = src.split(o).join(nw); n += c; report[`${o} → ${nw}`] = (report[`${o} → ${nw}`] || 0) + c }
  }
  if (src !== before) { fs.writeFileSync(f, src, 'utf-8'); touched++ }
}

console.log(`改动 ${touched} 个文件，替换 ${n} 处\n`)
Object.entries(report).sort((a, b) => b[1] - a[1]).slice(0, 24).forEach(([k, v]) => console.log(`  ${k}  ×${v}`))
