import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const OAUTH_DIR = path.join(DATA_DIR, 'social-oauth')
const TTL = 10 * 60 * 1000

export interface PendingSocialOAuth {
  platform: string
  staffId: string
  staffName: string
  staffAvatar?: string
  createdAt: number
  state: string
  codeVerifier?: string
  extraData?: Record<string, any>
}

function ensureDir(): void {
  if (!fs.existsSync(OAUTH_DIR)) {
    fs.mkdirSync(OAUTH_DIR, { recursive: true })
  }
}

function getPlatformFile(platform: string): string {
  return path.join(OAUTH_DIR, `${platform}-pending.json`)
}

function readPlatform(platform: string): Record<string, PendingSocialOAuth> {
  ensureDir()
  const file = getPlatformFile(platform)
  if (!fs.existsSync(file)) return {}
  try {
    const raw = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function writePlatform(platform: string, data: Record<string, PendingSocialOAuth>): void {
  ensureDir()
  const file = getPlatformFile(platform)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

export function savePendingSocialOAuth(
  platform: string,
  oauthToken: string,
  data: Omit<PendingSocialOAuth, 'createdAt'>
): void {
  const all = readPlatform(platform)
  all[oauthToken] = { ...data, createdAt: Date.now() }
  writePlatform(platform, all)
}

export function getPendingSocialOAuth(platform: string, oauthToken: string): PendingSocialOAuth | null {
  const all = readPlatform(platform)
  const data = all[oauthToken]
  if (!data) return null
  if (Date.now() - data.createdAt > TTL) {
    delete all[oauthToken]
    writePlatform(platform, all)
    return null
  }
  return data
}

export function removePendingSocialOAuth(platform: string, oauthToken: string): void {
  const all = readPlatform(platform)
  delete all[oauthToken]
  writePlatform(platform, all)
}

export function generateOAuthState(): string {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}

export function generateCodeVerifier(): string {
  const buffer = Buffer.alloc(32)
  for (let i = 0; i < 32; i++) {
    buffer[i] = Math.floor(Math.random() * 256)
  }
  return buffer.toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return hash.toString('base64url')
}
