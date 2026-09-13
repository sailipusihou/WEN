// 首页视觉一致性调整（可重复执行，纯文本替换）
//   1) 提高文字对比度: text-* 的透明度地板抬上来（此前大量 /20~/40 几乎看不见）
//   2) 放大小字号: 7/8/9/10px → 10/11/11/12px
//   3) 眉标改花样字体: 9px 无衬线大写 → Playfair 斜体（优雅、有装饰性）
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'components', 'layout', 'HomeClient.tsx')
let src = fs.readFileSync(FILE, 'utf-8')
const before = src

// ---- 1) 对比度：只动 text-*，不动 bg-/border- ----
const OPACITY = { '20': '55', '25': '58', '30': '62', '35': '66', '40': '70', '45': '72', '50': '76', '55': '79', '60': '82', '70': '86' }
for (const [from, to] of Object.entries(OPACITY)) {
  // text-xxx/NN  以及  text-xxx/NN 形式（含 white）
  const re = new RegExp(`(text-(?:[a-z-]+|white|\\[#[0-9A-Fa-f]{6}\\]))\\/${from}\\b`, 'g')
  src = src.replace(re, `$1/${to}`)
}

// ---- 2) 小字号放大 ----
const SIZE = [['text-[7px]', 'text-[10px]'], ['text-[8px]', 'text-[11px]'], ['text-[9px]', 'text-[11px]'], ['text-[10px]', 'text-[12px]']]
for (const [from, to] of SIZE) src = src.split(from).join(to)

// ---- 3) 眉标改 Playfair 斜体（花样字体）----
const EYEBROWS = [
  'font-sans text-[11px] text-coral tracking-[0.15em] uppercase font-medium',
  'font-sans text-[11px] text-coral-light tracking-[0.15em] uppercase font-medium',
]
for (const e of EYEBROWS) {
  const cyan = e.replace('text-coral-light', 'text-coral')
  src = src.split(e).join('font-en italic text-[15px] tracking-[0.01em] text-coral')
  src = src.split(cyan).join('font-en italic text-[15px] tracking-[0.01em] text-coral')
}
// 带 border-b 的那个眉标（hero 区）单独处理
src = src.split('font-en italic text-[15px] tracking-[0.01em] text-coral border-b border-coral/20 pb-1 inline-block')
        .join('font-en italic text-[15px] tracking-[0.01em] text-coral border-b border-coral/25 pb-1 inline-block')

fs.writeFileSync(FILE, src, 'utf-8')

console.log('文件:', FILE)
console.log('改动:', src === before ? '无（已是最新）' : '已写入')
// 统计
const cnt = (re) => (src.match(re) || []).length
console.log('\n剩余淡色文字 (text-*/20~/40):', cnt(/text-[a-z-]+\/(?:2\d|3\d|4[0-5])\b/g))
console.log('剩余 7~9px 文字:', cnt(/text-\[(?:7|8|9)px\]/g))
console.log('Playfair 斜体眉标:', cnt(/font-en italic text-\[15px\]/g))
