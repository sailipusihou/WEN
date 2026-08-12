// 4PX 创建测试订单 API
// POST /api/shipping/4px/create-test-order
// 在沙箱环境中创建一个测试订单，并自动在本地系统创建发货记录
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { getCarrierConfig } from '@/lib/shipping-config'
import { FourPXClient } from '@/lib/integrations/fourpx'
import { getCarrierByCode, generateShipmentNo } from '@/lib/shipping'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const cfg = getCarrierConfig('4px')
    if (!cfg?.enabled || !cfg.credentials.appKey || !cfg.credentials.appSecret) {
      return NextResponse.json({
        error: '4PX not configured. Please enable 4PX and set appKey/appSecret in Carrier Settings.',
      }, { status: 400 })
    }

    if (cfg.mode !== 'sandbox') {
      return NextResponse.json({
        error: 'Test order creation is only available in sandbox mode. Please switch to sandbox in Carrier Settings.',
      }, { status: 400 })
    }

    const client = new FourPXClient({
      appKey: cfg.credentials.appKey,
      appSecret: cfg.credentials.appSecret,
      accessToken: cfg.credentials.accessToken,
      sandbox: true,
    })

    const repo = getRepository()

    // 找一个待发货的订单用于测试 (confirmed/processing 状态)
    const pendingOrders = repo.orders.list().filter((o: any) =>
      ['confirmed', 'processing', 'paid'].includes(o.status)
    )

    if (pendingOrders.length === 0) {
      return NextResponse.json({
        error: 'No pending orders found. Please create an order first.',
      }, { status: 400 })
    }

    const testOrder = pendingOrders[0]
    const refNo = 'TEST-' + Date.now().toString(36).toUpperCase()

    // 构建测试订单参数
    const orderParams = {
      ref_no: refNo,
      product_code: 'SZXB',
      country_code: 'US',
      currency_code: 'USD',
      parcel_list: [{
        weight: 200,
        length: 20,
        width: 15,
        height: 10,
        parcel_value: 10,
        currency: 'USD',
        include_battery: 'N' as const,
        declare_product_info: [{
          name_cn: '工艺品',
          name_en: 'Craft Gift',
          quantity: 1,
          declared_value: 10,
          currency: 'USD',
          hs_code: '4421909090',
          weight: 200,
        }],
      }],
      recipient_info: {
        name: 'Test User',
        phone: '1234567890',
        email: 'test@example.com',
        country: 'US',
        state: 'CA',
        city: 'Los Angeles',
        street: '123 Main Street',
        postcode: '90001',
        mobile: '1234567890',
      },
      sender_info: {
        name: 'Test Sender',
        phone: '0755-12345678',
        country: 'CN',
        province: 'Guangdong',
        city: 'Shenzhen',
        address: 'Nanshan District, Shenzhen',
        zip: '518000',
      },
      attachment_info: {
        attachment_type: 'PDF',
      },
      remark: 'Test order for API integration testing',
    }

    // 调用4PX API创建订单
    const createResult = await client.createOrder(orderParams as any)

    // 确定追踪号 (优先使用 deliveryOrderNo，因为4PX轨迹查询用这个)
    const trackingNumber = createResult.deliveryOrderNo || createResult.trackingNumber || createResult.waybillNo || refNo

    if (!trackingNumber) {
      return NextResponse.json({
        error: 'Failed to get tracking number from 4PX response',
        rawResult: createResult.rawResult,
      }, { status: 500 })
    }

    // 在本地系统创建发货记录
    const carrier = getCarrierByCode('4px')
    const existingShipments = repo.shipments.getByOrderId(testOrder.id)
    const shipmentNo = generateShipmentNo(existingShipments.length + 1)

    const now = new Date().toISOString()
    const initialEvents = [{
      id: 'EVT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      timestamp: now,
      location: 'Shenzhen, China',
      description: 'Test order created in 4PX sandbox',
      status: 'picked_up',
      carrier: '4px',
    }]

    const shipment = repo.shipments.add({
      orderId: testOrder.id,
      orderNo: testOrder.orderNo || testOrder.id,
      shipmentNo,
      carrierCode: '4px',
      carrierName: carrier?.name || '4PX Express',
      trackingNumber,
      status: 'picked_up',
      weight: 0.2,
      shippingCost: 0,
      shippedAt: now,
      estimatedDelivery: '',
      events: initialEvents,
      notes: `4PX test order · ref_no: ${refNo}`,
      createdBy: auth.user?.name || auth.user?.email || 'system',
      fourPxRefNo: refNo,
      fourPxRawResult: createResult.rawResult,
    })

    // 同步更新订单状态为已发货 (与手动创建发货单逻辑一致)
    if (['confirmed', 'processing', 'pending', 'paid'].includes(testOrder.status)) {
      const trackingUrl = carrier?.trackingUrl
        ? carrier.trackingUrl.replace('{trackingNumber}', encodeURIComponent(trackingNumber))
        : ''
      repo.orders.update(testOrder.id, {
        status: 'shipped',
        tracking: {
          trackingNumber,
          carrier: carrier?.name || '4PX Express',
          url: trackingUrl,
        },
      } as any)
    }

    return NextResponse.json({
      success: true,
      message: 'Test order created successfully in 4PX sandbox',
      refNo,
      deliveryOrderNo: createResult.deliveryOrderNo,
      trackingNumber,
      orderId: testOrder.id,
      shipmentId: shipment.id,
      rawResult: createResult.rawResult,
    })
  } catch (e: any) {
    return NextResponse.json({
      error: e.message || 'Failed to create test order',
      stack: e.stack,
    }, { status: 500 })
  }
}
