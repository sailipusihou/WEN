/**
 * recover-mojibake.cjs —— 精确还原乱码中文注释（默认只报告，加 --apply 才写回）
 *
 * 原理：这些注释是编码互串造成的，有两种方向，都可以精确还原（不是靠猜）：
 *
 *   A. 原文是 UTF-8，被当成 GBK 解读
 *      例：「商品」UTF-8 = E5 95 86 E5 93 81，按 GBK 读 → 「鍟嗗搧」
 *      还原：把乱码按 GBK 编码回字节 → 再按 UTF-8 解码
 *
 *   B. 原文是 GBK，被当成 UTF-8 解读
 *      例：「添加」GBK = CC ED BC D3，按 UTF-8 读 → 「娣囨繂」
 *      还原：把乱码按 UTF-8 编码回字节 → 再按 GBK 解码
 *
 * Node 自带 TextDecoder('gbk')，但没有 GBK 编码器 —— 这里用「枚举所有合法
 * 双字节组合、反向建表」的办法造一个。ASCII 直接透传。
 *
 * 安全性：只改注释行（// 或 * 开头且不含代码的整行）；任何还原结果不像中文
 *         的都不动。改前逐个打印对照，--apply 时整文件备份。
 *
 * ── 实测结论（2026-09-16，lib/db/repository-sqlite.ts）──
 *   68 行可疑 → 可机械还原 20 行；剩余约 61 行**不可逆**。
 *
 *   不可逆的原因：那些行至少经历了一轮「字节被替换成 ?」的有损损坏，
 *   信息已经丢了。反复套用变换只会来回震荡，永远收敛不到中文，例如：
 *       缂佺喕顓 → 缂備胶鍠曢 → 缂傚倷鑳堕崰鏇㈩敇 → …
 *   本脚本对这类行一律保持原样（宁可留乱码，不改错）。
 *
 *   剩下的为什么建议**不要靠上下文猜着重写**：乱码本身是"这里是坏的、
 *   别信我，去看代码"的显式信号；而一条猜错却读起来通顺的注释，会让后来人
 *   当真。对于纯注释（不影响编译，交接文档也这么写的）来说，前者反而更安全。
 *
 * 用法：node scripts/tools/recover-mojibake.cjs [--apply] [文件...]
 */
const fs = require('fs')
const path = require('path')

// ---------- 反向 GBK 编码表 ----------
const gbkDec = new TextDecoder('gbk', { fatal: false })
const gbkEnc = new Map()          // char -> [byte, ...]
for (let b1 = 0x81; b1 <= 0xfe; b1++) {
  for (let b2 = 0x40; b2 <= 0xfe; b2++) {
    if (b2 === 0x7f) continue
    const ch = gbkDec.decode(Buffer.from([b1, b2]))
    if (ch.length === 1 && ch !== '�' && !gbkEnc.has(ch)) gbkEnc.set(ch, [b1, b2])
  }
}
for (let i = 0x20; i <= 0x7e; i++) gbkEnc.set(String.fromCharCode(i), [i])

function gbkEncode(str) {
  const out = []
  for (const ch of str) {
    const b = gbkEnc.get(ch)
    if (!b) return null            // 含无法用 GBK 表示的字 → 这个方向不成立
    out.push(...b)
  }
  return Buffer.from(out)
}

// ---------- 两种还原方向 ----------
function tryA(s) {                 // 原 UTF-8 → 被当 GBK
  const bytes = gbkEncode(s)
  if (!bytes) return null
  const out = bytes.toString('utf-8')
  return out.includes('�') ? null : out
}
function tryB(s) {                 // 原 GBK → 被当 UTF-8
  const bytes = Buffer.from(s, 'utf-8')
  const out = gbkDec.decode(bytes)
  return out.includes('�') ? null : out
}

/**
 * 「乱码特征字」—— GBK/UTF-8 互串时必然出现、而正常中文注释里几乎不会用到的生僻字。
 *
 * 这是整个脚本的安全阀：
 *   输入不含特征字 → 一律当成正常注释，绝不动它（否则会把好注释"还原"成乱码，
 *   第一版脚本就踩了这个坑，把 `例如商品详情页只查了当前这一件` 改坏了）；
 *   还原结果只要还含特征字 → 视为没还原干净，不算成功。
 */
