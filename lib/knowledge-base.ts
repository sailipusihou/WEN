// AI 知识库 · 持久化 + 检索
// 用于让 AI 学习店铺 FAQ、退换货政策、运营 SOP 等非数据类规则
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const KB_FILE = path.join(DATA_DIR, 'knowledge-base.json')

export interface KBEntry {
  id: string
  title: string
  category: string // 例如：FAQ / 政策 / SOP / 产品知识 / 营销话术
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(KB_FILE)) {
    fs.writeFileSync(KB_FILE, '[]', 'utf-8')
  }
}

export function getAllKBEntries(): KBEntry[] {
  ensureFile()
  const raw = fs.readFileSync(KB_FILE, 'utf-8').replace(/^\uFEFF/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function getKBEntryById(id: string): KBEntry | undefined {
  return getAllKBEntries().find(e => e.id === id)
}

export function addKBEntry(data: Omit<KBEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): KBEntry {
  const entries = getAllKBEntries()
  const now = new Date().toISOString()
  const entry: KBEntry = {
    id: data.id || `kb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: data.title,
    category: data.category || '未分类',
    content: data.content,
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: now,
    updatedAt: now,
  }
  entries.push(entry)
  fs.writeFileSync(KB_FILE, JSON.stringify(entries, null, 2), 'utf-8')
  return entry
}

export function updateKBEntry(id: string, updates: Partial<KBEntry>): KBEntry | null {
  const entries = getAllKBEntries()
  const idx = entries.findIndex(e => e.id === id)
  if (idx < 0) return null
  entries[idx] = {
    ...entries[idx],
    ...updates,
    id: entries[idx].id, // 不允许改 id
    createdAt: entries[idx].createdAt, // 不允许改 createdAt
    updatedAt: new Date().toISOString(),
  }
  fs.writeFileSync(KB_FILE, JSON.stringify(entries, null, 2), 'utf-8')
  return entries[idx]
}

export function deleteKBEntry(id: string): boolean {
  const entries = getAllKBEntries()
  const next = entries.filter(e => e.id !== id)
  if (next.length === entries.length) return false
  fs.writeFileSync(KB_FILE, JSON.stringify(next, null, 2), 'utf-8')
  return true
}

/**
 * 简单关键词检索（不依赖向量模型）：
 * - 把 query 切词，对 title / content / tags 做匹配计分
 * - 返回按相关度排序的结果
 */
export function searchKB(query: string, limit = 5): KBEntry[] {
  const entries = getAllKBEntries()
  if (!query.trim()) return entries.slice(0, limit)

  // 简单分词：英文按空格/标点切，中文按字切
  const tokens = new Set<string>()
  const cleaned = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
  for (const part of cleaned.split(/\s+/)) {
    if (!part) continue
    if (/^[a-z]+$/.test(part)) {
      tokens.add(part)
    } else {
      // 中文按 2-gram
      for (let i = 0; i < part.length - 1; i++) {
        tokens.add(part.slice(i, i + 2))
      }
      tokens.add(part)
    }
  }

  const scored = entries.map(e => {
    const haystack = `${e.title} ${e.content} ${(e.tags || []).join(' ')}`.toLowerCase()
    let score = 0
    for (const tok of tokens) {
      if (!tok) continue
      if (e.title.toLowerCase().includes(tok)) score += 3
      if ((e.tags || []).some(t => t.toLowerCase().includes(tok))) score += 2
      if (haystack.includes(tok)) score += 1
    }
    return { entry: e, score }
  })

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry)
}
