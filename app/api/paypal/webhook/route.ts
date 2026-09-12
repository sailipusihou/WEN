import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { getSettings } from '@/lib/settings'
import { finalizePaidOrder } from '@/lib/order-finalize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PayPal Webhook 接收端。
 *
 * 为什么必须有它：此前收款只靠「用户付款后浏览器跳回本站」来确认，
 * 会漏掉这些情况——
 *   · 用户批准付款后直接关掉页面 / 断网 → 钱扣了，本站永远不会去 capture，
 *     订单一直挂在 unpaid；
 *   · PayPal 侧发生退款 / 争议 / 撤销 → 本站完全不知情，仍显示已付款；
 *   · eCheck 等异步支付 → 永远停在未完成。
 * Webhook 由 PayPal 服务端直接推送，不依赖用户浏览器。
 *
 * 安全：必须用 PayPal 官方 verify-webhook-signature 接口验签，
 * 未配置 Webhook ID 时一律拒绝（安全默认值），与 Meta webhook 的处理一致。
 */

function getPayPalConfig() {
  try {
    const repo = getRepository()
    const settings = repo.settings.get()
    const env = settings.paypalEnv || process.env.PAYPAL_ENV || 'sandbox'
    const dbEnabled = settings.paypalEnabled && settings.paypalClientId && settings.paypalClientSecret
    if (dbEnabled) {
      return {
        clientId: settings.paypalClientId,
        secret: settings.paypalClientSecret,
        base: env === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
      }
    }
    return {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      secret: process.env.PAYPAL_CLIENT_SECRET || '',
      base: env === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
    }
  } catch {
    const env = process.env.PAYPAL_ENV || 'sandbox'
    return {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      secret: process.env.PAYPAL_CLIENT_SECRET || '',
      base: env === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
    }
  }
}

async function verifyWebhookSignature(req: NextRequest, rawBody: string, webhookId: string): Promise<boolean> {
  const config = getPayPalConfig()
  if (!config.clientId || !config.secret) {
    console.warn('[PayPal Webhook] 未配置 PayPal 凭据，无法验签')
    return false
  }

  const transmissionId = req.headers.get('paypal-transmission-id')
  const transmissionTime = req.headers.get('paypal-transmission-time')
  const certUrl = req.headers.get('paypal-cert-url')
  const authAlgo = req.headers.get('paypal-auth-algo')
  const transmissionSig = req.headers.get('paypal-transmission-sig')

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.warn('[PayPal Webhook] 缺少验签所需的请求头')
    return false
  }

  try {
    const authRes = await fetch(`${config.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(config.clientId + ':' + config.secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })
    const auth = await authRes.json()
    if (!auth.access_token) return false

    const verifyRes = await fetch(`${config.base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + auth.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
      signal: AbortSignal.timeout(20000),
    })
    const result = await verifyRes.json()
    return result?.verification_status === 'SUCCESS'
  } catch (e) {
    console.warn('[PayPal Webhook] 验签请求异常:', e)
    return false
  }
}

/** 从事件里尽力找出站内订单号（我们创建 PayPal 订单时写入了 custom_id / invoice_id） */
function extractOrderId(resource: any): string | undefined {
  if (!resource) return undefined
  const candidates = [
    resource.custom_id,
    resource.invoice_id,
    resource.purchase_units?.[0]?.custom_id,
    resource.purchase_units?.[0]?.invoice_id,
  ].filter(Boolean)
  return candidates.find((c: string) => String(c).startsWith('OTM-')) as string | undefined
}

/** 找出这笔事件关联的 PayPal 订单号与 capture 号 */
function extractIds(resource: any) {
  const paypalOrderId = resource?.supplementary_data?.related_ids?.order_id || undefined
  let captureId: string | undefined = undefined
  // resource 本身是 capture 时
  if (resource?.id && /^[A-Z0-9]{17}$/.test(String(resource.id))) captureId = String(resource.id)
  // refund 事件：从 links 里找上游 capture
  const links = Array.isArray(resource?.links) ? resource.links : []
  for (const l of links) {
    const href: string = l?.href || ''
    const m = href.match(/\/captures\/([A-Z0-9]+)/)
    if (m) { captureId = m[1]; break }
  }
  return { paypalOrderId, captureId }
}

function findOrderByPaypalOrderId(paypalOrderId: string) {
  try {
    return (getRepository().orders.list() as any[]).find(
      (o) => o?.paypalTransaction?.paypalOrderId && String(o.paypalTransaction.paypalOrderId) === String(paypalOrderId)
    )
  } catch {
    return undefined
  }
}

function findOrderByCaptureId(captureId: string) {
  try {
    return (getRepository().orders.list() as any[]).find(
      (o) => o?.paypalTransaction?.captureId && String(o.paypalTransaction.captureId) === String(captureId)
    )
  } catch {
    return undefined
  }
}

