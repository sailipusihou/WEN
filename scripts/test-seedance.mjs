// Standalone test for Ark (Volcengine) Seedance image-to-video API
// Usage: node scripts/test-seedance.mjs <imagePath> [model] [prompt] [duration] [ratio] [--create-only]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import BetterSqlite3 from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')

// ---- read ark api key from sqlite settings ----
const db = new BetterSqlite3(path.join(projectRoot, 'data', 'site.db'), { readonly: true })
const row = db.prepare("SELECT value FROM settings WHERE key='site_settings'").get()
const settings = JSON.parse(row.value)
const apiKey =
  settings.aiVideoApiKey ||
  settings.aiVideoProviders?.ark?.apiKey ||
  settings.aiImageRefApiKey ||
  settings.aiImageProviders?.ark?.apiKey ||
  ''

if (!apiKey) {
  console.error('No ark api key found in settings')
  process.exit(1)
}
console.log('using ark key:', apiKey.slice(0, 14) + '...')

const imagePath = process.argv[2]
if (!imagePath) {
  console.error('Usage: node scripts/test-seedance.mjs <imagePath> [model]')
  process.exit(1)
}
const absImage = path.isAbsolute(imagePath) ? imagePath : path.join(projectRoot, imagePath)
const buf = fs.readFileSync(absImage)
const ext = path.extname(absImage).toLowerCase().replace('.', '')
const detected =
  buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff ? 'jpeg'
  : buf.length > 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG' ? 'png'
  : buf.length > 11 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP' ? 'webp'
  : buf.length > 5 && buf.toString('ascii', 0, 4) === 'GIF8' ? 'gif'
  : ''
const mime = detected || (ext === 'jpg' ? 'jpeg' : ext === 'jpeg' || ext === 'png' || ext === 'webp' ? ext : 'png')
const dataUrl = `data:image/${mime};base64,${buf.toString('base64')}`
console.log('image:', absImage, buf.length, 'bytes')

const model = process.argv[3] || settings.aiVideoModel || 'doubao-seedance-2-0-260128'
const prompt = process.argv[4] || '镜头缓慢推进，产品在柔和灯光下自然展示，电影感运镜，画面稳定高清'
const duration = Number(process.argv[5]) || 5
const ratio = process.argv[6] || '16:9'
const createOnly = process.argv.includes('--create-only')
const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3'

const isLegacy = /seedance-1[.-]/.test(model)
const content = [
  { type: 'text', text: prompt },
  { type: 'image_url', image_url: { url: dataUrl }, ...(isLegacy ? { role: 'first_frame' } : {}) },
]
const payload = {
  model,
  content,
  resolution: '720p',
  ratio,
  duration,
  watermark: false,
}
console.log('payload:', JSON.stringify({ ...payload, content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl.slice(0, 40) + '...' } }] }, null, 2))

async function main() {
  // create task
  const createRes = await fetch(`${baseUrl}/contents/generations/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  })
  const createText = await createRes.text()
  console.log('create status:', createRes.status)
  console.log('create response:', createText.substring(0, 1000))
  if (!createRes.ok) process.exit(1)
  if (createOnly) {
    console.log('CREATE OK (task accepted)')
    process.exit(0)
  }
  const createData = JSON.parse(createText)
  const taskId = createData?.id
  if (!taskId) {
    console.error('no task id returned')
    process.exit(1)
  }
  console.log('task id:', taskId)

  // poll
  const deadline = Date.now() + 240000
  let lastStatus = ''
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 8000))
    const qRes = await fetch(`${baseUrl}/contents/generations/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const qText = await qRes.text()
    if (!qRes.ok) {
      console.error('query failed:', qRes.status, qText.substring(0, 500))
      process.exit(1)
    }
    const d = JSON.parse(qText)
    lastStatus = d?.status || ''
    console.log('poll status:', lastStatus, new Date().toISOString())
    if (lastStatus === 'succeeded') {
      const videoUrl = d?.content?.video_url || d?.content?.videoUrl || ''
      console.log('VIDEO URL:', videoUrl)
      if (!videoUrl) process.exit(1)
      const vRes = await fetch(videoUrl)
      if (!vRes.ok) {
        console.error('video download failed:', vRes.status)
        process.exit(1)
      }
      const vBuf = Buffer.from(await vRes.arrayBuffer())
      const out = path.join(projectRoot, 'public', 'uploads', 'ai', `video_${Date.now()}.mp4`)
      fs.writeFileSync(out, vBuf)
      console.log('SAVED:', out, vBuf.length, 'bytes')
      process.exit(0)
    }
    if (['failed', 'expired', 'cancelled'].includes(lastStatus)) {
      console.error('task failed:', JSON.stringify(d).substring(0, 1000))
      process.exit(1)
    }
  }
  console.error('timeout, last status:', lastStatus)
  process.exit(1)
}

main().catch(e => {
  console.error('error:', e)
  process.exit(1)
})
