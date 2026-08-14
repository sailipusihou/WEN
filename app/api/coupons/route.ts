import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, rateLimit, getClientIp } from '@/lib/auth'
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponByCode,
  validateCouponForSubtotal,
  type Coupon,
} from '@/lib/promotions'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error
    return NextResponse.json(getAllCoupons())
  } catch {
    return NextResponse.json([])
  }
}

function validateCoupon(body: any): string | null {
  if (!body.code || typeof body.code !== 'string' || body.code.length > 30) return 'Code is required'
  if (!body.name || typeof body.name !== 'string' || body.name.length > 100) return 'Name is required'
  if (!['welcome', 'manual'].includes(body.kind)) return 'Invalid kind'
  if (!['percent', 'fixed'].includes(body.discountType)) return 'Invalid discount type'
  const value = Number(body.value)
  if (Number.isNaN(value) || value <= 0) return 'Discount value must be positive'
  if (body.discountType === 'percent' && value > 100) return 'Percent cannot exceed 100'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Public: validate / apply a coupon against a subtotal
    if (body.action === 'apply') {
      const ip = getClientIp(req)
      if (!rateLimit('coupon_apply:' + ip, 30, 60 * 1000)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
      const code = String(body.code || '').trim()
      const subtotal = Number(body.subtotal) || 0
      const coupon = getCouponByCode(code)
      if (!coupon) return NextResponse.json({ ok: false, error: 'Invalid coupon code' }, { status: 200 })
      const result = validateCouponForSubtotal(coupon, subtotal)
      return NextResponse.json({ ok: result.ok, discount: result.discount, error: result.error, coupon: { code: coupon.code, name: coupon.name } })
    }

    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error
    const err = validateCoupon(body)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
    const coupon = createCoupon({
      code: String(body.code),
      name: String(body.name).trim(),
      kind: body.kind,
      discountType: body.discountType,
      value: Number(body.value),
      minSpend: Number(body.minSpend) || 0,
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : undefined,
      // 修复 H2: 支持设置全局使用上限 (不设则无限)
      maxUsage: body.maxUsage !== undefined && body.maxUsage !== '' ? Math.max(1, Math.floor(Number(body.maxUsage))) : undefined,
      validDays: Math.max(1, Number(body.validDays) || 30),
      active: body.active !== false,
    })
    return NextResponse.json(coupon, { status: 201 })
  } catch (e) {
    console.error('[Coupons POST]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  try {
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const updates: Partial<Coupon> = {}
    if (body.code !== undefined) updates.code = String(body.code).trim().toUpperCase()
    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.kind !== undefined) updates.kind = body.kind
    if (body.discountType !== undefined) updates.discountType = body.discountType
    if (body.value !== undefined) updates.value = Number(body.value)
    if (body.minSpend !== undefined) updates.minSpend = Number(body.minSpend) || 0
    if (body.maxDiscount !== undefined) updates.maxDiscount = body.maxDiscount ? Number(body.maxDiscount) : undefined
    if (body.validDays !== undefined) updates.validDays = Math.max(1, Number(body.validDays) || 30)
    if (body.maxUsage !== undefined) updates.maxUsage = body.maxUsage === '' || body.maxUsage === null ? undefined : Math.max(1, Math.floor(Number(body.maxUsage)))
    if (body.active !== undefined) updates.active = Boolean(body.active)
    const updated = updateCoupon(body.id, updates)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (!deleteCoupon(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
