// 优惠券生图历史 — 每次生成的图片记录, 可挑选加入模板库
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const HISTORY_FILE = path.join(DATA_DIR, 'coupon-image-history.json')

export interface CouponImageHistory {
  id: string
  url: string
  size?: string
  mode?: string
  createdAt: string
}

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, '[]', 'utf-8')
}

function readHistory(): CouponImageHistory[] {
  ensureFile()
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8').replace(/^\uFEFF/, '').trim()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeHistory(list: CouponImageHistory[]): void {
  ensureFile()
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

export function getAllCouponImageHistory(): CouponImageHistory[] {
  return readHistory()
}

export function addCouponImageHistory(data: { url: string; size?: string; mode?: string }): CouponImageHistory {
  const list = readHistory()
  const entry: CouponImageHistory = {
    id: 'HIS-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    url: data.url,
    size: data.size,
    mode: data.mode,
    createdAt: new Date().toISOString(),
  }
  list.unshift(entry)
  writeHistory(list.slice(0, 100)) // 最多保留 100 条
  return entry
}

export function deleteCouponImageHistory(id: string): boolean {
  const list = readHistory()
  const next = list.filter(t => t.id !== id)
  if (next.length === list.length) return false
  writeHistory(next)
  return true
}
