// 取消发货 API
// POST /api/shipments/[id]/cancel
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => ({}))
    const repo = getRepository()
    const shipment = repo.shipments.getById(id)

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    // 检查是否可以取消
    if (['delivered', 'returned', 'cancelled'].includes(shipment.status)) {
      return NextResponse.json(
        { error: `Cannot cancel shipment with status: ${shipment.status}` },
        { status: 400 }
      )
    }

    // 执行取消操作
    const result = repo.shipments.cancel(
      id,
      body.reason || 'Manually cancelled',
      auth.user?.name || auth.user?.email || 'system'
    )

    if (!result) {
      return NextResponse.json({ error: 'Failed to cancel shipment' }, { status: 500 })
    }

    const message = result.orderReverted
      ? 'Shipment cancelled successfully. Order reverted to Processing status.'
      : 'Shipment cancelled successfully. Order remains shipped (other active shipments exist).'

    return NextResponse.json({
      success: true,
      message,
      shipment: result.shipment,
      order: result.order,
      orderReverted: result.orderReverted,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Failed to cancel shipment' },
      { status: 500 }
    )
  }
}
