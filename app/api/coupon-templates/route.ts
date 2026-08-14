// 优惠券图片模板 API — 后台管理 (与 coupons 同权限)
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import {
  getAllCouponTemplates,
  addCouponTemplate,
  deleteCouponTemplate,
} from '@/lib/coupon-templates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  return NextResponse.json({ templates: getAllCouponTemplates() })
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  try {
    const body = await req.json()
    const imageUrl = String(body.imageUrl || '').trim()
    if (!imageUrl || imageUrl.length > 500) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
    }
    const name = body.name ? String(body.name).slice(0, 100) : ''
    const template = addCouponTemplate({ name, imageUrl })
    return NextResponse.json({ success: true, template }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (!deleteCouponTemplate(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
