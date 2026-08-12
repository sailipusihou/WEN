import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')?.trim().toLowerCase()
    
    const repo = getRepository()
    const order = repo.orders.getById(id)
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    if (email) {
      const orderEmail = ((order as any).userEmail || (order as any).customerEmail || (order as any).shipping?.email || '').toLowerCase()
      if (orderEmail && orderEmail !== email) {
        return NextResponse.json({ error: 'Email does not match this order' }, { status: 403 })
      }
    }
    
    const orderCopy = JSON.parse(JSON.stringify(order))
    delete orderCopy.paypalTransaction
    
    return NextResponse.json(orderCopy)
  } catch (err) {
    console.error('[Order Tracking] Error:', err)
    return NextResponse.json({ error: 'Failed to look up order' }, { status: 400 })
  }
}
