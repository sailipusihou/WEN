import { NextRequest, NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"
import { requireAdmin } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req)
  if ('error' in auth) return auth.error

  const repo = getRepository()
  const settings = repo.settings.get()
  const minutes = settings.autoConfirmMinutes
  if (!minutes || minutes <= 0) return NextResponse.json({ autoConfirmed: 0, message: "Auto-confirm disabled" })

  const now = Date.now()
  const threshold = minutes * 60 * 1000
  // 修复 H3(部分): 未支付订单超过 3 天自动取消 (Payoneer 支付前建单不再无限堆积)
  const UNPAID_CANCEL_MS = 3 * 24 * 60 * 60 * 1000
  const orders = repo.orders.list()
  let count = 0
  let cancelled = 0

  orders.forEach(o => {
    if (o.status === "pending") {
      // 修复 H1: 仅自动确认已支付订单 (服务端验证过的 PayPal 或标记 paid), 防止未支付订单被自动确认并发货
      const paid = o.paymentStatus === 'paid' || o.paypalTransaction?.verified === true
      const created = new Date(o.createdAt).getTime()
      if (!paid) {
        if (now - created >= UNPAID_CANCEL_MS) {
          repo.orders.update(o.id, { status: "cancelled" as any, statusNote: 'Auto-cancelled: unpaid for 3 days' } as any)
          cancelled++
        }
        return
      }
      if (now - created >= threshold) {
        repo.orders.update(o.id, { status: "confirmed" as any })
        count++
      }
    }
  })

  return NextResponse.json({ autoConfirmed: count, autoCancelled: cancelled })
}
