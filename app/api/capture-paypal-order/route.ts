import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requireUser } from '@/lib/auth'
import { getCouponByCode } from '@/lib/promotions'
import { finalizePaidOrder } from '@/lib/order-finalize'

function getPayPalConfig() {
  try {
    const repo = getRepository()
    const settings = repo.settings.get()

    const dbEnabled = settings.paypalEnabled && settings.paypalClientId && settings.paypalClientSecret
    const envClientId = process.env.PAYPAL_CLIENT_ID || ''
    const envSecret = process.env.PAYPAL_CLIENT_SECRET || ''
    const envEnv = process.env.PAYPAL_ENV || 'sandbox'

    if (dbEnabled) {
      return {
        clientId: settings.paypalClientId,
        secret: settings.paypalClientSecret,
        env: settings.paypalEnv || 'sandbox',
        base: settings.paypalEnv === 'production'
          ? 'https://api-m.paypal.com'
          : 'https://api-m.sandbox.paypal.com',
      }
    }

    return {
      clientId: envClientId,
      secret: envSecret,
      env: envEnv,
      base: envEnv === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
    }
  } catch {
    const envClientId = process.env.PAYPAL_CLIENT_ID || ''
    const envSecret = process.env.PAYPAL_CLIENT_SECRET || ''
    const envEnv = process.env.PAYPAL_ENV || 'sandbox'
    return {
      clientId: envClientId,
      secret: envSecret,
      env: envEnv,
      base: envEnv === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
    }
  }
}

/**
 * PayPal 收款确认（先建单后扣款流程的第二步）。
 *
 * 关键设计：本接口**只认站内订单**。
 *  - 入参必须带 orderId，且该订单必须已由 /api/orders 落库、并由
 *    /api/create-paypal-order 记录过 paypalOrderId；
 *  - 找不到订单就直接拒绝，因此不可能出现「钱扣了但系统里没有订单」的孤儿扣款；
 *  - 扣款金额必须与订单总额严格一致（金额由服务端在建单时算好，客户端无法影响）。
 *
 * 幂等：同一订单重复调用不会重复扣款（先查 paymentStatus，再靠固定的
 * PayPal-Request-Id 让 PayPal 侧返回同一次 capture）。
 */
