#!/usr/bin/env node
/**
 * 把 Apple Pay 域名验证文件写进线上 data/ 目录。
 *
 * 先决条件：从 PayPal 开发者后台下载 apple-developer-merchantid-domain-association
 * （Live 环境版本），存成本地文件，然后用这个脚本上传。
 *
 * 用法（本地）:
 *   $env:SSH_KEY='D:\2026-06-20\lowflame-server-key'; node scripts/deploy/set-applepay-domain-file.cjs .\apple-developer-merchantid-domain-association
 *
 * 脚本做的事：
 *   1. 读本地文件，做基本校验（非空、无 BOM、不是 HTML）
 *   2. 上传到服务器 /var/www/lowflame/data/apple-developer-merchantid-domain-association
 *   3. curl 线上 /.well-known/... 确认返回 200 且内容一致
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const localFile = process.argv[2]
if (!localFile) {
  console.error('用法: node scripts/deploy/set-applepay-domain-file.cjs <本地文件路径>')
  process.exit(1)
}

const abs = path.resolve(localFile)
if (!fs.existsSync(abs)) {
  console.error('找不到文件:', abs)
  process.exit(1)
}

let content = fs.readFileSync(abs, 'utf8')
if (content.charCodeAt(0) === 0xfeff) content = content.slice(1) // 去 BOM
content = content.trim()

if (!content) { console.error('文件是空的'); process.exit(1) }
if (/^\s*</.test(content)) {
  console.error('内容看起来是 HTML —— 多半是从浏览器里另存了页面而不是原始文件，请重新下载')
  process.exit(1)
}
console.log(`本地文件校验通过：${content.length} 字符`)

const runner = path.join(__dirname, 'ssh-run.cjs')
const tmp = path.join(__dirname, '.applepay-domain.tmp')
fs.writeFileSync(tmp, content, 'utf8')

function run(args) {
  return execFileSync(process.execPath, [runner, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

try {
  console.log('上传中...')
  console.log(run(['upload', tmp, '/var/www/lowflame/data/apple-developer-merchantid-domain-association']).trim().split('\n').pop())
  console.log('校验线上可访问性...')
  const out = run(['run', 'curl -s -o /tmp/ap.out -w "%{http_code} %{size_download}\\n" -L --max-redirs 0 https://lowflame.store/.well-known/apple-developer-merchantid-domain-association; echo "body_head:"; head -c 80 /tmp/ap.out; echo'])
  console.log(out.trim())
} finally {
  fs.unlinkSync(tmp)
}
