// 营销内容管理 · 持久化
// 用于存储 AI 生成的营销文案、推广内容、模板等
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const MARKETING_FILE = path.join(DATA_DIR, 'marketing-content.json')

export interface MarketingContent {
  id: string
  title: string
  type: 'social_post' | 'product_desc' | 'ad_copy' | 'email_campaign' | 'template'
  platform: string // instagram / facebook / twitter / pinterest / tiktok / email / general
  productId?: string
  productName?: string
  content: string
  hashtags?: string[]
  mediaUrls?: string[]
  imagePrompt?: string
  tone: string // professional / casual / playful / luxury / minimal
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
}

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(MARKETING_FILE)) {
    fs.writeFileSync(MARKETING_FILE, '[]', 'utf-8')
  }
}

export function getAllMarketingContent(): MarketingContent[] {
  ensureFile()
  const raw = fs.readFileSync(MARKETING_FILE, 'utf-8').replace(/^\uFEFF/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.sort((a: MarketingContent, b: MarketingContent) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) : []
  } catch {
    return []
  }
}

export function getMarketingContentById(id: string): MarketingContent | undefined {
  return getAllMarketingContent().find(e => e.id === id)
}

export function addMarketingContent(data: Omit<MarketingContent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MarketingContent {
  const entries = getAllMarketingContent()
  const now = new Date().toISOString()
  const entry: MarketingContent = {
    id: data.id || `mc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: data.title,
    type: data.type || 'social_post',
    platform: data.platform || 'general',
    productId: data.productId,
    productName: data.productName,
    content: data.content,
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
    mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls : [],
    imagePrompt: data.imagePrompt || '',
    tone: data.tone || 'professional',
    status: data.status || 'draft',
    createdAt: now,
    updatedAt: now,
  }
  entries.unshift(entry)
  fs.writeFileSync(MARKETING_FILE, JSON.stringify(entries, null, 2), 'utf-8')
  return entry
}

export function updateMarketingContent(id: string, updates: Partial<MarketingContent>): MarketingContent | null {
  const entries = getAllMarketingContent()
  const idx = entries.findIndex(e => e.id === id)
  if (idx < 0) return null
  entries[idx] = {
    ...entries[idx],
    ...updates,
    id: entries[idx].id,
    createdAt: entries[idx].createdAt,
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(MARKETING_FILE, JSON.stringify(entries, null, 2), 'utf-8')
  return entries[idx]
}

export function deleteMarketingContent(id: string): boolean {
  const entries = getAllMarketingContent()
  const next = entries.filter(e => e.id !== id)
  if (next.length === entries.length) return false
  fs.writeFileSync(MARKETING_FILE, JSON.stringify(next, null, 2), 'utf-8')
  return true
}

export function searchMarketingContent(query: string, limit: number = 20): MarketingContent[] {
  const all = getAllMarketingContent()
  const q = query.toLowerCase()
  return all.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.content.toLowerCase().includes(q) ||
    (e.productName && e.productName.toLowerCase().includes(q)) ||
    (e.hashtags && e.hashtags.some(h => h.toLowerCase().includes(q)))
  ).slice(0, limit)
}

// 预设模板
export const MARKETING_TEMPLATES = [
  {
    id: 'new_product_launch',
    name: '新品发布',
    description: '适用于新产品上市推广',
    type: 'social_post' as const,
    platforms: ['instagram', 'facebook', 'twitter'],
  },
  {
    id: 'flash_sale',
    name: '限时促销',
    description: '营造紧迫感的促销文案',
    type: 'ad_copy' as const,
    platforms: ['instagram', 'facebook', 'email'],
  },
  {
    id: 'product_story',
    name: '产品故事',
    description: '讲述产品背后的故事，提升品牌价值',
    type: 'social_post' as const,
    platforms: ['instagram', 'facebook', 'pinterest'],
  },
  {
    id: 'customer_testimonial',
    name: '客户好评',
    description: '利用客户评价增加信任感',
    type: 'social_post' as const,
    platforms: ['instagram', 'facebook', 'twitter'],
  },
  {
    id: 'holiday_promotion',
    name: '节日营销',
    description: '节日主题促销文案',
    type: 'ad_copy' as const,
    platforms: ['instagram', 'facebook', 'email'],
  },
  {
    id: 'behind_scenes',
    name: '幕后花絮',
    description: '展示品牌真实一面，增加亲和力',
    type: 'social_post' as const,
    platforms: ['instagram', 'tiktok', 'facebook'],
  },
]
