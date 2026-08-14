import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { validateAdminToken } from '@/lib/auth'

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
    
    const orderEmail = ((order as any).userEmail || (order as any).customerEmail || (order as any).shipping?.email || '').toLowerCase()
    const isAdmin = !!validateAdminToken(req.cookies.get('admin_token')?.value)

    if (email) {
      if (orderEmail && orderEmail !== email && !isAdmin) {
        return NextResponse.json({ error: 'Email does not match this order' }, { status: 403 })
      }
    } else if (!isAdmin) {
      // 未提供邮箱且非管理员 → 拒绝 (修复 IDOR)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const orderCopy = JSON.parse(JSON.stringify(order))
    delete orderCopy.paypalTransaction
    
    return NextResponse.json(orderCopy)
  } catch (err) {
    console.error('[Order Tracking] Error:', err)
    return NextResponse.json({ error: 'Failed to look up order' }, { status: 400 })
  }
}
