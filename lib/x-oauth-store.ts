import fs from 'fs'
import path from 'path'

interface PendingOAuth {
  oauthTokenSecret?: string
  codeVerifier?: string
  state?: string
  authType: 'oauth1' | 'oauth2'
  staffId: string
  staffName: string
  staffAvatar?: string
  createdAt: number
}

const DATA_DIR = path.join(process.cwd(), 'data')
const PENDING_FILE = path.join(DATA_DIR, 'x-pending-oauth.json')
const TTL = 10 * 60 * 1000

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(PENDING_FILE)) {
    fs.writeFileSync(PENDING_FILE, '{}', 'utf-8')
  }
}

function readAll(): Record<string, PendingOAuth> {
  ensureFile()
  try {
    const raw = fs.readFileSync(PENDING_FILE, 'utf-8').replace(/^\uFEFF/, '')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, PendingOAuth>): void {
  ensureFile()
  fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export function savePendingXAuth(
  oauthToken: string,
  data: Omit<PendingOAuth, 'createdAt'>
): void {
  const all = readAll()
  all[oauthToken] = { ...data, createdAt: Date.now() }
  writeAll(all)
}

export function getPendingXAuth(oauthToken: string): PendingOAuth | null {
  const all = readAll()
  const data = all[oauthToken]
  if (!data) return null
  if (Date.now() - data.createdAt > TTL) {
    delete all[oauthToken]
    writeAll(all)
    return null
  }
  return data
}

export function removePendingXAuth(oauthToken: string): void {
  const all = readAll()
  if (all[oauthToken]) {
    delete all[oauthToken]
    writeAll(all)
  }
}
