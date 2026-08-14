import fs from 'fs'
import path from 'path'
import {
  type Promotion,
  type Coupon,
  type UserCoupon,
  computePromotionForProduct,
  validateCouponForSubtotal,
} from '@/lib/promotion-shared'

export type { Promotion, Coupon, UserCoupon, PromotionScope, DiscountType, PriceInput } from '@/lib/promotion-shared'
export { computePromotionForProduct, validateCouponForSubtotal }

const DATA_DIR = path.join(process.cwd(), 'data')
const PROMOTIONS_FILE = path.join(DATA_DIR, 'promotions.json')
const COUPONS_FILE = path.join(DATA_DIR, 'coupons.json')

function ensureFile(file: string): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf-8')
}

function readArray(file: string): any[] {
  ensureFile(file)
  try {
    const raw = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '')
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeArray(file: string, arr: any[]): void {
  ensureFile(file)
  fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf-8')
}

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase()
}

// ================= Promotions =================

export function getAllPromotions(): Promotion[] {
  return readArray(PROMOTIONS_FILE)
}

export function getActivePromotions(now = Date.now()): Promotion[] {
  return getAllPromotions().filter(p =>
    p.active &&
    (!p.startAt || new Date(p.startAt).getTime() <= now) &&
    (!p.endAt || new Date(p.endAt).getTime() >= now)
  )
}

export function createPromotion(data: Omit<Promotion, 'id' | 'createdAt'>): Promotion {
  const all = getAllPromotions()
  const promo: Promotion = { ...data, id: makeId('PROMO'), createdAt: new Date().toISOString() }
  all.push(promo)
  writeArray(PROMOTIONS_FILE, all)
  return promo
}

export function updatePromotion(id: string, updates: Partial<Promotion>): Promotion | null {
  const all = getAllPromotions()
  const idx = all.findIndex(p => p.id === id)
  if (idx < 0) return null
  all[idx] = { ...all[idx], ...updates }
  writeArray(PROMOTIONS_FILE, all)
  return all[idx]
}

export function deletePromotion(id: string): boolean {
  const all = getAllPromotions()
  const next = all.filter(p => p.id !== id)
  if (next.length === all.length) return false
  writeArray(PROMOTIONS_FILE, next)
  return true
}

// ================= Coupons =================

export function getAllCoupons(): Coupon[] {
  return readArray(COUPONS_FILE)
}

export function getCouponByCode(code: string): Coupon | undefined {
  return getAllCoupons().find(c => c.code.toLowerCase() === code.trim().toLowerCase())
}

export function createCoupon(data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>): Coupon {
  const all = getAllCoupons()
  const coupon: Coupon = { ...data, code: data.code.trim().toUpperCase(), id: makeId('CPN'), usedCount: 0, createdAt: new Date().toISOString() }
  all.push(coupon)
  writeArray(COUPONS_FILE, all)
  return coupon
}

export function updateCoupon(id: string, updates: Partial<Coupon>): Coupon | null {
  const all = getAllCoupons()
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0) return null
  all[idx] = { ...all[idx], ...updates }
  writeArray(COUPONS_FILE, all)
  return all[idx]
}

export function deleteCoupon(id: string): boolean {
  const all = getAllCoupons()
  const next = all.filter(c => c.id !== id)
  if (next.length === all.length) return false
  writeArray(COUPONS_FILE, next)
  return true
}

export function incrementCouponUsed(code: string): void {
  const c = getCouponByCode(code)
  // 修复 H2: 不超过全局上限
  if (c && (c.maxUsage === undefined || c.usedCount < c.maxUsage)) {
    updateCoupon(c.id, { usedCount: c.usedCount + 1 })
  }
}
