// 物流轨迹同步 API
// POST /api/shipments/sync - 手动触发同步
// GET  /api/shipments/sync - 获取同步状态
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getRepository } from '@/lib/repository'
import { getCarrierConfig } from '@/lib/shipping-config'
import { FourPXClient, map4PXStatus } from '@/lib/integrations/fourpx'
import type { TrackEvent } from '@/lib/shipping'

let isSyncing = false
let lastSyncResult: any = null

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    return NextResponse.json({
      isSyncing,
      lastSync: lastSyncResult,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    if (isSyncing) {
      return NextResponse.json({ error: 'Sync already in progress' }, { status: 429 })
    }

    isSyncing = true

    // 同步执行并返回结果
    const results = await runSync()
    lastSyncResult = { time: new Date().toISOString(), results }
    isSyncing = false

    return NextResponse.json(results)
  } catch (e: any) {
    isSyncing = false
    return NextResponse.json({ error: e.message || 'Sync failed' }, { status: 500 })
  }
}

async function runSync() {
  const repo = getRepository()
  const results: Record<string, any> = {}

  try {
    // 获取所有进行中的发货记录 (包括 cancelled 需要检测是否重新激活)
    const allShipments = repo.shipments.list()
    const activeShipments = allShipments.filter(
      (s: any) => s.status !== 'delivered' && s.status !== 'returned'
    )

    // 按物流商分组
    const byCarrier: Record<string, typeof activeShipments> = {}
    for (const s of activeShipments) {
      if (!byCarrier[s.carrierCode]) byCarrier[s.carrierCode] = []
      byCarrier[s.carrierCode].push(s)
    }

    // 4PX 同步
    if (byCarrier['4px']?.length) {
      const cfg = getCarrierConfig('4px')
      if (cfg?.enabled && cfg.credentials.appKey && cfg.credentials.appSecret) {
        try {
          const client = new FourPXClient({
            appKey: cfg.credentials.appKey,
            appSecret: cfg.credentials.appSecret,
            accessToken: cfg.credentials.accessToken,
            sandbox: cfg.mode === 'sandbox',
          })

          let updated = 0
          let statusChanged = 0
          const trackingResults: any[] = []

          for (const shipment of byCarrier['4px']) {
            try {
              const t = await client.getTracking(shipment.trackingNumber)
              if (!t) continue
              trackingResults.push(t)

              // 转换事件格式
              const existingEvents = shipment.events || []
              const newEvents: TrackEvent[] = (t.events as any[])
                .filter(e => {
                  // 去重: 检查事件是否已存在
                  return !existingEvents.some((ee: any) =>
                    ee.timestamp === e.event_time && ee.description === e.description
                  )
                })
                .map(e => ({
                  id: 'EVT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                  timestamp: e.event_time,
                  location: e.location,
                  description: e.description || e.event_name,
                  status: map4PXStatus(e.event_code, e.event_name),
                  carrier: '4px',
                }))

              // 获取最新事件和映射状态 (以平台数据为首要)
              const latestEvent = t.events[t.events.length - 1]
              const mappedStatus = map4PXStatus(latestEvent.event_code, latestEvent.event_name)

              // 如果有新事件，添加到数据库
              if (newEvents.length > 0) {
                for (const evt of newEvents) {
                  repo.shipments.addTrackEvent(shipment.id, evt)
                }
                updated++
              }

              // 状态同步: 以平台数据为首要，无论是否有新事件都检查状态
              if (mappedStatus !== shipment.status) {
                const updateData: any = { status: mappedStatus }
                if (mappedStatus === 'delivered') {
                  updateData.deliveredAt = latestEvent.event_time
                }
                repo.shipments.update(shipment.id, updateData)
                statusChanged++

                // 同步更新订单状态和 tracking 信息 (平台数据优先)
                if (shipment.orderId) {
                  const order = repo.orders.getById(shipment.orderId)
                  if (order) {
                    const orderUpdate: any = {
                      tracking: {
                        carrier: shipment.carrierName || shipment.carrierCode || '4PX Express',
                        trackingNumber: shipment.trackingNumber,
                        status: mappedStatus,
                        lastEvent: latestEvent.event_name || latestEvent.description,
                        lastEventTime: latestEvent.event_time,
                        lastLocation: latestEvent.location,
                      }
                    }

                    // 订单状态以物流状态为首要
                    if (mappedStatus === 'delivered') {
                      orderUpdate.status = 'delivered'
                    } else if (['picked_up', 'in_transit', 'export_customs', 'international', 'import_customs', 'at_local_facility', 'out_for_delivery'].includes(mappedStatus)) {
                      // 只要有物流轨迹在流转，订单状态应为 shipped
                      if (order.status !== 'shipped' && order.status !== 'delivered') {
                        orderUpdate.status = 'shipped'
                      }
                    } else if (mappedStatus === 'exception' || mappedStatus === 'returned') {
                      // 异常状态也同步
                      if (order.status !== 'delivered') {
                        orderUpdate.status = mappedStatus === 'returned' ? 'return_shipped' : order.status
                      }
                    }

                    repo.orders.update(shipment.orderId, orderUpdate)
                  }
                }
              } else if (newEvents.length > 0 && shipment.orderId) {
                // 状态没变但有新事件，更新 tracking 信息
                const order = repo.orders.getById(shipment.orderId)
                if (order) {
                  repo.orders.update(shipment.orderId, {
                    tracking: {
                      carrier: shipment.carrierName || shipment.carrierCode || '4PX Express',
                      trackingNumber: shipment.trackingNumber,
                      estimatedDelivery: shipment.estimatedDelivery || '',
                      status: mappedStatus,
                      lastEvent: latestEvent.event_name || latestEvent.description,
                      lastEventTime: latestEvent.event_time,
                      lastLocation: latestEvent.location,
                    }
                  })
                }
              }
            } catch (e: any) {
              console.error(`Sync tracking ${shipment.trackingNumber} failed:`, e.message)
            }
          }

          results['4px'] = {
            total: byCarrier['4px'].length,
            updated,
            statusChanged,
            trackingResults,
          }
        } catch (e: any) {
          results['4px'] = { error: e.message }
        }
      }
    }

    lastSyncResult = {
      timestamp: new Date().toISOString(),
      totalActive: activeShipments.length,
      results,
    }
  } finally {
    isSyncing = false
  }
  return results
}
