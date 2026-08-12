import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import {
  getAllPromotions,
  getActivePromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  type Promotion,
} from '@/lib/promotions'

export async function GET(req: NextRequest) {
  try {
    const activeOnly = req.nextUrl.searchParams.get('active') === '1'
    if (activeOnly) {
      return NextResponse.json(getActivePromotions())
    }
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error
    return NextResponse.json(getAllPromotions())
  } catch {
    return NextResponse.json([])
  }
}

function validatePromotion(body: any): string | null {
  if (!body.name || typeof body.name !== 'string' || body.name.length > 100) return 'Name is required'
  if (!['all', 'category', 'product'].includes(body.scope)) return 'Invalid scope'
  if ((body.scope === 'category' || body.scope === 'product') && !body.targetId) return 'Target is required'
  if (!['percent', 'fixed'].includes(body.discountType)) return 'Invalid discount type'
  const value = Number(body.value)
  if (Number.isNaN(value) || value <= 0) return 'Discount value must be positive'
  if (body.discountType === 'percent' && value > 99) return 'Percent discount cannot exceed 99'
  return null
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  try {
    const body = await req.json()
    const err = validatePromotion(body)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
    const promo = createPromotion({
      name: String(body.name).trim(),
      scope: body.scope,
      targetId: body.targetId || undefined,
      discountType: body.discountType,
      value: Number(body.value),
      startAt: body.startAt || undefined,
      endAt: body.endAt || undefined,
      active: body.active !== false,
    })
    return NextResponse.json(promo, { status: 201 })
  } catch (e) {
    console.error('[Promotions POST]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  try {
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const updates: Partial<Promotion> = {}
    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.scope !== undefined) updates.scope = body.scope
    if (body.targetId !== undefined) updates.targetId = body.targetId || undefined
    if (body.discountType !== undefined) updates.discountType = body.discountType
    if (body.value !== undefined) updates.value = Number(body.value)
    if (body.startAt !== undefined) updates.startAt = body.startAt || undefined
    if (body.endAt !== undefined) updates.endAt = body.endAt || undefined
    if (body.active !== undefined) updates.active = Boolean(body.active)
    const updated = updatePromotion(body.id, updates)
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
  if (!deletePromotion(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
