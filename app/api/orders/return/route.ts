import { NextRequest, NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"
import { requirePermission, requireUser } from "@/lib/auth"
import { OrderStatus } from "@/lib/orders"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, reason, items, email } = body

    if (!orderId) return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    if (!reason) return NextResponse.json({ error: "Return reason required" }, { status: 400 })

    const repo = getRepository()
    const order = repo.orders.getById(orderId)

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    // 修复 S3: 退货申请必须由登录用户发起, 且邮箱必须与订单匹配 (禁止匿名提交/篡改他人订单)
    const userAuth = requireUser(req)
    if ('error' in userAuth) {
      return NextResponse.json({ error: "Please sign in to request a return" }, { status: 401 })
    }
    const orderEmail = (order.customerEmail || order.userEmail || order.shipping?.email || '').toLowerCase()
    const loggedInEmail = (userAuth.user.email || '').toLowerCase()
    const bodyEmail = String(email || '').trim().toLowerCase()
    if (!orderEmail || (loggedInEmail !== orderEmail && bodyEmail !== orderEmail)) {
      return NextResponse.json({ error: "Email does not match order" }, { status: 403 })
    }

    if (["cancelled", "return_requested", "return_approved", "return_shipped", "return_delivered", "refunded"].includes(order.status)) {
      return NextResponse.json({ error: `Cannot request return for order with status: ${order.status}` }, { status: 400 })
    }

    const returnInfo = {
      reason,
      requestedAt: new Date().toISOString(),
      items: items || order.items.map((item: any) => ({
        id: item.id || item.productId,
        name: item.name,
        quantity: item.quantity,
        reason: reason,
      })),
    }

    const newStatusHistory = [
      ...(order.statusHistory || []),
      { status: "return_requested" as OrderStatus, timestamp: new Date().toISOString(), note: `Return requested: ${reason}` },
    ]

    const updated = repo.orders.update(orderId, {
      status: "return_requested",
      returnInfo,
      statusHistory: newStatusHistory,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[/api/orders/return POST] Error:", err)
    return NextResponse.json(
      { error: "Failed to create return request" },
      { status: 400 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, 'orders_process')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { orderId, action, notes, trackingNumber, carrier, refundAmount } = body

    if (!orderId) return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    if (!action) return NextResponse.json({ error: "Action required" }, { status: 400 })

    const repo = getRepository()
    const order = repo.orders.getById(orderId)

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    const now = new Date().toISOString()
    const currentReturnInfo = order.returnInfo || { reason: "", requestedAt: now }
    let newStatus: OrderStatus = order.status
    let returnUpdate: any = { ...currentReturnInfo }

    switch (action) {
      case "approve":
        newStatus = "return_approved"
        returnUpdate.approvedAt = now
        if (notes) returnUpdate.notes = notes
        break
      case "reject":
        newStatus = "delivered"
        returnUpdate = { ...currentReturnInfo, notes: notes || "Return rejected" }
        break
      case "shipped":
        if (!trackingNumber || !carrier) {
          return NextResponse.json({ error: "Tracking number and carrier required" }, { status: 400 })
        }
        newStatus = "return_shipped"
        returnUpdate.shippedAt = now
        returnUpdate.trackingNumber = trackingNumber
        returnUpdate.carrier = carrier
        break
      case "delivered":
        newStatus = "return_delivered"
        returnUpdate.deliveredAt = now
        if (notes) returnUpdate.notes = notes
        break
      case "refund":
        newStatus = "refunded"
        returnUpdate.refundedAt = now
        returnUpdate.refundAmount = refundAmount || order.total
        if (notes) returnUpdate.notes = notes
        break
      case "update_notes":
        if (notes) returnUpdate.notes = notes
        break
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    const newStatusHistory = [
      ...(order.statusHistory || []),
      { status: newStatus, timestamp: now, note: notes || `Return action: ${action}` },
    ]

    const updated = repo.orders.update(orderId, {
      status: newStatus,
      returnInfo: returnUpdate,
      statusHistory: newStatusHistory,
    })

    const operatorName = auth.user.name || "System"
    const operatorRole = auth.user.role || "system"
    const operatorId = auth.user.id || "system"

    repo.workLogs.add({
      operatorId,
      operatorName,
      operatorRole,
      action: `order_return_${action}`,
      details: `Return ${action} for order ${orderId}${notes ? ": " + notes : ""}`,
      orderId,
      category: "order",
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[/api/orders/return PUT] Error:", err)
    return NextResponse.json(
      { error: "Failed to process return" },
      { status: 400 }
    )
  }
}
