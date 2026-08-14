import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import {
  type Order,
  type OrderStatus,
  type TrackingInfo,
} from "@/lib/orders"
import { sendEmail, buildOrderConfirmationEmail } from "@/lib/email"
import { calculateShipping } from "@/lib/settings"
import { requireAdmin, requirePermission, requireUser, rateLimit, getClientIp } from "@/lib/auth"
import { getRepository } from "@/lib/repository"
import { getReferralLinkByCode, markTouchpointsAsConverted, findAttributableReferralClick, getReferralClickByOrderId } from "@/lib/referral-tracking"
import { type Shipment } from "@/lib/shipping"
import { getActivePromotions, computePromotionForProduct, getCouponByCode, validateCouponForSubtotal, incrementCouponUsed } from "@/lib/promotions"

// 服务端向 PayPal 验证 capture 真实性 (修复 C1/C2: 订单创建不再信任客户端声明的支付状态)
async function verifyPayPalCapture(captureId: string): Promise<{ verified: boolean; status?: string; amount?: number }> {
  const repo = getRepository()
  const settings = repo.settings.get()
  const clientId = settings.paypalClientId || process.env.PAYPAL_CLIENT_ID || ''
  const secret = settings.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET || ''
  const env = settings.paypalEnv || process.env.PAYPAL_ENV || 'sandbox'
  const base = env === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
  if (!clientId || !secret) return { verified: false }

  try {
    const authRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })
    if (!authRes.ok) return { verified: false }
    const auth = await authRes.json()
    if (!auth.access_token) return { verified: false }

    const capRes = await fetch(`${base}/v2/payments/captures/${encodeURIComponent(captureId)}`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + auth.access_token, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
    })
    if (!capRes.ok) return { verified: false }
    const cap = await capRes.json()
    return {
      verified: cap.status === 'COMPLETED',
      status: cap.status,
      amount: parseFloat(cap.amount?.value || '0'),
    }
  } catch {
    // 网络不可达/超时等: 视为无法验证, 订单标记为待人工核验而不是已支付
    return { verified: false }
  }
}

