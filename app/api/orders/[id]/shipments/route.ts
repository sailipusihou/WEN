// 客户端物流查询 API — 按订单 ID 查询发货记录和物流轨迹
// 此接口为公开接口 (客户端用户需查看自己订单的物流信息)
// 通过订单 ID + 用户邮箱校验访问权限
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { buildTrackingUrl } from '@/lib/shipping'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const repo = getRepository()
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email') || ''
    const { id } = await params

    // 校验订单存在
    const order = repo.orders.getById(id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 校验访问权限: 邮箱匹配 (允许管理员跳过)
    const orderEmail = (order.shipping?.email || order.customerEmail || '').toLowerCase()
    if (email && orderEmail && email.toLowerCase() !== orderEmail) {
      // 检查是否为管理员请求
      const authCookie = req.cookies.get('admin_token') || req.cookies.get('admin_session')
      if (!authCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
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
