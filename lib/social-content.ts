import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const SOCIAL_CONTENT_FILE = path.join(DATA_DIR, 'social-content.json')

export type SocialContentStatus =
  | 'draft'
  | 'published'
  | 'manual_action_required'
  | 'failed'

export type SocialPublishMode = 'api' | 'share_window' | 'manual'

export interface SocialContentRecord {
  id: string
  accountId: string
  staffId: string
  staffName: string
  staffAvatar?: string
  platform: string
  platformName: string
  platformUsername?: string
  status: SocialContentStatus
  publishMode: SocialPublishMode
  contentTitle: string
  contentBody: string
  hashtags?: string
  contentType?: string
  tone?: string
  mediaUrl?: string
  mediaType?: string
  productId?: string
  productName?: string
  referralLinkId?: string
  referralCode?: string
  referralUrl?: string
  platformPostId?: string
  platformPostUrl?: string
  note?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(SOCIAL_CONTENT_FILE)) {
    fs.writeFileSync(SOCIAL_CONTENT_FILE, '[]', 'utf-8')
  }
}

export function getAllSocialContent(): SocialContentRecord[] {
  ensureFile()
  const raw = fs.readFileSync(SOCIAL_CONTENT_FILE, 'utf-8').replace(/^\uFEFF/, '')
  try {
    const records = JSON.parse(raw)
    return Array.isArray(records)
      ? records.sort(
          (a: SocialContentRecord, b: SocialContentRecord) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      : []
  } catch {
    return []
  }
}

export function getSocialContentById(id: string): SocialContentRecord | undefined {
  return getAllSocialContent().find((record) => record.id === id)
}

export function getSocialContentByAccountId(accountId: string): SocialContentRecord[] {
  return getAllSocialContent().filter((record) => record.accountId === accountId)
}

export function createSocialContentRecord(
  data: Omit<SocialContentRecord, 'id' | 'createdAt' | 'updatedAt'>
): SocialContentRecord {
  ensureFile()
  const records = getAllSocialContent()
  const now = new Date().toISOString()
  const record: SocialContentRecord = {
    id: `soc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    ...data,
  }
  records.unshift(record)
  fs.writeFileSync(SOCIAL_CONTENT_FILE, JSON.stringify(records, null, 2), 'utf-8')
  return record
}

export function updateSocialContentRecord(
  id: string,
  updates: Partial<SocialContentRecord>
): SocialContentRecord | null {
  ensureFile()
  const records = getAllSocialContent()
  const index = records.findIndex((record) => record.id === id)
  if (index < 0) return null

  records[index] = {
    ...records[index],
    ...updates,
    id: records[index].id,
    createdAt: records[index].createdAt,
    updatedAt: new Date().toISOString(),
  }

  fs.writeFileSync(SOCIAL_CONTENT_FILE, JSON.stringify(records, null, 2), 'utf-8')
  return records[index]
}

export function getSocialContentStats() {
  const records = getAllSocialContent()
  const published = records.filter((record) => record.status === 'published').length
  const manual = records.filter((record) => record.status === 'manual_action_required').length
  const failed = records.filter((record) => record.status === 'failed').length

  const byPlatform: Record<string, number> = {}
  records.forEach((record) => {
    byPlatform[record.platform] = (byPlatform[record.platform] || 0) + 1
  })

  return {
    total: records.length,
    published,
    manualActionRequired: manual,
    failed,
    byPlatform,
  }
}
