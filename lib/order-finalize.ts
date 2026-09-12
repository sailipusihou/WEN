// 订单「付款成功后」的收尾动作集合。
//
// 背景：本站有两条最终会「确认已收款」的路径
//   1) Payoneer / 线下转账 —— 管理员在后台手动确认（app/api/payoneer/transactions）
//   2) PayPal —— 服务端 capture 成功后立即确认（app/api/capture-paypal-order）
// 两者的收尾动作完全一致：归因转化、扣库存、核销优惠券、发确认邮件。
// 放在这里统一实现，避免两处逻辑漂移。
//
// 注意：app/api/orders 的历史内联逻辑暂未迁移（那是当前正常收款的路径，
// 不做无谓改动）；本模块服务于新的 PayPal 先建单后扣款流程。
import { getRepository } from '@/lib/repository'
import { deductStockForOrder } from '@/lib/stock'
import { incrementCouponUsed } from '@/lib/promotions'
import { findAttributableReferralClick, markTouchpointsAsConverted } from '@/lib/referral-tracking'
import { sendEmail, buildOrderConfirmationEmail } from '@/lib/email'
import type { Order } from '@/lib/orders'

/** 解析订单应归属到哪一次推荐点击（原为 app/api/orders/route.ts 的局部函数，此处上移共享） */
export function resolveOrderReferralAttribution(order: Order, visitorId: string | undefined, settings: any) {
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

/** 归因转化：把订单计入推荐/广告归因，并把触点标记为已转化（会直接改 order 对象） */
export function maybeMarkOrderReferralConversion(order: Order, visitorId: string | undefined, settings: any) {
  const attribution = resolveOrderReferralAttribution(order, visitorId, settings)
  if (attribution) {
    order.attributionClickId = attribution.click.id
    order.attributionModel = attribution.model as 'last_click' | 'first_click'
    order.attributionTouchpoints = attribution.totalTouchpointsCount || attribution.touchpoints?.length || 1
    order.attributionLookbackDays = attribution.lookbackDays
    order.attributionMatchedBy = attribution.matchedBy as 'visitor' | 'referral_code'
    order.attributionFallbackUsed = attribution.fallbackUsed

    if (attribution.touchpoints && Array.isArray(attribution.touchpoints)) {
      markTouchpointsAsConverted(attribution.touchpoints, order.id, order.total || 0)
    } else {
      markTouchpointsAsConverted([{ click: attribution.click, weight: 1.0 }], order.id, order.total || 0)
    }
    return attribution
  }
  return undefined
}

export interface FinalizeOptions {
  /** 下单时使用的优惠码（核销计数 +1） */
  couponCode?: string
  /** welcome 券持有者（登录用户 id），用于把其账户里的券实例标记为已用 */
  welcomeCouponUserId?: string
  welcomeCouponCode?: string
  /** 是否做推荐归因转化（仅真实付款的订单才计入） */
  markReferralConversion?: boolean
  /** 是否扣减库存 */
  deductStock?: boolean
  /** 是否核销优惠券 */
  consumeCoupon?: boolean
  /** 是否发送订单确认邮件 */
  sendEmail?: boolean
}

/**
 * 订单付款确认后的统一收尾。
 * order 必须已经存在于仓储中（调用方负责落库），本函数只做后续副作用。
 */
export function finalizePaidOrder(order: Order, opts: FinalizeOptions = {}): void {
  const repo = getRepository()
  const settings = repo.settings.get()

  // --- 1. 归因转化 ---
  if (opts.markReferralConversion !== false && order.referralCode) {
    try {
      maybeMarkOrderReferralConversion(order, order.referralVisitorId, settings)
      // 归因字段是直接改在对象上的，需要回写（订单此时已落库）
      repo.orders.update(order.id, {
        attributionClickId: order.attributionClickId,
        attributionModel: order.attributionModel,
        attributionTouchpoints: order.attributionTouchpoints,
        attributionLookbackDays: order.attributionLookbackDays,
        attributionMatchedBy: order.attributionMatchedBy,
        attributionFallbackUsed: order.attributionFallbackUsed,
      } as any)
    } catch (e) {
      console.warn('[OrderFinalize] 归因转化失败:', e)
    }
  }

  // --- 2. 扣减库存（不足不阻断交易，只在订单备注上提示）---
  if (opts.deductStock !== false) {
    try {
      const stockResult = deductStockForOrder(order)
      if (stockResult.shortfall.length > 0) {
        const note = `⚠ 库存不足: ${stockResult.shortfall.join('; ')}`
        const current = repo.orders.getById(order.id)
        repo.orders.update(order.id, {
          notes: ((current?.notes || order.notes || '') + '\n' + note).trim(),
        })
        console.warn(`[OrderFinalize] ${note} (order ${order.id})`)
      }
    } catch (e) {
      console.warn('[OrderFinalize] 扣库存失败:', e)
    }
  }

  // --- 3. 核销优惠券 ---
  if (opts.consumeCoupon !== false && opts.couponCode) {
    try {
      incrementCouponUsed(opts.couponCode)
    } catch (e) {
      console.warn('[OrderFinalize] 优惠券核销失败:', e)
    }

    // welcome 券：同步把持有者账户里的那张券标记为已用，防止重复使用
    if (opts.welcomeCouponUserId && opts.welcomeCouponCode) {
      try {
        const holder = repo.users.getById(opts.welcomeCouponUserId)
        if (holder) {
          const coupons = (holder.coupons || []).map((uc: any) =>
            String(uc.code).toLowerCase() === opts.welcomeCouponCode!.toLowerCase()
              ? { ...uc, used: true }
              : uc
          )
          repo.users.update(opts.welcomeCouponUserId, { coupons })
        }
      } catch {
        console.warn('[OrderFinalize] welcome 券标记失败:', opts.welcomeCouponCode)
      }
    }
  }

  // --- 4. 订单确认邮件（失败不影响主流程）---
  if (opts.sendEmail !== false && order.customerEmail) {
    try {
      const confirmEmail = buildOrderConfirmationEmail(
        order.customerName || 'Customer',
        order.id,
        order.total,
        Array.isArray((order as any).items) ? (order as any).items.length : 0
      )
      sendEmail({ to: order.customerEmail, ...confirmEmail }).then((result: any) => {
        if (!result?.success) console.warn('[OrderFinalize] 确认邮件未发送:', result?.error)
      })
    } catch (e) {
      console.warn('[OrderFinalize] 确认邮件构造失败:', e)
    }
  }
}
