// 物流发货记录 API — 列表 & 新增
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { getCarrierByCode, generateShipmentNo, type Shipment } from '@/lib/shipping'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const repo = getRepository()
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const trackingNumber = searchParams.get('trackingNumber')

    let shipments: any[]
    if (orderId) {
      shipments = repo.shipments.getByOrderId(orderId)
    } else if (trackingNumber) {
      const s = repo.shipments.getByTrackingNumber(trackingNumber)
      shipments = s ? [s] : []
    } else {
      shipments = repo.shipments.list()
    }

    if (status && status !== 'all') {
      shipments = shipments.filter(s => s.status === status)
    }

    // 附带订单和客户信息
    const shipmentsWithOrder = shipments.map(s => {
      const order = repo.orders.getById(s.orderId)
      if (!order) return { ...s, _orderInfo: null }
      return {
        ...s,
        _orderInfo: {
          id: order.id,
          orderNo: order.orderNo || order.id,
          status: order.status,
          total: order.total,
          customerName: order.customerName || (order.shipping ? `${order.shipping.firstName || ''} ${order.shipping.lastName || ''}`.trim() : '') || 'Guest',
          customerEmail: order.customerEmail || order.shipping?.email || order.userEmail || '',
          customerPhone: order.shipping?.phone || order.billing?.phone || '',
          avatar: order.avatar || '',
          shippingAddress: order.shipping ? {
            name: `${order.shipping.firstName || ''} ${order.shipping.lastName || ''}`.trim(),
            address: order.shipping.address || order.shipping.street || '',
            city: order.shipping.city || '',
            state: order.shipping.state || '',
            country: order.shipping.country || '',
            postcode: order.shipping.postcode || order.shipping.zip || '',
          } : null,
          items: (order.items || []).map((it: any) => ({
            name: it.name || it.productName || '',
            quantity: it.quantity || 1,
            price: it.price || 0,
            productCode: it.productCode || '',
          })),
          createdAt: order.createdAt,
        }
      }
    })

    return NextResponse.json(shipmentsWithOrder)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch shipments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const body = await req.json()
    if (!body.orderId || !body.trackingNumber || !body.carrierCode) {
      return NextResponse.json({ error: 'Missing required fields: orderId, trackingNumber, carrierCode' }, { status: 400 })
    }

    const carrier = getCarrierByCode(body.carrierCode)
    if (!carrier) {
      return NextResponse.json({ error: 'Unknown carrier code: ' + body.carrierCode }, { status: 400 })
    }

    const repo = getRepository()

    // 校验订单存在
    const order = repo.orders.getById(body.orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 校验订单只能有一个活跃物流单 (唯一性约束)
    const activeShipments = repo.shipments.getByOrderId(body.orderId).filter((s: Shipment) => !['cancelled', 'delivered', 'returned'].includes(s.status))
    if (activeShipments.length > 0) {
      return NextResponse.json({
        error: `Order already has an active shipment: ${activeShipments[0].shipmentNo || activeShipments[0].trackingNumber}`,
        shipment: activeShipments[0],
      }, { status: 409 })
    }

    // 校验追踪号唯一性
    const existing = repo.shipments.getByTrackingNumber(body.trackingNumber)
    if (existing) {
      return NextResponse.json({ error: 'Tracking number already exists' }, { status: 409 })
    }

    // 生成发货批次号
    const existingShipments = repo.shipments.getByOrderId(body.orderId)
    const shipmentNo = generateShipmentNo(existingShipments.length + 1)

    // 初始轨迹事件 (已揽收)
    const now = new Date().toISOString()
    const initialEvents = [{
      id: 'EVT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      timestamp: now,
      location: body.pickupLocation || 'Shenzhen, China',
      description: 'Package picked up by ' + carrier.name,
      status: 'picked_up',
      carrier: carrier.code,
    }]

    const shipment = repo.shipments.add({
      orderId: body.orderId,
      orderNo: order.orderNo || order.id,
      shipmentNo,
      carrierCode: carrier.code,
      carrierName: carrier.name,
      trackingNumber: body.trackingNumber.trim(),
      status: 'picked_up',
      weight: body.weight ? Number(body.weight) : undefined,
      shippingCost: body.shippingCost ? Number(body.shippingCost) : undefined,
      shippedAt: now,
      estimatedDelivery: body.estimatedDelivery || '',
      events: initialEvents,
      notes: body.notes || '',
      createdBy: auth.user.name || auth.user.email,
    })

    // 更新订单状态为已发货 (从 confirmed/processing/pending/paid 状态自动流转)
    let orderUpdated = false
    if (['confirmed', 'processing', 'pending', 'paid'].includes(order.status)) {
      const updated = repo.orders.update(body.orderId, {
        status: 'shipped',
        tracking: {
          trackingNumber: body.trackingNumber.trim(),
          carrier: carrier.name,
          url: carrier.trackingUrl ? carrier.trackingUrl.replace('{trackingNumber}', encodeURIComponent(body.trackingNumber.trim())) : '',
        },
      } as any)
      orderUpdated = !!updated
    }

    return NextResponse.json({
      ...shipment,
      orderUpdated,
      orderStatus: orderUpdated ? 'shipped' : order.status,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create shipment' }, { status: 500 })
  }
}