export async function POST(req: NextRequest) {
  let rawBody = ''
  try {
    rawBody = await req.text()
    const settings = getSettings() as any
    const webhookId = String(settings.paypalWebhookId || process.env.PAYPAL_WEBHOOK_ID || '').trim()

    if (!webhookId) {
      console.warn('[PayPal Webhook] 尚未配置 Webhook ID，按安全默认值拒绝该事件')
      return NextResponse.json({ error: 'PayPal webhook not configured' }, { status: 503 })
    }

    const verified = await verifyWebhookSignature(req, rawBody, webhookId)
    if (!verified) {
      console.warn('[PayPal Webhook] 验签失败，拒绝处理')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const event = JSON.parse(rawBody)
    const eventType: string = event.event_type || ''
    const resource = event.resource || {}
    console.log(`[PayPal Webhook] 收到已验证事件 ${eventType} (id=${event.id})`)

    const repo = getRepository()

    switch (eventType) {
      // ===== 收款成功 =====
      // 这是最重要的兜底：用户批准付款后没跳回本站时，靠它把订单补成已支付。
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const orderId = extractOrderId(resource)
        const { paypalOrderId, captureId } = extractIds(resource)
        const order = (orderId && repo.orders.getById(orderId)) || (paypalOrderId && findOrderByPaypalOrderId(paypalOrderId))

        const amount = parseFloat(resource?.amount?.value || '0')
        const currency = (resource?.amount?.currency_code || '').toUpperCase()

        if (!order) {
          // 找不到订单 = 有一笔钱进了账户却没有对应订单，必须人工介入
          console.error(
            `[PayPal Webhook] ⚠ 收到扣款但找不到对应订单：orderId=${orderId || '无'} paypalOrderId=${paypalOrderId || '无'} capture=${captureId || '无'} 金额=${currency} ${amount}`
          )
          break
        }

        if (order.paymentStatus === 'paid') break   // 幂等：已处理过

        const orderTotal = Number(order.total)
        if (currency !== 'USD' || !Number.isFinite(amount) || Math.abs(amount - orderTotal) > 0.01) {
          const note = `⚠ Webhook 收到扣款但金额不符：订单应为 USD ${orderTotal}，实际 ${currency} ${amount}（capture ${captureId || '未知'}），请人工核对。`
          console.error(`[PayPal Webhook] ${note} order=${order.id}`)
          repo.orders.update(order.id, {
            paymentStatus: 'pending_verification',
            notes: ((order.notes || '') + '\n' + note).trim(),
          } as any)
          break
        }

        repo.orders.update(order.id, {
          paymentStatus: 'paid',
          paymentMethod: 'paypal',
          paypalTransaction: {
            ...(order.paypalTransaction || {}),
            paypalOrderId: paypalOrderId || (order.paypalTransaction as any)?.paypalOrderId,
            captureId,
            transactionId: captureId,
            amount,
            currency,
            status: 'COMPLETED',
            verified: true,
            source: 'webhook',
          },
        } as any)

        try {
          finalizePaidOrder(order, {
            couponCode: order.couponCode,
            markReferralConversion: true,
            deductStock: true,
            consumeCoupon: true,
            sendEmail: true,
          })
        } catch (e) {
          console.error('[PayPal Webhook] 收款后收尾失败:', e)
        }

        console.log(`[PayPal Webhook] ✓ 订单 ${order.id} 已由 Webhook 补记为已支付`)
        break
      }

      // ===== 退款 =====
      case 'PAYMENT.CAPTURE.REFUNDED': {
        const { captureId } = extractIds(resource)
        const order = captureId ? findOrderByCaptureId(captureId) : undefined
        if (!order) {
          console.warn(`[PayPal Webhook] 退款事件找不到对应订单 capture=${captureId || '未知'}`)
          break
        }
        if (order.returnInfo?.refundedByWebhook) break

        const refundAmount = parseFloat(resource?.amount?.value || '0')
        const isFullRefund = Number.isFinite(refundAmount) && refundAmount > 0 && Math.abs(refundAmount - Number(order.total)) <= 0.01
        const note = isFullRefund
          ? `PayPal 已全额退款 USD ${refundAmount}（capture ${captureId}）`
          : `PayPal 已部分退款 USD ${refundAmount}（订单总额 USD ${order.total}，capture ${captureId}）`

        repo.orders.update(order.id, {
          // 部分退款不能把订单标成已全额退款，否则财务口径失真
          status: isFullRefund ? ('refunded' as any) : order.status,
          paymentStatus: isFullRefund ? ('refunded' as any) : (order.paymentStatus as any),
          returnInfo: { ...(order.returnInfo || {}), refundedByWebhook: true, refundAmount, refundedAt: new Date().toISOString(), partial: !isFullRefund },
          notes: ((order.notes || '') + '\n' + note).trim(),
        } as any)
        console.log(`[PayPal Webhook] 订单 ${order.id} ${note}`)
        break
      }

      // ===== 撤销 / 拒付（争议、退单）=====
      case 'PAYMENT.CAPTURE.REVERSED':
      case 'PAYMENT.CAPTURE.DENIED': {
        const { captureId } = extractIds(resource)
        const order = captureId ? findOrderByCaptureId(captureId) : undefined
        if (!order) {
          console.warn(`[PayPal Webhook] ${eventType} 找不到对应订单 capture=${captureId || '未知'}`)
          break
        }
        const note = `⚠ PayPal ${eventType === 'PAYMENT.CAPTURE.REVERSED' ? '撤销/退单' : '拒付'}（capture ${captureId}），请人工处理`
        console.warn(`[PayPal Webhook] ${note} order=${order.id}`)
        repo.orders.update(order.id, {
          paymentStatus: 'pending_verification',
          notes: ((order.notes || '') + '\n' + note).trim(),
        } as any)
        break
      }

      // ===== 仅记录，便于排查 =====
      case 'CHECKOUT.ORDER.APPROVED':
      case 'CHECKOUT.ORDER.COMPLETED':
      case 'PAYMENT.CAPTURE.PENDING': {
        console.log(`[PayPal Webhook] 事件 ${eventType} 已记录（无需变更订单）`)
        break
      }

      default:
        console.log(`[PayPal Webhook] 未处理的事件类型: ${eventType}`)
    }

    // PayPal 要求 2xx，否则会重试
    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[PayPal Webhook] 处理异常:', e)
    // 仍返回 200 避免 PayPal 无意义重试把日志刷爆（异常已落日志）
    return NextResponse.json({ received: true })
  }
}
