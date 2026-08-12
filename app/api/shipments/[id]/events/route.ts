// 物流轨迹节点 API — 添加单个轨迹事件
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { TRACK_EVENT_PRESETS, type TrackStatus } from '@/lib/shipping'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const repo = getRepository()
    const shipment = repo.shipments.getById(id)
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (!body.description || !body.status) {
      return NextResponse.json({ error: 'Missing required fields: description, status' }, { status: 400 })
    }

    const event = {
      timestamp: body.timestamp || new Date().toISOString(),
      location: body.location || '',
      description: body.description,
      status: body.status as TrackStatus,
      carrier: body.carrier || shipment.carrierCode,
    }

    const updated = repo.shipments.addTrackEvent(id, event)

    // 当轨迹事件为 delivered 时, 自动将订单状态更新为 delivered
    if (body.status === 'delivered' && shipment.orderId) {
      const order = repo.orders.getById(shipment.orderId)
      if (order && order.status === 'shipped') {
        repo.orders.update(shipment.orderId, {
          status: 'delivered',
          tracking: {
            carrier: shipment.carrierName || shipment.carrierCode,
            trackingNumber: shipment.trackingNumber,
            estimatedDelivery: shipment.estimatedDelivery || '',
            actualDelivery: event.timestamp,
            url: '',
          },
        } as any)
      }
      // 更新 shipment 的签收时间
      repo.shipments.update(id, { deliveredAt: event.timestamp })
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to add track event' }, { status: 500 })
  }
}

// 获取预设轨迹事件模板 (方便前端快速录入)
export async function GET(req: NextRequest) {
  return NextResponse.json(TRACK_EVENT_PRESETS)
}
