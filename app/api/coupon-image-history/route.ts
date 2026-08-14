// 优惠券生图历史 API — 后台管理 (与 coupons 同权限)
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import {
  getAllCouponImageHistory,
  addCouponImageHistory,
  deleteCouponImageHistory,
} from '@/lib/coupon-image-history'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  return NextResponse.json({ history: getAllCouponImageHistory() })
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  try {
    const body = await req.json()
    const url = String(body.url || '').trim()
    if (!url || url.length > 500) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }
    const entry = addCouponImageHistory({
      url,
      size: body.size ? String(body.size).slice(0, 20) : undefined,
      mode: body.mode ? String(body.mode).slice(0, 20) : undefined,
    })
    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (!deleteCouponImageHistory(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
