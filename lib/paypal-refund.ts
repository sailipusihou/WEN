// PayPal 退款的唯一实现。
//
// 背景（审查发现的两个问题）：
//   S6 部分退款被记成全退：旧代码无论退多少钱都把订单标成 refunded、
//      交易状态写成 REFUNDED，导致财务口径失真、少退的钱被当成已退清。
//   S7 两条退款路径其中一条根本不动钱：后台「退货 → 退款」只改了订单状态和
//      returnInfo.refundAmount，从未调用 PayPal；而真正调 PayPal 的入口在财务页。
//      运营在退货页点一次「退款」就会以为钱已经退了。
//
// 现在两条路径都走这里的 refundPayPalOrder()。
import { getRepository } from '@/lib/repository'
import { restoreStockForOrder } from '@/lib/stock'

export function getPayPalConfig() {
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

async function getAccessToken(): Promise<string | null> {
  const config = getPayPalConfig()
  if (!config.clientId || !config.secret) return null
  try {
    const res = await fetch(`${config.base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(config.clientId + ':' + config.secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json()
    return data.access_token || null
  } catch {
    return null
  }
}

export interface RefundResult {
  ok: boolean
  error?: string
  /** 是否通过 PayPal 真实退款（false 表示该订单没有 PayPal 交易，需人工线下退款） */
  viaPayPal: boolean
  refundId?: string
  /** 本次退款金额 */
  refundedAmount?: number
  /** 累计已退金额 */
  totalRefunded?: number
  /** 是否已全额退清 */
  fullyRefunded?: boolean
  orderTotal: number
}

/**
 * 对订单发起退款。
 * @param orderId  站内订单号
 * @param amount   本次退款金额；不传表示按订单总额全额退
 * @param note     给付款人的退款备注
 */
export async function refundPayPalOrder(
  orderId: string,
  amount?: number,
  note?: string
): Promise<RefundResult> {
  const repo = getRepository()
  const order = repo.orders.getById(orderId)
  if (!order) return { ok: false, error: 'Order not found', viaPayPal: false, orderTotal: 0 }

  const orderTotal = Number(order.total) || 0
  const txn: any = order.paypalTransaction || {}
  const captureId = txn.captureId

  const refundAmount = amount === undefined || amount === null || (amount as any) === ''
    ? orderTotal
    : Number(amount)
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return { ok: false, error: 'Invalid refund amount', viaPayPal: false, orderTotal }
  }

  // 累计已退（历史退款记录 + 本次）不得超过订单总额，防止重复退款
  const refunds: any[] = Array.isArray(txn.refunds) ? txn.refunds : []
  const alreadyRefunded = refunds.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0)
  // 兼容旧数据：只有单条 refundAmount 而没有 refunds 数组的情况
  const legacyRefunded = !refunds.length && Number(txn.refundAmount) > 0 && txn.status === 'REFUNDED'
    ? Number(txn.refundAmount)
    : 0
  const priorRefunded = Math.max(alreadyRefunded, legacyRefunded)

  if (priorRefunded + refundAmount > orderTotal + 0.01) {
    return {
      ok: false,
      error: `Refund exceeds order total: already refunded ${priorRefunded.toFixed(2)}, this request ${refundAmount.toFixed(2)}, order total ${orderTotal.toFixed(2)}`,
      viaPayPal: false,
      orderTotal,
      totalRefunded: priorRefunded,
    }
  }

  // 没有 PayPal 交易（如 Payoneer 线下转账）→ 无法通过 API 退款，交给人工
  if (!captureId) {
    const recorded = applyRefundRecord(orderId, {
      amount: refundAmount,
      note: note || 'Manual refund (no PayPal capture)',
      viaPayPal: false,
      refundId: undefined,
      priorRefunded,
      orderTotal,
    })
    return {
      ok: true,
      viaPayPal: false,
      refundedAmount: refundAmount,
      totalRefunded: recorded.totalRefunded,
      fullyRefunded: recorded.fullyRefunded,
      orderTotal,
    }
  }

  const accessToken = await getAccessToken()
  if (!accessToken) {
    return { ok: false, error: 'PayPal authentication failed', viaPayPal: false, orderTotal, totalRefunded: priorRefunded }
  }

  const config = getPayPalConfig()
  // 幂等键按「第几次退款」固定：重复点击会用同一个键拿到同一笔退款，
  // 而不是像旧代码那样拼 Date.now() 造成每次都是新请求（可重复退款）。
  const attempt = refunds.length + 1
  const response = await fetch(
    `${config.base}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `refund-${orderId}-${attempt}`,
      },
      body: JSON.stringify({
        amount: { value: refundAmount.toFixed(2), currency_code: order.currency || 'USD' },
        note_to_payer: note || 'Refund for return',
      }),
      signal: AbortSignal.timeout(30000),
    }
  )
  const refundData = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      ok: false,
      error: refundData?.message || 'PayPal refund failed',
      viaPayPal: true,
      orderTotal,
      totalRefunded: priorRefunded,
    }
  }

  const recorded = applyRefundRecord(orderId, {
    amount: refundAmount,
    note: note || 'Refund processed via PayPal',
    viaPayPal: true,
    refundId: refundData.id,
    priorRefunded,
    orderTotal,
  })

  return {
    ok: true,
    viaPayPal: true,
    refundId: refundData.id,
    refundedAmount: refundAmount,
    totalRefunded: recorded.totalRefunded,
    fullyRefunded: recorded.fullyRefunded,
    orderTotal,
  }
}

