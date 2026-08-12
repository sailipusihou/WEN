// 物流发货记录 API — 单条记录的查改删
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { getCarrierByCode } from '@/lib/shipping'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const repo = getRepository()
    const shipment = repo.shipments.getById(id)
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }
    return NextResponse.json(shipment)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch shipment' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const repo = getRepository()
    const existing = repo.shipments.getById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    const updates: any = {}

    // 更新物流商
    if (body.carrierCode !== undefined) {
      const carrier = getCarrierByCode(body.carrierCode)
      if (!carrier) {
        return NextResponse.json({ error: 'Unknown carrier code' }, { status: 400 })
      }
      updates.carrierCode = carrier.code
      updates.carrierName = carrier.name
    }

    // 更新追踪号 (校验唯一性)
    if (body.trackingNumber !== undefined && body.trackingNumber !== existing.trackingNumber) {
      const conflict = repo.shipments.getByTrackingNumber(body.trackingNumber)
      if (conflict && conflict.id !== id) {
        return NextResponse.json({ error: 'Tracking number already exists' }, { status: 409 })
      }
      updates.trackingNumber = body.trackingNumber.trim()
    }

    if (body.status !== undefined) updates.status = body.status
    if (body.weight !== undefined) updates.weight = body.weight ? Number(body.weight) : undefined
    if (body.shippingCost !== undefined) updates.shippingCost = body.shippingCost ? Number(body.shippingCost) : undefined
    if (body.estimatedDelivery !== undefined) updates.estimatedDelivery = body.estimatedDelivery
    if (body.deliveredAt !== undefined) updates.deliveredAt = body.deliveredAt
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.events !== undefined) updates.events = body.events

    const updated = repo.shipments.update(id, updates)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update shipment' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = requirePermission(req, 'orders_process')
    if ('error' in auth) return auth.error

    const repo = getRepository()
    const ok = repo.shipments.delete(id)
    if (!ok) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to delete shipment' }, { status: 500 })
  }
}
