// 优惠券图片模板库 — 后台确认过的券图可保存为模板, 后续券直接复用
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const TEMPLATES_FILE = path.join(DATA_DIR, 'coupon-templates.json')

export interface CouponTemplate {
  id: string
  name: string
  imageUrl: string
  createdAt: string
}

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(TEMPLATES_FILE)) fs.writeFileSync(TEMPLATES_FILE, '[]', 'utf-8')
}

function readTemplates(): CouponTemplate[] {
  ensureFile()
  try {
    const raw = fs.readFileSync(TEMPLATES_FILE, 'utf-8').replace(/^\uFEFF/, '').trim()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeTemplates(list: CouponTemplate[]): void {
  ensureFile()
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

export function getAllCouponTemplates(): CouponTemplate[] {
  return readTemplates()
}

export function addCouponTemplate(data: { name?: string; imageUrl: string }): CouponTemplate {
  const list = readTemplates()
  const template: CouponTemplate = {
    id: 'TPL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    name: (data.name || '').trim() || 'Coupon Template ' + (list.length + 1),
    imageUrl: data.imageUrl,
    createdAt: new Date().toISOString(),
  }
  list.unshift(template)
  writeTemplates(list)
  return template
}

export function deleteCouponTemplate(id: string): boolean {
  const list = readTemplates()
  const next = list.filter(t => t.id !== id)
  if (next.length === list.length) return false
  writeTemplates(next)
  return true
}
