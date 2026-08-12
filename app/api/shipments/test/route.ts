// 物流功能测试 API — 一键模拟完整物流流转
// 用法: POST /api/shipments/test  body: { orderId: "xxx" }
// 会自动创建发货记录并添加全部轨迹事件, 模拟从揽收到签收的完整流程
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { getCarrierByCode, generateShipmentNo, PRESET_CARRIERS } from '@/lib/shipping'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const repo = getRepository()

    if (!body.orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const order = repo.orders.getById(body.orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 随机选择一个物流商
    const carrier = PRESET_CARRIERS[Math.floor(Math.random() * Math.min(4, PRESET_CARRIERS.length))]

    // 生成符合格式的测试追踪号
    const testTrackingNumbers: Record<string, string> = {
      '4px': '4PX' + Date.now().toString().slice(-10) + 'CN',
      'yunexpress': 'YT' + Date.now().toString().slice(-16),
      'dhl': Date.now().toString().slice(-10),
      'fedex': Date.now().toString().slice(-12),
    }
    const trackingNumber = testTrackingNumbers[carrier.code] || ('TEST' + Date.now())

    // 检查是否已有发货记录
    const existing = repo.shipments.getByOrderId(body.orderId)
    if (existing.length > 0) {
      return NextResponse.json({
        message: 'Order already has shipments',
        shipments: existing,
      })
    }

    // 生成发货批次号
    const shipmentNo = generateShipmentNo(1)

    // 模拟完整物流轨迹 (从过去 7 天到现在)
    const now = Date.now()
    const events = [
      {
        id: 'EVT-TEST-1',
        timestamp: new Date(now - 6 * 86400000).toISOString(),  // 6天前
        location: 'Shenzhen, China',
        description: 'Package picked up by ' + carrier.name,
        status: 'picked_up',
        carrier: carrier.code,
      },
      {
        id: 'EVT-TEST-2',
        timestamp: new Date(now - 5 * 86400000).toISOString(),
        location: 'Shenzhen, China',
        description: 'Export customs declaration completed',
        status: 'export_customs',
        carrier: carrier.code,
      },
      {
        id: 'EVT-TEST-3',
        timestamp: new Date(now - 4 * 86400000).toISOString(),
        location: 'Hong Kong',
        description: 'Departed from origin country',
        status: 'international',
        carrier: carrier.code,
      },
      {
        id: 'EVT-TEST-4',
        timestamp: new Date(now - 2 * 86400000).toISOString(),
        location: 'Los Angeles, USA',
        description: 'Arrived at destination country',
        status: 'international',
        carrier: carrier.code,
      },
      {
        id: 'EVT-TEST-5',
        timestamp: new Date(now - 1 * 86400000).toISOString(),
        location: 'Los Angeles, USA',
        description: 'Import customs cleared',
        status: 'import_customs',
        carrier: carrier.code,
      },
      {
        id: 'EVT-TEST-6',
        timestamp: new Date(now - 12 * 3600000).toISOString(),  // 12小时前
        location: 'Local Sorting Center',
        description: 'Arrived at local sorting facility',
        status: 'at_local_facility',
        carrier: carrier.code,
      },
      {
        id: 'EVT-TEST-7',
        timestamp: new Date(now - 3 * 3600000).toISOString(),  // 3小时前
        location: 'Local Delivery Hub',
        description: 'Out for delivery',
        status: 'out_for_delivery',
        carrier: carrier.code,
      },
    ]

    // 创建发货记录
    const shipment = repo.shipments.add({
      orderId: body.orderId,
      orderNo: order.orderNo || order.id,
      shipmentNo,
      carrierCode: carrier.code,
      carrierName: carrier.name,
      trackingNumber,
      status: 'out_for_delivery',
      weight: 0.5 + Math.random() * 2,
      shippingCost: 15 + Math.random() * 20,
      shippedAt: events[0].timestamp,
      estimatedDelivery: new Date(now + 86400000).toISOString().slice(0, 10),
      events,
      notes: '[TEST] Simulated shipment for testing',
      createdBy: auth.user.name || auth.user.email,
    })

    // 自动更新订单状态为已发货
    if (['confirmed', 'processing', 'pending', 'paid'].includes(order.status)) {
      repo.orders.update(body.orderId, {
        status: 'shipped',
        tracking: {
          trackingNumber,
          carrier: carrier.name,
          url: carrier.trackingUrl ? carrier.trackingUrl.replace('{trackingNumber}', encodeURIComponent(trackingNumber)) : '',
        },
      } as any)
    }

    return NextResponse.json({
      success: true,
      message: 'Test shipment created with full tracking timeline',
      shipment,
      carrier: carrier.name,
      trackingNumber,
      trackingUrl: carrier.trackingUrl ? carrier.trackingUrl.replace('{trackingNumber}', encodeURIComponent(trackingNumber)) : '',
      eventCount: events.length,
      note: 'Order status auto-updated to "shipped". Add a "delivered" event to complete the flow.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Test failed' }, { status: 500 })
  }
}

// 快速测试: 添加 delivered 事件完成签收
export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const repo = getRepository()

    if (!body.shipmentId) {
      return NextResponse.json({ error: 'Missing shipmentId' }, { status: 400 })
    }

    const shipment = repo.shipments.getById(body.shipmentId)
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    // 添加签收事件
    const deliveredEvent = {
      id: 'EVT-TEST-DELIVERED',
      timestamp: new Date().toISOString(),
      location: 'Customer Address',
      description: 'Package delivered and signed',
      status: 'delivered',
      carrier: shipment.carrierCode,
    }

    const updated = repo.shipments.addTrackEvent(body.shipmentId, deliveredEvent)

    // 自动更新订单状态为已签收
    if (shipment.orderId) {
      const order = repo.orders.getById(shipment.orderId)
      if (order && order.status === 'shipped') {
        repo.orders.update(shipment.orderId, {
          status: 'delivered',
          tracking: {
            carrier: shipment.carrierName || shipment.carrierCode,
            trackingNumber: shipment.trackingNumber,
            estimatedDelivery: shipment.estimatedDelivery || '',
            actualDelivery: deliveredEvent.timestamp,
            url: '',
          },
        } as any)
      }
      repo.shipments.update(body.shipmentId, { deliveredAt: deliveredEvent.timestamp })
    }

    return NextResponse.json({
      success: true,
      message: 'Delivered event added — order completed',
      shipment: updated,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Test failed' }, { status: 500 })
  }
}
