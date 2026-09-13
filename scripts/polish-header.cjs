// 头部/导航条的小字与淡色统一（可重复执行）
const fs = require('fs')
const path = require('path')

const FILES = [
  path.join(__dirname, '..', 'components', 'layout', 'Header.tsx'),
  path.join(__dirname, '..', 'components', 'layout', 'TopBar.tsx'),
]

const OPACITY = { '40': '65', '50': '72', '55': '76', '60': '80', '70': '85' }
const SIZE = [['text-[9px]', 'text-[11px]'], ['text-[8px]', 'text-[11px]'], ['text-[7px]', 'text-[10px]']]

for (const f of FILES) {
  let s = fs.readFileSync(f, 'utf-8')
  const before = s
  for (const [from, to] of Object.entries(OPACITY)) {
    s = s.replace(new RegExp(`(text-(?:[a-z-]+|white|\\[#[0-9A-Fa-f]{6}\\]))\\/${from}\\b`, 'g'), `$1/${to}`)
  }
  for (const [from, to] of SIZE) s = s.split(from).join(to)
  fs.writeFileSync(f, s, 'utf-8')
  console.log(path.basename(f), s === before ? '(无改动)' : '已更新')
}
