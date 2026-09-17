// 生成新的 admin 会话 token（模仿 lib/auth.ts createAdminSession）
//
// ⚠️ 这个脚本**不经过任何认证**就能铸造一个 super_admin 会话并打印可用 token ——
//    谁能在这个目录跑 node，谁就能直接拿到后台权限。设计上只给本地冒烟测试用。
//    因此加一道门槛：必须显式设置 ALLOW_SESSION_MINT=1 才执行，避免被顺手误用。
//    （真正的防线是 data/ 目录权限 —— 已收紧为 700，非 root 读不到也写不了）
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')

if (process.env.ALLOW_SESSION_MINT !== '1') {
  console.error('❌ 拒绝执行：本脚本无认证即可铸造管理员会话，仅限本地测试用途。')
  console.error('   确认要执行请设置 ALLOW_SESSION_MINT=1')
  process.exit(1)
}

const FILE = path.join(__dirname, '..', 'data', 'admin-sessions.json')
const token = crypto.randomBytes(32).toString('hex')
const now = Date.now()
const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const session = {
  userId: 'main-admin',
  role: 'super_admin',
  createdAt: now,
  expiresAt: now + SESSION_TTL_MS,
  tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
}

let all = []
try {
  all = JSON.parse(fs.readFileSync(FILE, 'utf8').replace(/^\uFEFF/, ''))
} catch {}
all = all.filter(s => s.expiresAt > now)
all.push(session)
if (all.length > 10) all = all.slice(-10)
fs.writeFileSync(FILE, JSON.stringify(all, null, 2), 'utf-8')
console.log('NEW_TOKEN=' + token)
