/**
 * 字体对齐参考站
 *
 * 参考站实测的字体策略（关键在"字距"而非字重）：
 *   · 大标题  Akatab 32px 字重 400（轻！）字距 0.64px   —— 大而轻，靠字号与字距撑气场
 *   · 按钮    13px 字重 700 字距 3.9px（≈0.30em）      —— 靠超宽字距做力量感
 *   · 手风琴  16px 字重 700 字距 4.8px（≈0.30em）大写
 *   · 正文    14px 字距 0.28px（≈0.02em）
 *
 * 我们现状：标题字重 600（偏重）、按钮字距 0.2em、手风琴 0.22em（都偏窄）
 * 调整：标题降到 500 并加一点正字距；按钮/标签/手风琴字距拉到 0.28~0.30em；正文加 0.01em
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
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

// 字距映射（只动 tracking-[...] 与 tracking-<name>）
const TRACK = [
  // 按钮/标签：0.16~0.22em → 0.28em（对齐参考站 3.9px@13px ≈ 0.30em）
  [/tracking-\[0\.16em\]/g, 'tracking-[0.28em]'],
  [/tracking-\[0\.2em\]/g, 'tracking-[0.28em]'],
  [/tracking-\[0\.22em\]/g, 'tracking-[0.3em]'],
  [/tracking-\[0\.14em\]/g, 'tracking-[0.26em]'],
  [/tracking-\[0\.18em\]/g, 'tracking-[0.26em]'],
  [/tracking-\[0\.12em\]/g, 'tracking-[0.22em]'],
  [/tracking-\[0\.15em\]/g, 'tracking-[0.24em]'],
  [/tracking-\[0\.1em\]/g, 'tracking-[0.2em]'],
  [/tracking-wider\b/g, 'tracking-[0.18em]'],
  [/tracking-wide\b/g, 'tracking-[0.1em]'],
]
// 大标题：字重 600 → 500，紧凑字距 → 轻微正字距（参考站 H1 是 0.64px 正字距）
const HEAD = [
  [/font-en text-(\[[^\]]+\]|3xl|4xl|5xl|6xl|7xl|8xl|2xl) ([^"]*?)font-semibold/g, 'font-en text-$1 $2font-medium'],
  [/tracking-tight/g, 'tracking-[0.005em]'],
]

let touched = 0, n = 0
const report = {}
for (const f of files) {
  let src = fs.readFileSync(f, 'utf-8')
  const before = src
  for (const [re, to] of TRACK) {
    const m = src.match(re)
    if (m) { src = src.replace(re, to); n += m.length; report[`${re.source} → ${to}`] = (report[`${re.source} → ${to}`] || 0) + m.length }
  }
  for (const [re, to] of HEAD) {
    const m = src.match(re)
    if (m) { src = src.replace(re, to); n += m.length; report[`${re.source} → ${to}`] = (report[`${re.source} → ${to}`] || 0) + m.length }
  }
  if (src !== before) { fs.writeFileSync(f, src, 'utf-8'); touched++ }
}

console.log(`改动 ${touched} 个文件，替换 ${n} 处\n`)
Object.entries(report).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}  ×${v}`))