function enrichOrdersWithStaffAvatar(orders: any[]) {
  const repo = getRepository()
  const settings = repo.settings.get()
  return orders.map(order => {
    if (!order.assignedTo) return order
    const staff = settings.staffMembers?.find((s: any) => s.id === order.assignedTo)
    if (staff && !order.assignedToAvatar) {
      return { ...order, assignedToAvatar: staff.avatar }
    }
    return order
  })
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

function resolveOrderReferralAttribution(order: Order, visitorId: string | undefined, settings: any) {
  if (!order.referralCode) return
  return findAttributableReferralClick({
    referralCode: order.referralCode,
    visitorId,
    model: settings.attributionModel,
    lookbackDays: settings.attributionLookbackDays,
    requireVisitorMatch: settings.attributionRequireVisitorMatch,
    allowReferralFallback: settings.attributionAllowReferralFallback,
  })
}

function maybeMarkOrderReferralConversion(order: Order, visitorId: string | undefined, settings: any) {
  const attribution = resolveOrderReferralAttribution(order, visitorId, settings)
  if (attribution) {
    order.attributionClickId = attribution.click.id
    order.attributionModel = attribution.model as 'last_click' | 'first_click'
    // attribution.touchpoints 是 AttributedTouchpoint[] 类型
    // 旧版存的是 number, 我们把它存为一个 json 结构或保留其数量
    // 假设 Order 模型能支持 object 或者 stringify，这里用 totalTouchpointsCount 保持原语义为 number
    order.attributionTouchpoints = attribution.totalTouchpointsCount || attribution.touchpoints?.length || 1
    // 可以添加 order.attributionTouchpointsData = JSON.stringify(attribution.touchpoints) 以备后用
    order.attributionLookbackDays = attribution.lookbackDays
    order.attributionMatchedBy = attribution.matchedBy as 'visitor' | 'referral_code'
    order.attributionFallbackUsed = attribution.fallbackUsed
    
    // 如果存在多触点数组，则按权重标记；否则按单触点
    if (attribution.touchpoints && Array.isArray(attribution.touchpoints)) {
      markTouchpointsAsConverted(attribution.touchpoints, order.id, order.total || 0)
    } else {
      markTouchpointsAsConverted([{ click: attribution.click, weight: 1.0 }], order.id, order.total || 0)
    }
    
    return attribution
  }
  return undefined
}

function getOrderStatsFromRepo() {
  const repo = getRepository()
  const all = repo.orders.list()
  const returnOrders = all.filter(o =>
    o.status === "return_requested" || o.status === "return_approved" ||
    o.status === "return_shipped" || o.status === "return_delivered" || o.status === "refunded"
  )
  const refundedOrders = all.filter(o => o.status === "refunded")
  return {
    total: all.length,
    pending: all.filter(o => o.status === "pending").length,
    newOrders: all.filter(o => o.status === "pending" && !o.assignedTo).length,
    confirmed: all.filter(o => o.status === "confirmed").length,
    processing: all.filter(o => o.status === "processing").length,
    shipped: all.filter(o => o.status === "shipped").length,
    delivered: all.filter(o => o.status === "delivered").length,
    cancelled: all.filter(o => o.status === "cancelled").length,
    return_requested: all.filter(o => o.status === "return_requested").length,
    return_approved: all.filter(o => o.status === "return_approved").length,
    return_shipped: all.filter(o => o.status === "return_shipped").length,
    return_delivered: all.filter(o => o.status === "return_delivered").length,
    refunded: all.filter(o => o.status === "refunded").length,
    returnsTotal: returnOrders.length,
    refundTotal: refundedOrders.reduce((s, o) => s + (o.returnInfo?.refundAmount || o.total || 0), 0),
    revenue: all.reduce((s, o) => s + (o.status !== "cancelled" && o.status !== "refunded" ? o.total : 0), 0),
    grossRevenue: all.reduce((s, o) => s + (o.status !== "cancelled" ? o.total : 0), 0),
    paypalOrders: all.filter(o => o.paymentMethod === "paypal" || o.paypalTransaction).length,
    paypalRevenue: all.filter(o => o.paymentMethod === "paypal" || o.paypalTransaction)
      .reduce((s, o) => s + (o.paypalTransaction?.amount || o.total || 0), 0),
    paypalFees: all.filter(o => o.paymentMethod === "paypal" || o.paypalTransaction)
      .reduce((s, o) => s + (o.paypalTransaction?.fee || 0), 0),
  }
}

function getRevenueDailyFromRepo(days: number = 7): { date: string; revenue: number; count: number }[] {
  const repo = getRepository()
  const orders = repo.orders.list().filter(o => o.status !== "cancelled")
  const result: { date: string; revenue: number; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const dateStr = d.toISOString().split("T")[0]
    const dayOrders = orders.filter(o => o.createdAt.startsWith(dateStr))
    result.push({
      date: dateStr,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      count: dayOrders.length,
    })
  }
  return result
}

function getOrdersByStaffIdFromRepo(staffId: string) {
  const repo = getRepository()
  return repo.orders.list().filter(o => o.assignedTo === staffId)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stats = searchParams.get("stats")
  const email = searchParams.get("email")
  const staffId = searchParams.get("staffId")
  const revenue = searchParams.get("revenue")

  // stats / revenue / staffId / 全量列表: 必须管理员
  if (stats === "true" || revenue === "daily" || staffId || (!email)) {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error
    if (stats === "true") return NextResponse.json(getOrderStatsFromRepo())
    if (revenue === "daily") return NextResponse.json(getRevenueDailyFromRepo(7))
    if (staffId) return NextResponse.json(enrichOrdersWithStaffAvatar(getOrdersByStaffIdFromRepo(staffId)))

    // 分页 / 搜索 / 状态筛选（管理员全量列表）
    const repo = getRepository()
    let orders = enrichOrdersWithStaffAvatar(repo.orders.list()).map(enrichOrderWithReferralConversion)

    // 数据一致性修复：有活跃物流单但状态未同步为 shipped 的订单自动修正
    orders = orders.map(order => {
      const shipments = repo.shipments.getByOrderId(order.id)
      const activeShipment = shipments.find((s: Shipment) => !['cancelled', 'delivered', 'returned'].includes(s.status))
      if (activeShipment && order.status !== 'shipped' && order.status !== 'delivered') {
        const updated = repo.orders.update(order.id, {
          status: 'shipped',
          notes: (order.notes || '') + '\nAuto-synced from shipment ' + activeShipment.shipmentNo,
          tracking: {
            trackingNumber: activeShipment.trackingNumber,
            carrier: activeShipment.carrierName || activeShipment.carrierCode,
            estimatedDelivery: activeShipment.estimatedDelivery || '',
            url: '',
          }
        })
        return updated || order
      }
      return order
    })

    const status = searchParams.get("status")
    if (status) {
      orders = orders.filter(o => o.status === status)
    }

    const search = searchParams.get("search") || searchParams.get("q")
    if (search) {
      const q = search.toLowerCase().trim()
      orders = orders.filter(o =>
        (o.id || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q) ||
        (o.userEmail || '').toLowerCase().includes(q)
      )
    }

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00Z').getTime()
      orders = orders.filter(o => new Date(o.createdAt || 0).getTime() >= start)
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59Z').getTime()
      orders = orders.filter(o => new Date(o.createdAt || 0).getTime() <= end)
    }

    const assignedTo = searchParams.get("assignedTo")
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        orders = orders.filter(o => !o.assignedTo)
      } else {
        orders = orders.filter(o => o.assignedTo === assignedTo)
      }
    }

    const paymentMethod = searchParams.get("paymentMethod")
    if (paymentMethod) {
      if (paymentMethod === 'paypal') {
        orders = orders.filter(o => o.paymentMethod === 'paypal' || o.paypalTransaction)
      } else if (paymentMethod === 'other') {
        orders = orders.filter(o => o.paymentMethod !== 'paypal' && !o.paypalTransaction)
      }
    }

    const customerEmail = searchParams.get("customerEmail")
    if (customerEmail) {
      const ce = customerEmail.toLowerCase().trim()
      orders = orders.filter(o =>
        (o.customerEmail || '').toLowerCase() === ce ||
        (o.userEmail || '').toLowerCase() === ce ||
        (o.shipping?.email || '').toLowerCase() === ce
      )
    }

    // 追踪单号搜索
    const trackingNumber = searchParams.get("trackingNumber")
    if (trackingNumber) {
      const tn = trackingNumber.toLowerCase().trim()
      const matchedShipments = repo.shipments.list().filter((s: any) =>
        (s.trackingNumber || '').toLowerCase().includes(tn)
      )
      const matchedOrderIds = new Set(matchedShipments.map((s: any) => s.orderId))
      orders = orders.filter(o => matchedOrderIds.has(o.id))
    }

    // 发货批次号搜索
    const shipmentNo = searchParams.get("shipmentNo")
    if (shipmentNo) {
      const sn = shipmentNo.toLowerCase().trim()
      const matchedShipments = repo.shipments.list().filter((s: any) =>
        (s.shipmentNo || '').toLowerCase().includes(sn)
      )
      const matchedOrderIds = new Set(matchedShipments.map((s: any) => s.orderId))
      orders = orders.filter(o => matchedOrderIds.has(o.id))
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '', 10)
    const pageSize = isNaN(pageSizeRaw) ? 0 : Math.min(100, Math.max(1, pageSizeRaw))

    // 默认按创建时间倒序
    orders = [...orders].sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )

    if (pageSize > 0) {
      const total = orders.length
      const totalPages = Math.ceil(total / pageSize)
      const start = (page - 1) * pageSize
      const paginated = orders.slice(start, start + pageSize)
      // 附带发货单摘要信息
      const itemsWithShipment = paginated.map(order => {
        const shipments = repo.shipments.getByOrderId(order.id)
        const activeShipment = shipments.find((s: Shipment) => !['cancelled', 'delivered', 'returned'].includes(s.status))
        return {
          ...order,
          _shipmentSummary: activeShipment ? {
            carrierName: activeShipment.carrierName,
            trackingNumber: activeShipment.trackingNumber,
            status: activeShipment.status,
          } : null
        }
      }).map(enrichOrderWithReferralConversion)
      return NextResponse.json({
        items: itemsWithShipment,
        pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      })
    }

    // 无分页时也附带发货单摘要
    const ordersWithShipment = orders.map(order => {
      const shipments = repo.shipments.getByOrderId(order.id)
      const activeShipment = shipments.find((s: Shipment) => !['cancelled', 'delivered', 'returned'].includes(s.status))
      return {
        ...order,
        _shipmentSummary: activeShipment ? {
          carrierName: activeShipment.carrierName,
          trackingNumber: activeShipment.trackingNumber,
          status: activeShipment.status,
        } : null
      }
    }).map(enrichOrderWithReferralConversion)
    return NextResponse.json(ordersWithShipment)
  }

  // 按 email 查询: 必须是登录用户且只能查自己的订单, 或管理员
  const userAuth = requireUser(req)
  const adminAuth = requireAdmin(req)
  if ('error' in userAuth && 'error' in adminAuth) {
    return userAuth.error
  }
  // 普通用户只能查自己的 email
  if ('user' in userAuth && 'error' in adminAuth) {
    if (userAuth.user.email.toLowerCase() !== (email || '').toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden: can only view your own orders' }, { status: 403 })
    }
  }
  const repo = getRepository()
  const orders = repo.orders.list()
  const userOrders = orders.filter(o =>
    o.userEmail === email || o.customerEmail === email || o.shipping?.email === email
  )
  return NextResponse.json(enrichOrdersWithStaffAvatar(userOrders))
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!rateLimit('order_create:' + ip, 5, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many orders, please try again later' }, { status: 429 })
    }
    const body = await req.json()
    // 修复 M5: 原订单 ID 随机段仅 4 位 base36 (约 160 万组合, 可枚举), 改为加密安全随机
    const id = "OTM-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(6).toString("hex").toUpperCase()

    const repo = getRepository()
    const rawItems = body.items || []
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }

    let calculatedSubtotal = 0
    const validatedItems = []
    const activePromotions = getActivePromotions()

    for (const item of rawItems) {
      if (!item.id || !item.productId && !item.id) {
        return NextResponse.json({ error: 'Invalid item: missing product ID' }, { status: 400 })
      }
      const productId = item.productId || item.id
      const product = repo.products.getById(productId)
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${productId}` }, { status: 400 })
      }
      if (!product.active) {
        return NextResponse.json({ error: `Product is unavailable: ${productId}` }, { status: 400 })
      }
      const qty = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1))
      const unitPrice = computePromotionForProduct(product, activePromotions).price
      const itemSubtotal = unitPrice * qty
      calculatedSubtotal += itemSubtotal

      validatedItems.push({
        id: item.id || 'ITEM-' + Math.random().toString(36).slice(2, 8),
        productId: product.id,
        productCode: product.code || '',
        name: product.name,
        nameEn: product.nameEn || '',
        image: product.image,
        price: unitPrice,
        quantity: qty,
        subtotal: itemSubtotal,
        category: product.category || '',
      })
    }

    calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100

    // Apply coupon
    let couponDiscount = 0
    let couponCode: string | undefined
    // welcome 券核销需要用户持有 (登录用户 + 未使用 + 未过期)
    let welcomeCouponUserId: string | undefined
    let welcomeCouponCode: string | undefined
    if (body.couponCode) {
      const coupon = getCouponByCode(String(body.couponCode))
      if (!coupon) {
        return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 })
      }
      // 修复 H2: welcome 券必须由注册时发放的持有者本人使用 (防止共享码无限刷)
      if (coupon.kind === 'welcome') {
        const userAuth = requireUser(req)
        if ('error' in userAuth) {
          return NextResponse.json({ error: "Welcome coupon requires signing in" }, { status: 401 })
        }
        const holder = (userAuth.user as any).coupons?.find(
          (uc: any) => String(uc.code).toLowerCase() === coupon!.code.toLowerCase()
        )
        if (!holder || holder.used) {
          return NextResponse.json({ error: "This welcome coupon is not available for your account" }, { status: 400 })
        }
        if (new Date(holder.expiresAt).getTime() < Date.now()) {
          return NextResponse.json({ error: "This welcome coupon has expired" }, { status: 400 })
        }
        welcomeCouponUserId = userAuth.user.id
        welcomeCouponCode = coupon.code
      }
      const result = validateCouponForSubtotal(coupon, calculatedSubtotal)
      if (!result.ok) {
        return NextResponse.json({ error: result.error || "Coupon cannot be applied" }, { status: 400 })
      }
      couponDiscount = result.discount
      couponCode = coupon.code
    }

    const shipCountry = body.shipping?.country || "United States"
    const shippingCalc = calculateShipping(shipCountry, calculatedSubtotal)
    const settings = repo.settings.get()
    const total = Math.round((calculatedSubtotal - couponDiscount + shippingCalc.cost) * 100) / 100

    const order: Order = {
      id,
      items: validatedItems,
      shipping: body.shipping || {},
      subtotal: calculatedSubtotal,
      discount: couponDiscount,
      couponCode,
      shippingCost: shippingCalc.cost,
      total,
      currency: body.currency || "USD",
      status: "pending",
      createdAt: new Date().toISOString(),
      customerEmail: body.shipping?.email || body.customerEmail,
      customerName: body.shipping?.firstName
        ? body.shipping.firstName + " " + (body.shipping.lastName || "")
        : body.customerName,
      userEmail: body.userEmail || body.shipping?.email,
      estimatedDeliveryDays: shippingCalc.zone?.estimatedDaysMax || settings.defaultShippingDays,
      paymentMethod: body.paymentMethod || "other",
      paypalTransaction: body.paypalTransaction || undefined,
      notes: body.notes || undefined,
    }

    if (body.referralCode) {
      const referralLink = getReferralLinkByCode(body.referralCode)
      if (referralLink) {
        order.referralCode = referralLink.code
        order.referralId = referralLink.id
        order.referralVisitorId = body.referralVisitorId || body.visitorId
        order.referredByStaffId = referralLink.staffId
        order.referredByStaffName = referralLink.staffName
      }
    }

    // --- 支付真实性校验 (C1/C2/H4) ---
    const claimedTxn = body.paypalTransaction as any
    let paymentVerified = false
    let paymentStatus: "paid" | "unpaid" | "pending_verification" = 'unpaid'

    if (claimedTxn && claimedTxn.status === 'COMPLETED') {
      const claimedAmount = Number(claimedTxn.amount)
      if (!claimedTxn.captureId || Number.isNaN(claimedAmount)) {
        return NextResponse.json({ error: 'Invalid payment transaction data' }, { status: 400 })
      }
      // 金额一致性: 声称的扣款金额必须与服务端重算的订单总额一致 (防止 0.01 美元买全单)
      if (Math.abs(claimedAmount - total) > 0.01) {
        return NextResponse.json({ error: 'Payment amount does not match order total' }, { status: 400 })
      }
      // 服务端向 PayPal 验证 capture 真实性; 失败/网络不可达 → 标记待人工核验, 不视为已支付
      const verification = await verifyPayPalCapture(claimedTxn.captureId)
      paymentVerified = verification.verified
      paymentStatus = paymentVerified ? 'paid' : 'pending_verification'
      order.paypalTransaction = { ...claimedTxn, verified: paymentVerified }
    } else if (claimedTxn) {
      order.paypalTransaction = claimedTxn
    }
    order.paymentStatus = paymentStatus

    // 仅服务端验证通过的支付才触发归因转化 (修复 H4: 伪造/放弃支付的订单不再转化)
    const shouldMarkConversion = paymentVerified && !!order.referralCode
    if (shouldMarkConversion) {
      maybeMarkOrderReferralConversion(order, order.referralVisitorId, settings)
    }

    repo.orders.add(order)
    // 优惠券核销同样只在支付真实 (或未声称已支付) 时执行, 防止伪造 COMPLETED 刷券
    const couponEligible = !claimedTxn || claimedTxn.status !== 'COMPLETED' || paymentVerified
    if (couponCode && couponEligible) {
      incrementCouponUsed(couponCode)
      // 修复 H2: welcome 券同步核销持有者实例 (used=true), 防止重复使用
      if (welcomeCouponUserId && welcomeCouponCode) {
        try {
          const holder = repo.users.getById(welcomeCouponUserId)
          if (holder) {
            const coupons = (holder.coupons || []).map((uc: any) =>
              String(uc.code).toLowerCase() === welcomeCouponCode!.toLowerCase() ? { ...uc, used: true } : uc
            )
            repo.users.update(welcomeCouponUserId, { coupons })
          }
        } catch {
          console.warn('[Orders] Failed to mark welcome coupon used:', welcomeCouponCode)
        }
      }
    }

    const customerEmail = order.customerEmail
    if (customerEmail) {
      const confirmEmail = buildOrderConfirmationEmail(
        order.customerName || "Customer",
        id,
        order.total,
        (body.items || []).length
      )
      sendEmail({ to: customerEmail, ...confirmEmail }).then(result => {
        if (!result.success) console.warn("[Orders] Confirmation email not sent:", result.error)
      })
    }

    // Auto-assign to staff if enabled in settings
    try {
      const currentSettings = repo.settings.get()
      const mode = currentSettings.autoAssignMode || "disabled"
      
      if (mode !== "disabled" && currentSettings.staffMembers) {
        const activeStaff = currentSettings.staffMembers.filter((s: any) => s.active)
        if (activeStaff.length > 0) {
          let selectedStaff = null
          
          if (mode === "by_staff" && currentSettings.autoAssignTargetStaff) {
            // Assign to specific staff member
            const target = activeStaff.find((s: any) => s.id === currentSettings.autoAssignTargetStaff)
            if (target) selectedStaff = { member: target }
          } else if (mode === "by_role" && currentSettings.autoAssignTargetRole) {
            // Assign to any staff with matching role
            const roleStaff = activeStaff.filter((s: any) => s.role === currentSettings.autoAssignTargetRole)
            if (roleStaff.length > 0) {
              selectedStaff = { member: roleStaff[Math.floor(Math.random() * roleStaff.length)] }
            }
          } else if (mode === "round_robin" || currentSettings.autoAssignStrategy === "round_robin") {
            // Round-robin: assign to staff with fewest active orders
            const allOrders = repo.orders.list()
            const staffLoads = activeStaff.map((s: any) => ({
              member: s,
              load: allOrders.filter((o: any) =>
                o.assignedTo === s.id &&
                ["pending", "confirmed", "processing"].includes(o.status)
              ).length,
            }))
            staffLoads.sort((a: any, b: any) => a.load - b.load)
            selectedStaff = staffLoads[0]
          } else {
            // Random assignment (fallback)
            selectedStaff = { member: activeStaff[Math.floor(Math.random() * activeStaff.length)] }
          }
          
          if (selectedStaff) {
            const staffAvatar = selectedStaff.member.avatar || ""
            const updated = repo.orders.update(id, {
              assignedTo: selectedStaff.member.id,
              assignedToName: selectedStaff.member.name,
              assignedToAvatar: staffAvatar,
            })
            if (updated) {
              order.assignedTo = updated.assignedTo
              order.assignedToName = updated.assignedToName
              order.assignedToAvatar = updated.assignedToAvatar
            }
          }
        }
      }
    } catch (e) {
      console.warn("[Orders] Auto-assignment skipped:", e)
    }

    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    console.error("[/api/orders POST] Error:", err)
    return NextResponse.json(
      { error: "Failed to create order: " + (err instanceof Error ? err.message : String(err)) },
      { status: 400 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, 'orders_process')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: "Order ID required" }, { status: 400 })

    const operatorName = body.operatorName || auth.user.name || "System"
    const operatorRole = body.operatorRole || auth.user.role || "system"
    const operatorId = body.operatorId || auth.user.id || "system"

    const repo = getRepository()
    let updated: Order | null = null
    let actionLabel = ""
    let actionDetails = ""

    const existingOrder = repo.orders.getById(body.id)
    if (!existingOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    if (body.status) {
      const hasActiveShipment = repo.shipments.hasActiveShipment?.(body.id)
      if (hasActiveShipment) {
        return NextResponse.json(
          {
            error: "Cannot change order status: active shipment exists. Cancel the shipment first in Shipping Management.",
            errorCode: "SHIPMENT_ACTIVE"
          },
          { status: 400 }
        )
      }

      const newStatusHistory = [
        ...(existingOrder.statusHistory || []),
        { status: body.status, timestamp: new Date().toISOString(), note: body.note || "" },
      ]
      updated = repo.orders.update(body.id, {
        status: body.status as OrderStatus,
        statusHistory: newStatusHistory,
      })
      actionLabel = "order_status_update"
      actionDetails = `Status changed to ${body.status}${body.note ? ": " + body.note : ""}`

      if (body.status === "confirmed" && existingOrder.referralCode) {
        const settings = repo.settings.get()
        const attribution = maybeMarkOrderReferralConversion(existingOrder, existingOrder.referralVisitorId, settings)
        if (attribution) {
          repo.orders.update(body.id, {
            attributionClickId: existingOrder.attributionClickId,
            attributionModel: existingOrder.attributionModel,
            attributionTouchpoints: existingOrder.attributionTouchpoints,
            attributionLookbackDays: existingOrder.attributionLookbackDays,
            attributionMatchedBy: existingOrder.attributionMatchedBy,
            attributionFallbackUsed: existingOrder.attributionFallbackUsed,
          })
        }
      }
    }

    if (body.tracking) {
      let newStatus = existingOrder.status
      let newHistory = existingOrder.statusHistory || []
      if ((newStatus === "processing" || newStatus === "confirmed") && !body.status) {
        newStatus = "shipped" as OrderStatus
        newHistory = [
          ...newHistory,
          { status: "shipped", timestamp: new Date().toISOString(), note: "Package shipped with " + body.tracking.carrier },
        ]
      }
      updated = repo.orders.update(body.id, {
        tracking: body.tracking as TrackingInfo,
        status: body.status ? body.status as OrderStatus : newStatus,
        statusHistory: body.status ? (updated?.statusHistory || newHistory) : newHistory,
      })
      if (!actionLabel) {
        actionLabel = "order_tracking_added"
        actionDetails = `Tracking added: ${body.tracking.carrier} - ${body.tracking.trackingNumber}`
      }
    }

    if (body.assignedTo !== undefined) {
      updated = repo.orders.update(body.id, {
        assignedTo: body.assignedTo,
        assignedToName: body.assignedToName,
        assignedToAvatar: body.assignedToAvatar,
      })
      actionLabel = actionLabel || "order_staff_assignment"
      actionDetails = body.assignedTo ? `Assigned to ${body.assignedToName || body.assignedTo}` : "Staff unassigned"
    }

    if (body.notes !== undefined && !body.status && !body.tracking && body.assignedTo === undefined && !body.returnInfo && !body.paypalTransaction) {
      updated = repo.orders.update(body.id, { notes: body.notes })
      actionLabel = "order_notes_updated"
      actionDetails = "Order notes updated"
    }

    if (body.returnInfo) {
      const newStatus = body.status || existingOrder.status
      const newHistory = body.status
        ? (updated?.statusHistory || existingOrder.statusHistory || [])
        : existingOrder.statusHistory || []
      updated = repo.orders.update(body.id, {
        returnInfo: body.returnInfo,
        status: newStatus as OrderStatus,
        statusHistory: newHistory,
      })
      actionLabel = actionLabel || "order_return_updated"
      actionDetails = body.returnInfo.reason ? `Return: ${body.returnInfo.reason}` : "Return info updated"
    }

    if (body.paypalTransaction) {
      updated = repo.orders.update(body.id, {
        paypalTransaction: body.paypalTransaction,
        paymentMethod: body.paymentMethod || existingOrder.paymentMethod || "paypal",
      })
      if (!actionLabel) {
        actionLabel = "paypal_transaction_updated"
        actionDetails = `PayPal transaction: ${body.paypalTransaction.status}`
      }
    }

    if (actionLabel && updated) {
      repo.workLogs.add({
        operatorId: operatorId,
        operatorName: operatorName,
        operatorRole: operatorRole,
        action: actionLabel,
        details: actionDetails,
        orderId: body.id,
        category: "order",
      })
    }

    if (!updated) return NextResponse.json({ error: "Order not found or no update" }, { status: 404 })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 })
  }
}


