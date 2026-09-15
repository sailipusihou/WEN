import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { rateLimit, getClientIp } from '@/lib/auth'

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

export async function POST(req: NextRequest) {
  try {
    // 修复：本接口此前接受客户端任意 amount（可被用来在商家 PayPal 账户上乱建订单）。
    // 现在只接受 orderId，金额一律取服务端已核价并落库的订单总额。
    const ip = getClientIp(req)
    if (!rateLimit('paypal_create:' + ip, 10, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests, please try again later' }, { status: 429 })
    }

    const config = getPayPalConfig()
    if (!config.clientId || !config.secret) {
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 })
    }

    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const repo = getRepository()
    const existing = repo.orders.getById(String(orderId))
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (existing.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'This order has already been paid' }, { status: 400 })
    }

    const amount = Number(existing.total)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Order total is invalid' }, { status: 400 })
    }

    const res = await fetch(`${config.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(config.clientId + ':' + config.secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })
    const token = await res.json()
    if (!token.access_token) {
      return NextResponse.json({ error: 'PayPal authentication failed' }, { status: 502 })
    }

    const orderRes = await fetch(`${config.base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token.access_token,
        'Content-Type': 'application/json',
        // 幂等键按订单号固定：同一订单重复点击不会在 PayPal 侧产生多张订单
        'PayPal-Request-Id': `create-${existing.id}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amount.toFixed(2) },
          // 把站内订单号带进 PayPal，后台对账时能直接对应（此前交易记录里 orderId 一直是空的）
          custom_id: existing.id,
          invoice_id: existing.id,
          // GET_FROM_FILE：让 PayPal 自己收集/回传收货地址。
          // Express Checkout 在结算页最顶部，客户本来就没填我们的表单 ——
          // 由 PayPal 收地址、capture 时再写回站内订单，这才是"快捷结账"该有的行为。
          shipping_preference: 'GET_FROM_FILE',
        }],
      }),
      signal: AbortSignal.timeout(30000),
    })
    const order = await orderRes.json()
    if (!order.id) {
      console.error('[PayPal] 创建订单失败:', order)
      return NextResponse.json({ error: order.message || 'PayPal order creation failed' }, { status: 502 })
    }

    // 把 PayPal 订单号写回站内订单，capture 时据此反查，杜绝「无对应订单的扣款」
    repo.orders.update(existing.id, {
      paymentMethod: 'paypal',
      paypalTransaction: { ...((existing.paypalTransaction as any) || {}), paypalOrderId: order.id },
    } as any)

    return NextResponse.json({ id: order.id, orderId: existing.id, amount })
  } catch (e: any) {
    console.error('[PayPal] create-paypal-order 异常:', e)
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
  }
}