const RARE = /[鍟鍞鍕鍜鍏鍙鍑鍔鍐鍤鎴鎵鏂鏃鏖鐘鐢鐣鐦鐧鐨鐩鐪鐫鐮鐯鐲鐳鐴鐶鐸鐹鐺鐼鐿鑀鑂娣閺鏉鐠閸閹婵鐟缂閽闂闃闄闅闆闈闉闋闌闍闏闐闑闒闓闔闕闖闗闘闙闚闛關闝闞闟闠闡闢闣闤闥闦闧闁閻閼閾閿闀闇鏇濞]/

/**
 * 还原一段可能是乱码的文本。
 * 项目里这些注释有「双重编码」的（乱码套乱码），所以需要反复套用直到得到干净结果。
 */
function recover(seg) {
  if (!RARE.test(seg)) return seg        // 不像乱码 → 不动
  let cur = seg
  for (let i = 0; i < 4; i++) {
    for (const f of [tryA, tryB]) {
      const r = f(cur)
      if (r && r !== cur && !RARE.test(r)) return r
    }
    const nxt = tryA(cur) || tryB(cur)   // 这轮没有干净结果，再套一层继续试
    if (!nxt || nxt === cur) break
    cur = nxt
  }
  return seg                             // 还原不出干净结果 → 保持原样（宁可留乱码，不改错）
}

// ---------- 主流程 ----------
const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const files = args.filter(a => !a.startsWith('--'))
if (files.length === 0) files.push('lib/db/repository-sqlite.ts')

let totalChanged = 0
for (const rel of files) {
  const abs = path.join(process.cwd(), rel)
  if (!fs.existsSync(abs)) { console.log(`跳过: ${rel}`); continue }
  const raw = fs.readFileSync(abs, 'utf-8')
  const hadBOM = raw.charCodeAt(0) === 0xFEFF
  // ⚠️ 必须保留原换行符。这个仓库的 .ts 文件是 CRLF，如果这里统一用 '\n' 写回，
  //    整个文件每一行都会被判为改动，产生几千行的假 diff（交接文档专门警告过
  //    "不要整文件转码"就是这个坑）。
  const EOL = raw.includes('\r\n') ? '\r\n' : '\n'
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/)

  console.log(`\n########## ${rel} ##########`)
  let changed = 0
  const out = lines.map((line, i) => {
    // 只处理注释行：整行（去掉缩进后）以 // 或 * 或 /* 开头
    const t = line.trim()
    const isComment = t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
    if (!isComment) return line
    if (!/[^\x00-\x7f]/.test(line)) return line      // 纯 ASCII，无需处理

    // 逐段还原：只替换注释里的非 ASCII 片段，保留 "// " 等符号
    let changedLine = false
    const newLine = line.replace(/[^\x00-\x7f]+/g, (seg) => {
      const out = recover(seg)
      if (out === seg) return seg
      changedLine = true
      return out
    })
    if (!changedLine) return line
    changed++
    console.log(`  ${String(i + 1).padStart(5)}`)
    console.log(`      - ${line.trim().slice(0, 100)}`)
    console.log(`      + ${newLine.trim().slice(0, 100)}`)
    return newLine
  })

  console.log(`  → 可还原 ${changed} 行`)
  totalChanged += changed

  if (APPLY && changed > 0) {
    fs.writeFileSync(abs + '.bak-mojibake', raw, 'utf-8')
    fs.writeFileSync(abs, (hadBOM ? '﻿' : '') + out.join(EOL), 'utf-8')
    console.log(`  ✅ 已写回（换行符保持 ${EOL === '\r\n' ? 'CRLF' : 'LF'}；原文件备份为 ${path.basename(abs)}.bak-mojibake）`)
  }
}
console.log(`\n合计可还原 ${totalChanged} 行${APPLY ? '（已写入）' : ' —— 加 --apply 才写回'}`)
