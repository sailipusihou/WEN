/**
 * 色彩压实 第二轮：清掉冷暖不一的残留白与冷灰
 *
 * 第一轮之后残留：
 *   · #FFFFFF 纯白大面积（bg-white）—— 在暖调页面上显得"冷、浅"
 *   · Tailwind 默认冷灰（gray-50/100/200）—— 与暖色调完全冲突，是画面里最"脏"的部分
 *   · 页脚/条状浮层的浅色仍是明度96
 *
 * 做法：把前台所有 bg-white 换成暖白 #FFFCF7（保留"白"但带暖调），
 *       冷灰一律换成对应的暖色阶。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const WARM_WHITE = '#FFFCF7'

// Tailwind 冷灰 → 暖色（按语义就近替换）
const REPL = [
  // 背景类
  [/\bbg-gray-50\b/g, 'bg-paper-light'],
  [/\bbg-gray-100\b/g, 'bg-paper'],
  [/\bbg-gray-200\b/g, 'bg-paper-dark'],
  // 边框类
  [/\bborder-gray-200\b/g, 'border-paper-dark'],
  [/\bborder-gray-100\b/g, 'border-paper'],
  // 文字类
  [/\btext-gray-500\b/g, 'text-ink-soft'],
  [/\btext-gray-600\b/g, 'text-ink-mid'],
  [/\btext-gray-400\b/g, 'text-ink-faint'],
  [/\btext-gray-700\b/g, 'text-ink'],
  // 纯白 → 暖白（保留白，但入暖调，不再与页面冷暖冲突）
  [/\bbg-white\b/g, ''],   // 由下面单独处理（要保留其它 bg-white/xx 变体语义）
]

const SKIP = [/[\\/]admin[\\/]/, /[\\/]api[\\/]/, /node_modules/, /\.next/]

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!SKIP.some(re => re.test(p))) walk(p, out) }
    else if (/\.(tsx|ts|css)$/.test(e.name) && !SKIP.some(re => re.test(p))) out.push(p)
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
  // 先处理 bg-white 的变体（bg-white/70 等）→ 暖白 + 保留透明度
  src = src.replace(/bg-white\/(\d+)/g, (m, a) => {
    n++; report['bg-white/opacity → 暖白'] = (report['bg-white/opacity → 暖白'] || 0) + 1
    return `bg-[${WARM_WHITE}]/${a}`
  })
  src = src.replace(/\bbg-white\b/g, () => {
    n++; report['bg-white → #FFFCF7'] = (report['bg-white → #FFFCF7'] || 0) + 1
    return `bg-[${WARM_WHITE}]`
  })
  // 冷灰
  for (const [re, to] of REPL) {
    if (to === '') continue
    const m = src.match(re)
    if (m) { src = src.replace(re, to); n += m.length; report[`${re.source} → ${to}`] = (report[`${re.source} → ${to}`] || 0) + m.length }
  }
  // 文本里的 #FFFFFF（多为深底上的文字，保留；只处理明显是背景的内联白）
  src = src.replace(/backgroundColor:\s*['"]#FFFFFF['"]/gi, () => { n++; report['inline bg #FFFFFF → 暖白'] = (report['inline bg #FFFFFF → 暖白'] || 0) + 1; return `backgroundColor: '${WARM_WHITE}'` })
  if (src !== before) { fs.writeFileSync(f, src, 'utf-8'); touched++ }
}

console.log(`改动 ${touched} 个文件，替换 ${n} 处\n`)
Object.entries(report).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}  ×${v}`))
