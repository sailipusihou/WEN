// Wire up AI video generation settings (Ark Seedance) in the SQLite store.
// Keeps any existing video config; only fills missing/known fields.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import BetterSqlite3 from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data', 'site.db')
const db = new BetterSqlite3(dbPath)

const row = db.prepare("SELECT value FROM settings WHERE key='site_settings'").get()
if (!row) {
  console.error('site_settings row not found')
  process.exit(1)
}
const s = JSON.parse(row.value)

const arkKey = s.aiVideoApiKey || s.aiVideoProviders?.ark?.apiKey || s.aiImageRefApiKey || s.aiImageProviders?.ark?.apiKey
if (!arkKey) {
  console.error('no ark api key available')
  process.exit(1)
}

const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_MODELS = [
  { id: 'doubao-seedance-1-0-pro-250528', label: 'Seedance 1.0 Pro（图生视频，当前已开通）' },
  { id: 'doubao-seedance-2-0-260128', label: 'Seedance 2.0（旗舰，图生视频/原生音频，需开通）' },
  { id: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast（快速，需开通）' },
  { id: 'doubao-seedance-1-5-pro-251215', label: 'Seedance 1.5 Pro（图生视频，需开通）' },
  { id: 'doubao-seedance-1-0-lite-i2v-250428', label: 'Seedance 1.0 Lite i2v（需开通）' },
]
const MINIMAX_BASE_URL = 'https://api.minimaxi.com'
const MINIMAX_MODELS = [
  { id: 'MiniMax-H3', label: 'MiniMax H3（旗舰，图生/文生/多模态参考，原生音频）' },
  { id: 'video-01', label: 'Video-01（旧版图生视频）' },
  { id: 'video-01-live', label: 'Video-01 Live' },
]

s.aiVideoEnabled = s.aiVideoEnabled ?? true
s.aiVideoProvider = 'ark'
s.aiVideoApiKey = s.aiVideoApiKey || arkKey
s.aiVideoModel = s.aiVideoModel || 'doubao-seedance-1-0-pro-250528'
s.aiVideoBaseUrl = s.aiVideoBaseUrl || ARK_BASE_URL
s.aiVideoProviders = {
  ...(s.aiVideoProviders || {}),
  ark: {
    apiKey: s.aiVideoProviders?.ark?.apiKey || arkKey,
    baseUrl: s.aiVideoProviders?.ark?.baseUrl || ARK_BASE_URL,
    models: s.aiVideoProviders?.ark?.models?.length ? s.aiVideoProviders.ark.models : ARK_MODELS,
  },
  minimax: {
    apiKey: s.aiVideoProviders?.minimax?.apiKey || '',
    baseUrl: MINIMAX_BASE_URL,
    models: MINIMAX_MODELS,
  },
}

const update = db.prepare("UPDATE settings SET value = ?, updatedAt = ? WHERE key = 'site_settings'")
for (let i = 0; i < 5; i++) {
  try {
    update.run(JSON.stringify(s), new Date().toISOString())
    break
  } catch (e) {
    if (i === 4) throw e
    console.log('db locked, retry', i + 1)
    db.exec('PRAGMA busy_timeout = 3000')
    // wait a bit
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800)
  }
}

console.log('video settings written:')
console.log('  aiVideoEnabled =', s.aiVideoEnabled)
console.log('  aiVideoProvider =', s.aiVideoProvider)
console.log('  aiVideoModel =', s.aiVideoModel)
console.log('  aiVideoApiKey =', (s.aiVideoApiKey || '').slice(0, 12) + '...')
console.log('  ark models =', s.aiVideoProviders.ark.models.length)
