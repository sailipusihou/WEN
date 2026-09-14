/**
 * 全站色彩「压实」重映射
 *
 * 诊断（线上实测）：
 *   · 明度≥90 的近白背景占 79% 面积 —— 没有色块对比，整页发浅
 *   · 背景平均饱和度仅 19.6%
 *   · 次要文字 #6C6F75 饱和度只有 4%（纯灰）—— 这是"发灰显廉价"的主因
 *   · 品牌色 jade #8BA8A0 饱和14% / gold #8B7D5C 饱和20% —— 淡到没有记忆点
 *
 * 处方：底子下沉、文字去灰、品牌色加饱和、边框加到看得见。
 * 只处理前台文件，后台（admin）有自己的主题系统，不动。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

// 颜色映射：old(大写hex) -> new
const MAP = {
  // ---- 底子：整体下沉到暖调羊皮纸 ----
  '#F8F5F0': '#F1E9DC',   // 页面底（购物车/结算/PDP）
  '#FCFBF8': '#F1E9DC',   // PDP 页面底
  '#F8F6F2': '#EFE6D6',   // paper-light
  '#F2EFEA': '#EAE0CE',   // paper
  '#F7F4EF': '#EDE4D4',
  '#F9FAFB': '#F3ECE0',   // 冷白残留
  '#F3F4F6': '#F2EADF',   // 冷白残留（多为浅灰背景）

  // ---- 卡片 / 商品图面板：加深，让白卡片真的浮起来 ----
  '#F2EAE0': '#E6D8C2',
  '#EDE8E0': '#E2D5C0',
  '#EDE8DC': '#DDCEB4',
  '#E5DFD5': '#D8C9AE',

  // ---- 文字：去灰，改成暖调深色 ----
  '#6B6B6B': '#57503F',
  '#6C6F75': '#57503F',
  '#6B6F75': '#57503F',
  '#4A4D52': '#403A31',
  '#8E9298': '#8A8071',
  '#2D2F33': '#221E1A',
  '#2C2C2C': '#221E1A',
  '#231F1C': '#1C1814',
  '#1A1C1E': '#171310',

  // ---- 品牌色：加饱和，做出记忆点 ----
  '#8BA8A0': '#5F7D72',   // jade 饱和14 -> 28
  '#A8C4BC': '#7D9B8F',
  '#CBDCD6': '#B9CFC6',
  '#6E8B83': '#4A665D',
  '#8B7D5C': '#8A6A2E',   // gold 饱和20 -> 57
  '#B8A06C': '#A07C34',
  '#A0885A': '#A07C34',   // bronze
  '#C4B08C': '#BFA06A',
  '#E0D4BE': '#D6C49E',
  '#7D6A44': '#6B5424',

  // ---- 强调色：更深更实 ----
  '#B8452E': '#A83420',
  '#C46A54': '#A8472E',
  '#B85450': '#A83E33',
  '#D48874': '#C4694F',
  '#A55440': '#8E3C28',
  '#C49A5E': '#A87C2E',

  // ---- 浮层条 ----
  '#FAFAFA': '#FBF7EF',
  '#F0E9DC': '#EFE4CE',

  // ---- 输入 / 表单 ----
  '#F5F1EA': '#EDE3D2',
}

// 带 alpha 的 rgba（空格形式）
const RGBA_MAP = {
  'rgba(35,31,28,0.05)': 'rgba(58,44,26,0.10)',
  'rgba(35,31,28,0.08)': 'rgba(58,44,26,0.18)',
  'rgba(35,31,28,0.10)': 'rgba(58,44,26,0.22)',
  'rgba(35,31,28,0.14)': 'rgba(58,44,26,0.26)',
  'rgba(35,31,28,0.32)': 'rgba(58,44,26,0.42)',
  'rgba(35,31,28,0.40)': 'rgba(58,44,26,0.50)',
  'rgba(35,31,28,0.42)': 'rgba(58,44,26,0.52)',
  'rgba(35,31,28,0.45)': 'rgba(58,44,26,0.55)',
  'rgba(35,31,28,0.55)': 'rgba(58,44,26,0.62)',
}

// 只处理前台
const DIRS = ['app', 'components', 'lib']
const SKIP = [/[\\/]admin[\\/]/, /[\\/]api[\\/]/, /globals\.css$/, /admin-i18n/]
const SKIP_FILES = ['tailwind.config.js']

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(e.name)) continue
      walk(p, out)
    } else if (/\.(tsx|ts|css)$/.test(e.name)) {
      const rel = path.relative(ROOT, p)
      if (SKIP.some(re => re.test(p))) continue
      if (SKIP_FILES.includes(path.basename(p))) continue
      out.push(p)
    }
  }
  return out
}

const files = []
for (const d of DIRS) {
  const full = path.join(ROOT, d)
  if (fs.existsSync(full)) walk(full, files)
}

let touched = 0, repl = 0
const report = {}
for (const f of files) {
  let src = fs.readFileSync(f, 'utf-8')
  const before = src
  for (const [o, n] of Object.entries(MAP)) {
    const re = new RegExp(o.replace('#', '#'), 'gi')
    const m = src.match(re)
    if (m) { src = src.replace(re, n); repl += m.length; report[o] = (report[o] || 0) + m.length }
  }
  for (const [o, n] of Object.entries(RGBA_MAP)) {
    if (src.includes(o)) { const c = src.split(o).length - 1; src = src.split(o).join(n); repl += c; report[o] = (report[o] || 0) + c }
    // 带空格变体
    const spaced = o.replace(/,/g, ', ')
    if (spaced !== o && src.includes(spaced)) { const c = src.split(spaced).length - 1; src = src.split(spaced).join(n); repl += c }
  }
  if (src !== before) { fs.writeFileSync(f, src, 'utf-8'); touched++ }
}

console.log(`处理文件: ${files.length} 个，改动 ${touched} 个，替换 ${repl} 处\n`)
console.log('替换明细（前 20）:')
Object.entries(report).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log(`  ${k}  ×${v}`))
