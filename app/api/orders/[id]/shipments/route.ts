// 客户端物流查询 API — 按订单 ID 查询发货记录和物流轨迹
// 此接口为公开接口 (客户端用户需查看自己订单的物流信息)
// 通过订单 ID + 用户邮箱校验访问权限; 管理员需持有效会话
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { buildTrackingUrl } from '@/lib/shipping'
import { validateAdminToken } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const repo = getRepository()
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')?.trim().toLowerCase() || ''
    const { id } = await params

    // 校验订单存在
    const order = repo.orders.getById(id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 校验访问权限: 邮箱匹配 (订单归属人), 或有效管理员会话
    const orderEmail = (order.shipping?.email || order.customerEmail || '').toLowerCase()
    const isAdmin = !!validateAdminToken(req.cookies.get('admin_token')?.value)

    if (email) {
      if (orderEmail && email !== orderEmail && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else if (!isAdmin) {
      // 未提供邮箱且非管理员 → 拒绝 (修复 IDOR: 原先 email 为空直接放行)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shipments = repo.shipments.getByOrderId(id)
    // 为每个 shipment 附加追踪链接
    const enriched = shipments.map((s: any) => ({
      ...s,
      trackingUrl: buildTrackingUrl(s.carrierCode, s.trackingNumber),
    }))

    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch shipments' }, { status: 500 })
  }
}
