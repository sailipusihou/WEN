// 生成新的 admin 会话 token（模仿 lib/auth.ts createAdminSession）
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')

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
