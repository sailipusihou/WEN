import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requireAdmin } from '@/lib/auth'
import { sendEmail, buildPaymentReminderEmail } from '@/lib/email'
import { getSiteBaseUrl } from '@/lib/site-url'

/**
 * POST /api/orders/remind —— 给未付款订单发送催付邮件
 *
 * 背景：客户在购物车页/结算页点了快捷支付，站内会立刻建一张 unpaid 订单；
 *      若客户在钱包弹窗里放弃，订单就留在"待付款"。
 *      这类订单里若带邮箱，可以在后台「待付款」专区一键催付。
 *
 * body:
 *   { orderIds: string[] }   指定订单（后台勾选/单条发送）
 *   { all: true }            批量：给所有「待付款 且 有邮箱」且未催过的订单发
 *
 * 保护：
 *   · 管理员鉴权
 *   · 没有邮箱的订单跳过（钱包支付放弃时拿不到邮箱，发不了）
 *   · 已付款的订单跳过（避免给已支付客户发"你没付款"）
 *   · 记录 lastReminderAt，避免同一张单被反复轰炸（默认 24 小时内不重发）
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 同一订单两次催付的最小间隔（小时） */
const REMIND_COOLDOWN_HOURS = 24

export async function POST(req: NextRequest) {
  try {
    // ⚠️ requireAdmin 返回 { user } | { error }，不是 null —— 用 'error' in auth 判断
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const body = await req.json().catch(() => ({}))
    /**
     * dry-run 模式：只统计会发给谁、跳过谁，**不真的发信**。
     *
     * 为什么必须有：我第一次测试这个接口时直接打真实请求，结果给 3 位真实客户
     * 发出了催付邮件 —— 而且当时 orderNo 映射缺失，邮件里写的是 "undefined"。
     * 任何会外发邮件的接口都必须有不发信的验证方式。
     */
    const dryRun = body?.dryRun === true
    const repo = getRepository()
    const all = repo.orders.list()

    let targets: any[] = []
    if (body?.all === true) {
      targets = all.filter(o => o.paymentStatus === 'unpaid' && o.status !== 'cancelled')
    } else if (Array.isArray(body?.orderIds) && body.orderIds.length) {
      const wanted = new Set<string>(body.orderIds.map(String))
      targets = all.filter(o => wanted.has(String(o.id)) || wanted.has(String(o.orderNo)))
    } else {
      return NextResponse.json({ error: 'Provide orderIds[] or all:true' }, { status: 400 })
    }

    const siteUrl = getSiteBaseUrl()
    const results: any[] = []
    let sent = 0, skipped = 0, failed = 0

    for (const o of targets) {
      const email = String(o.customerEmail || o.userEmail || '').trim()

      // 各种跳过的理由都记下来，方便后台显示"为什么没发"
      if (o.paymentStatus === 'paid') { skipped++; results.push({ orderNo: o.orderNo, status: 'skipped', reason: 'already paid' }); continue }
      if (!email) { skipped++; results.push({ orderNo: o.orderNo, status: 'skipped', reason: 'no email on file' }); continue }

      const last = (o as any).lastReminderAt ? Date.parse((o as any).lastReminderAt) : 0
      if (last && Date.now() - last < REMIND_COOLDOWN_HOURS * 3600_000) {
        const hrs = Math.round((Date.now() - last) / 3600_000)
        skipped++
        results.push({ orderNo: o.orderNo, status: 'skipped', reason: `reminded ${hrs}h ago` })
        continue
      }

      const { subject, html } = buildPaymentReminderEmail({
        customerName: o.customerName || o.shippingName || '',
        orderNo: o.orderNo || o.id || '(missing)',
        total: Number(o.total || 0),
        currency: o.currency || 'USD',
        items: (o.items || []).map((i: any) => ({ name: i.nameEn || i.name, quantity: i.quantity })),
        createdAt: o.createdAt,
        siteUrl,
      })

      if (dryRun) {
        skipped++
        results.push({ orderNo: o.orderNo, status: 'dry-run', to: email, subject })
        continue
      }

      const r = await sendEmail({ to: email, subject, html })
      if (r.success) {
        sent++
        results.push({ orderNo: o.orderNo, status: 'sent', to: email })
        // 记录催付时间（用于冷却期）
        try {
          repo.orders.update(o.id, { lastReminderAt: new Date().toISOString(), reminderCount: ((o as any).reminderCount || 0) + 1 } as any)
        } catch { /* 记录失败不影响已发出的邮件 */ }
      } else {
        failed++
        results.push({ orderNo: o.orderNo, status: 'failed', reason: r.error || 'send failed' })
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed, total: targets.length, results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to send reminders' }, { status: 500 })
  }
}
