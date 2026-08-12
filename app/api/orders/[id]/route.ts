import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requireAdmin, requireUser } from '@/lib/auth'
import { getReferralClickByOrderId } from '@/lib/referral-tracking'

function enrichOrderWithStaffAvatar(order: any) {
  if (!order.assignedTo) return order
  const repo = getRepository()
  const settings = repo.settings.get()
  const staff = settings.staffMembers?.find((s: any) => s.id === order.assignedTo)
  if (staff && !order.assignedToAvatar) {
    return { ...order, assignedToAvatar: staff.avatar }
  }
  return order
}

function enrichOrderWithReferralConversion(order: any) {
  const click = getReferralClickByOrderId(order.id)
  if (!click) return order
  return {
    ...order,
    _referralConversion: {
      clickId: click.id,
      referralCode: click.referralCode,
      converted: click.converted,
      orderId: click.orderId,
      attributionModel: order.attributionModel,
      matchedBy: order.attributionMatchedBy,
      touchpoints: order.attributionTouchpoints,
      lookbackDays: order.attributionLookbackDays,
      fallbackUsed: order.attributionFallbackUsed,
    },
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop() || ''
  const repo = getRepository()
  const order = repo.orders.getById(id)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // 鉴权: 管理员可查看任意订单; 普通用户只能查看自己的订单 (按邮箱匹配)
  const adminAuth = await requireAdmin(req)
  if ('error' in adminAuth) {
    const userAuth = await requireUser(req)
    if ('error' in userAuth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const orderEmail = order.userEmail || order.customerEmail || order.shipping?.email
    if (!orderEmail || orderEmail.toLowerCase() !== userAuth.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden: not your order' }, { status: 403 })
    }
  }

  return NextResponse.json(enrichOrderWithReferralConversion(enrichOrderWithStaffAvatar(order)))
}
