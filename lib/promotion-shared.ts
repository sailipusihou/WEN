// Client-safe promotion types & pure pricing logic (no Node.js imports).

export type PromotionScope = 'all' | 'category' | 'product'
export type DiscountType = 'percent' | 'fixed'

export interface Promotion {
  id: string
  name: string
  scope: PromotionScope
  targetId?: string
  discountType: DiscountType
  value: number
  startAt?: string
  endAt?: string
  active: boolean
  createdAt: string
}

export interface Coupon {
  id: string
  code: string
  name: string
  kind: 'welcome' | 'manual'
  discountType: DiscountType
  value: number
  minSpend: number
  maxDiscount?: number
  validDays: number
  active: boolean
  usedCount: number
  createdAt: string
}

export interface UserCoupon {
  code: string
  name: string
  discountType: DiscountType
  value: number
  minSpend: number
  maxDiscount?: number
  issuedAt: string
  expiresAt: string
  used: boolean
}

export interface PriceInput {
  id: string
  category: string
  price: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function discountOf(p: Promotion, price: number): number {
  return p.discountType === 'percent' ? (price * p.value) / 100 : p.value
}

export function computePromotionForProduct(
  product: PriceInput,
  promotions: Promotion[],
  now = Date.now()
): { price: number; originalPrice?: number; discount: number; promoName?: string } {
  const applicable = promotions.filter(p =>
    p.active &&
    (!p.startAt || new Date(p.startAt).getTime() <= now) &&
    (!p.endAt || new Date(p.endAt).getTime() >= now) &&
    (p.scope === 'all' || (p.scope === 'product' && p.targetId === product.id) || (p.scope === 'category' && p.targetId === product.category))
  )
  if (applicable.length === 0) {
    return { price: product.price, discount: 0 }
  }
  const rank = (p: Promotion) => (p.scope === 'product' ? 0 : p.scope === 'category' ? 1 : 2)
  const best = applicable.sort((a, b) => rank(a) - rank(b) || discountOf(b, product.price) - discountOf(a, product.price))[0]
  const discount = discountOf(best, product.price)
  const newPrice = Math.max(0, product.price - discount)
  return { price: round2(newPrice), originalPrice: product.price, discount: round2(discount), promoName: best.name }
}

export function validateCouponForSubtotal(
  coupon: Coupon,
  subtotal: number
): { ok: boolean; discount: number; error?: string } {
  if (!coupon.active) return { ok: false, discount: 0, error: 'Coupon is not active' }
  if (subtotal < coupon.minSpend) {
    return { ok: false, discount: 0, error: `Minimum spend is $${coupon.minSpend.toFixed(2)}` }
  }
  let discount = coupon.discountType === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
  discount = Math.min(discount, subtotal)
  return { ok: true, discount: round2(discount) }
}