/** 把退款如实记账：只有全额退清才把订单状态置为 refunded */
function applyRefundRecord(
  orderId: string,
  info: { amount: number; note: string; viaPayPal: boolean; refundId?: string; priorRefunded: number; orderTotal: number }
) {
  const repo = getRepository()
  const order = repo.orders.getById(orderId)!
  const txn: any = order.paypalTransaction || {}

  const totalRefunded = Math.round((info.priorRefunded + info.amount) * 100) / 100
  const fullyRefunded = totalRefunded >= info.orderTotal - 0.01

  const refundEntry = {
    refundId: info.refundId,
    amount: info.amount,
    at: new Date().toISOString(),
    viaPayPal: info.viaPayPal,
    note: info.note,
  }
  const refunds = [...(Array.isArray(txn.refunds) ? txn.refunds : []), refundEntry]

  repo.orders.update(orderId, {
    // 关键修复：部分退款不再把订单标成已退款/已退清
    status: (fullyRefunded ? 'refunded' : order.status) as any,
    paypalTransaction: {
      ...txn,
      refunds,
      refundAmount: totalRefunded,
      refundId: info.refundId || txn.refundId,
      status: fullyRefunded ? 'REFUNDED' : txn.status,
    } as any,
    returnInfo: {
      ...(order.returnInfo || { reason: 'Refund processed', requestedAt: new Date().toISOString() }),
      refundedAt: new Date().toISOString(),
      refundAmount: totalRefunded,
      fullyRefunded,
      partial: !fullyRefunded,
    },
    statusHistory: [
      ...(order.statusHistory || []),
      {
        status: (fullyRefunded ? 'refunded' : order.status) as any,
        timestamp: new Date().toISOString(),
        note: `${info.viaPayPal ? 'PayPal' : '线下'}退款 USD ${info.amount.toFixed(2)}（累计 ${totalRefunded.toFixed(2)} / 订单 ${info.orderTotal.toFixed(2)}）${info.note ? '：' + info.note : ''}`,
      },
    ],
  } as any)

  // 修复 #8: 全额退清时把库存加回去（旧代码只有扣减没有回补，退款会造成库存虚耗）。
  // 用 returnInfo.stockRestored 标记，保证只回补一次。
  let stockNote = ''
  if (fullyRefunded && !(order.returnInfo as any)?.stockRestored) {
    try {
      const { deducted } = restoreStockForOrder(order)
      repo.orders.update(orderId, {
        returnInfo: {
          ...((repo.orders.getById(orderId)?.returnInfo) || {}),
          stockRestored: true,
        },
      } as any)
      stockNote = `，已回补库存 ${deducted} 件`
    } catch (e) {
      console.warn('[Refund] 回补库存失败:', e)
    }
  }

  return { totalRefunded, fullyRefunded, stockNote }
}