export async function POST(req: NextRequest) {
  try {
    const config = getPayPalConfig()
    if (!config.clientId || !config.secret) {
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 })
    }

    const { orderId, paypalOrderId } = await req.json()
    if (!orderId || !paypalOrderId) {
      return NextResponse.json({ error: 'orderId and paypalOrderId are required' }, { status: 400 })
    }

    const repo = getRepository()
    const order = repo.orders.getById(String(orderId))
    if (!order) {
      console.error(`[PayPal] capture 找不到站内订单 orderId=${orderId} paypalOrderId=${paypalOrderId}`)
      return NextResponse.json({ error: 'Order not found for this payment' }, { status: 404 })
    }

    const storedPaypalOrderId = (order.paypalTransaction as any)?.paypalOrderId
    if (storedPaypalOrderId && String(storedPaypalOrderId) !== String(paypalOrderId)) {
      console.error(`[PayPal] capture 订单与 PayPal 订单不匹配 orderId=${orderId}`)
      return NextResponse.json({ error: 'Payment does not belong to this order' }, { status: 400 })
    }

    // --- 幂等：已支付过就直接返回，不再扣款 ---
    if (order.paymentStatus === 'paid') {
      const txn: any = order.paypalTransaction || {}
      return NextResponse.json({
        status: 'COMPLETED',
        alreadyPaid: true,
        orderId: order.id,
        captureId: txn.captureId,
        transactionId: txn.transactionId,
        amount: txn.amount,
        currency: txn.currency || 'USD',
      })
    }

    const orderTotalUsd = Number(order.total)
    if (!Number.isFinite(orderTotalUsd) || orderTotalUsd <= 0) {
      return NextResponse.json({ error: 'Order total is invalid' }, { status: 400 })
    }

    // --- 取 token ---
    const authRes = await fetch(`${config.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(config.clientId + ':' + config.secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })
    const auth = await authRes.json()
    const accessToken = auth.access_token
    if (!accessToken) {
      return NextResponse.json({ error: 'PayPal authentication failed' }, { status: 502 })
    }

    // --- 扣款 ---
    // PayPal-Request-Id 按订单号固定（不再拼 Date.now()）：重试会拿到同一次 capture，
    // 不会被重复扣款，客户端重复提交也安全。
    const captureRes = await fetch(`${config.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `capture-${order.id}`,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(30000),
    })
    const captureData = await captureRes.json()

    if (captureData.status !== 'COMPLETED') {
      // 未扣成功：订单保持 unpaid / pending，后续可重试或由 auto-confirm 取消，
      // 客户没有被扣钱，不存在资金风险。
      return NextResponse.json(
        { status: captureData.status, error: captureData.message || 'Capture not completed' },
        { status: 400 }
      )
    }

    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0] || captureData
    const grossAmount = parseFloat(capture.amount?.value || '0')
    const currency = (capture.amount?.currency_code || 'USD').toUpperCase()
    const feeAmount = parseFloat(capture.seller_receivable_breakdown?.paypal_fee?.value || '0')
    const netAmount = parseFloat(capture.seller_receivable_breakdown?.net_amount?.value || String(grossAmount - feeAmount))

    const paypalTransaction = {
      orderId: paypalOrderId,
      paypalOrderId,
      captureId: capture.id,
      transactionId: capture.id,
      amount: grossAmount,
      fee: feeAmount,
      netAmount,
      currency,
      status: 'COMPLETED',
      createdAt: capture.create_time || new Date().toISOString(),
      updatedAt: capture.update_time || new Date().toISOString(),
      verified: true,
    }

    // --- 金额核对：以 PayPal 实际扣款额为准 ---
    // 由于金额是服务端建单时算好并写进 PayPal 订单的，正常不会不一致；
    // 一旦不一致说明有人改过链路，必须人工介入，绝不能当成已付放行。
    if (currency !== 'USD' || !Number.isFinite(grossAmount) || Math.abs(grossAmount - orderTotalUsd) > 0.01) {
      const note = `⚠ PayPal 扣款金额异常：订单应为 USD ${orderTotalUsd}，实际扣款 ${currency} ${grossAmount}（capture ${capture.id}），请人工核对并处理退款或补款。`
      console.error(`[PayPal] ${note} order=${order.id}`)
      repo.orders.update(order.id, {
        paymentStatus: 'pending_verification',
        paypalTransaction,
        notes: ((order.notes || '') + '\n' + note).trim(),
      } as any)
      return NextResponse.json(
        { status: 'AMOUNT_MISMATCH', error: 'Payment amount mismatch, please contact support', captureId: capture.id },
        { status: 400 }
      )
    }

    // --- 确认收款并落库 ---
    repo.orders.update(order.id, {
      paymentStatus: 'paid',
      paymentMethod: 'paypal',
      paypalTransaction,
    } as any)

    // --- 统一收尾：归因转化 / 扣库存 / 核销优惠券 / 发确认邮件 ---
    let welcomeCouponUserId: string | undefined
    let welcomeCouponCode: string | undefined
    if (order.couponCode) {
      try {
        const coupon = getCouponByCode(String(order.couponCode))
        if (coupon && coupon.kind === 'welcome') {
          const userAuth = requireUser(req)
          if ('user' in userAuth) {
            welcomeCouponUserId = userAuth.user.id
            welcomeCouponCode = coupon.code
          }
        }
      } catch {
        // 拿不到用户不影响收款，券的一致性由 incrementCouponUsed 兜底
      }
    }

    try {
      finalizePaidOrder(order, {
        couponCode: order.couponCode,
        welcomeCouponUserId,
        welcomeCouponCode,
        markReferralConversion: true,
        deductStock: true,
        consumeCoupon: true,
        sendEmail: true,
      })
    } catch (e) {
      // 收尾失败不回滚收款状态：钱已收到，订单必须显示已支付
      console.error('[PayPal] 收款后收尾失败:', e)
    }

    return NextResponse.json({
      status: 'COMPLETED',
      orderId: order.id,
      id: captureData.id,
      captureId: capture.id,
      transactionId: capture.id,
      amount: grossAmount,
      fee: feeAmount,
      netAmount,
      currency,
      createTime: paypalTransaction.createdAt,
      updateTime: paypalTransaction.updatedAt,
    })
  } catch (e: any) {
    console.error('[PayPal] capture-paypal-order 异常:', e)
    return NextResponse.json({ error: 'Capture failed' }, { status: 500 })
  }
}
