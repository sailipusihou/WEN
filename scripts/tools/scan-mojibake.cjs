/**
 * scan-mojibake.cjs —— 找出源码里的乱码中文注释（只读，不改任何文件）
 *
 * 背景：项目里部分中文注释是 GBK/UTF-8 混存的历史遗留乱码。它们不影响编译，
 * 但读起来毫无意义，且交接文档明确警告：**不要整文件转码**，只改目标行。
 *
 * 判断方法：正常中文注释里极少出现 GBK 乱码特有的生僻字（娣閺鏉鐠閸閹婵…），
 * 用这张"高频乱码字表"命中率来判断，比试图自动还原可靠（自动还原需要
 * iconv 且原文可能已二次损坏）。
 *
 * 用法：node scripts/tools/scan-mojibake.cjs [文件相对路径...]
 */
const fs = require('fs')
const path = require('path')

// GBK→UTF8 误解码时高频出现的字，正常中文注释里几乎不会连续出现
const MOJIBAKE_CHARS = '娣閺鏉鐠閸閹婵鐟缂鍟鍞鍕鍜鍏鍙鍑鍔鍐鍤鎴鎵鎶鎷鎻鎽鏂鏃鏖鏗鏘鏤鐘鎮鐢鐣鐦鐧鐨鐩鐪鐫鐬鐭鐮鐯鐲鐳鐴鐶鐸鐹鐺鐼鐿鑀鑂鑃閽闂闃闄闅闆闈闉闋闌闍闏闐闑闒闓闔闕闖闗闘闙闚闛關闝闞闟闠闡闢闣闤闥闦闧'

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['lib/db/repository-sqlite.ts']

let total = 0
for (const rel of files) {
  const abs = path.join(process.cwd(), rel)
  if (!fs.existsSync(abs)) { console.log(`跳过（不存在）: ${rel}`); continue }
  const lines = fs.readFileSync(abs, 'utf-8').split(/\r?\n/)
  const hits = []
  lines.forEach((line, i) => {
    // 只看注释行
    if (!/\/\/|\/\*|\*/.test(line)) return
    let n = 0
    for (const ch of line) if (MOJIBAKE_CHARS.includes(ch)) n++
    if (n >= 1) hits.push({ line: i + 1, n, text: line.trim() })
  })
  console.log(`\n=== ${rel} ===`)
  if (!hits.length) { console.log('  ✅ 未发现乱码注释'); continue }
  console.log(`  共 ${hits.length} 行可疑：`)
  for (const h of hits) console.log(`  ${String(h.line).padStart(5)}  [${h.n}]  ${h.text.slice(0, 110)}`)
  total += hits.length
}
console.log(`\n合计 ${total} 行`)
