// End-to-end test of the app's /api/marketing/generate-video route:
// 1. creates a main-admin session token
// 2. verifies GET /api/settings shows video config
// 3. calls POST /api/marketing/generate-video with a local reference image
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const sessionsFile = path.join(root, 'data', 'admin-sessions.json')

function ensureToken() {
  const token = crypto.randomBytes(32).toString('hex')
  const now = Date.now()
  const session = {
    token,
    userId: 'main-admin',
    role: 'super_admin',
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
  }
  let all = []
  try {
    all = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8').replace(/^\uFEFF/, '').trim() || '[]')
  } catch {}
  all.push(session)
  fs.writeFileSync(sessionsFile, JSON.stringify(all, null, 2), 'utf-8')
  return token
}

const base = process.env.BASE_URL || 'http://localhost:3000'
const token = ensureToken()
const cookie = `admin_token=${token}`

async function getSettings() {
  const r = await fetch(`${base}/api/settings`, { headers: { Cookie: cookie } })
  const text = await r.text()
  console.log('GET /api/settings ->', r.status)
  if (!r.ok) {
    console.log(text.substring(0, 500))
    return null
  }
  const d = JSON.parse(text)
  console.log('  aiVideoEnabled =', d.aiVideoEnabled)
  console.log('  aiVideoProvider =', d.aiVideoProvider)
  console.log('  aiVideoModel =', d.aiVideoModel)
  console.log('  hasAiVideoApiKey =', d.hasAiVideoApiKey)
  console.log('  video providers =', Object.keys(d.aiVideoProviders || {}))
  return d
}

async function generateVideo(refUrl, prompt) {
  console.log('\nPOST /api/marketing/generate-video ...')
  const r = await fetch(`${base}/api/marketing/generate-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      referenceUrl: refUrl,
      prompt,
      model: 'doubao-seedance-1-0-pro-250528',
      provider: 'ark',
      duration: 5,
      ratio: '16:9',
      audio: false,
    }),
  })
  const text = await r.text()
  console.log('generate-video ->', r.status)
  console.log('response:', text.substring(0, 600))
  if (r.ok) {
    const d = JSON.parse(text)
    console.log('VIDEO:', d.video)
    return d.video
  }
  return null
}

const settings = await getSettings()
if (!settings) process.exit(1)

const video = await generateVideo(
  '/uploads/ai/img_1785959458421_843fa0d1.png',
  '镜头缓慢推进，产品在柔和灯光下自然展示，电影感运镜，画面稳定高清'
)
if (!video) process.exit(1)

const abs = path.join(root, 'public', video.replace(/^\//, ''))
console.log('saved at:', abs, fs.existsSync(abs) ? fs.statSync(abs).size + ' bytes' : 'MISSING')
