// 发货通知 API — 后台手动通知客户「订单已发货」
//
// 设计 (与需求确认一致):
//   - 全部由后台手动点击触发, 不自动发送
//   - channel = 'email'   → 通过已配置的 SMTP 发到客户邮箱 (没有邮箱则拒绝)
//   - channel = 'message' → 写入站内消息 (/messages 客户聊天), 客户登录后可见
//   - 发送结果记录在 shipment 上: notifiedAt / notifiedChannel / notifiedTo
//     → 后台列表因此可以显示「有邮箱 / 无邮箱 / 已发送·时间」
import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { sendEmail, buildShipmentNotificationEmail } from '@/lib/email'
import { buildTrackingUrl } from '@/lib/shipping'

/** 尽力从订单里找出客户邮箱: 订单字段 → 收货信息 → 关联账号 */
function resolveCustomerEmail(order: any, repo: any): string {
  const direct = order?.customerEmail || order?.shipping?.email || order?.userEmail || order?.billing?.email
  if (direct && String(direct).includes('@')) return String(direct).trim()
  if (order?.userId) {
    try {
      const u = repo.users.getById(order.userId)
      if (u?.email) return String(u.email).trim()
    } catch { /* ignore */ }
  }
  return ''
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, 'orders_process')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { shipmentId, channel } = body || {}
    if (!shipmentId || !['email', 'message'].includes(channel)) {
      return NextResponse.json({ error: 'Missing shipmentId or invalid channel' }, { status: 400 })
    }

    const repo = getRepository()
    const shipment = repo.shipments.getById(shipmentId)
    if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

    const order = repo.orders.getById(shipment.orderId)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const email = resolveCustomerEmail(order, repo)
    const customerName =
      order.customerName ||
      [order.shipping?.firstName, order.shipping?.lastName].filter(Boolean).join(' ') ||
      'Customer'
    const orderNo = order.orderNo || order.id || shipment.orderNo || shipment.orderId
    const trackingUrl =
      buildTrackingUrl(shipment.carrierCode, shipment.trackingNumber) ||
      order.tracking?.url || ''

    const items = (order.items || []).map((it: any) => ({
      name: it.name || it.productName || 'Item',
      quantity: it.quantity || 1,
    }))

    // ---------- 站内通知 ----------
    if (channel === 'message') {
      if (!email) {
        return NextResponse.json(
          { error: 'This order has no customer email, so an in-site message cannot be delivered.' },
          { status: 400 }
        )
      }
      const lines = [
        `Hi ${customerName},`,
        ``,
        `Good news — your order #${orderNo} has shipped.`,
        `Carrier: ${shipment.carrierName || shipment.carrierCode}`,
        `Tracking number: ${shipment.trackingNumber}`,
      ]
      if (trackingUrl) lines.push(`Track it here: ${trackingUrl}`)
      lines.push('', 'If you have any questions, just reply to this message.')

      repo.messages.add({
        name: customerName,
        email,
        subject: `Order #${orderNo} has shipped`,
        message: lines.join('\n'),
        source: 'shipment',
        attachments: [],
        adminReply: '',
        adminAttachments: [],
        adminName: auth.user.name || 'Low Flame',
        adminAvatar: auth.user.avatar || '',
        repliedAt: new Date().toISOString(),
        read: true,
        replied: false,
        senderType: 'admin',
      })

      const notifiedAt = new Date().toISOString()
      repo.shipments.update(shipmentId, {
        notifiedAt,
        notifiedChannel: 'message',
        notifiedTo: email,
      })
      return NextResponse.json({ ok: true, channel: 'message', sentTo: email, notifiedAt })
    }

    // ---------- 邮件通知 ----------
    if (!email) {
      return NextResponse.json({ error: 'This order has no customer email' }, { status: 400 })
    }

    const { subject, html } = buildShipmentNotificationEmail({
      customerName,
      orderNo,
      carrierName: shipment.carrierName || shipment.carrierCode,
      trackingNumber: shipment.trackingNumber,
      trackingUrl,
      estimatedDelivery: shipment.estimatedDelivery || '',
      items,
    })

    const result = await sendEmail({ to: email, subject, html })
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 502 })
    }

    const notifiedAt = new Date().toISOString()
    repo.shipments.update(shipmentId, {
      notifiedAt,
      notifiedChannel: 'email',
      notifiedTo: email,
    })
    return NextResponse.json({ ok: true, channel: 'email', sentTo: email, notifiedAt })
  } catch (e: any) {
    console.error('[shipments/notify] failed:', e)
    return NextResponse.json({ error: e?.message || 'Failed to notify customer' }, { status: 500 })
  }
}
