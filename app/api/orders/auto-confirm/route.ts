import { NextRequest, NextResponse } from "next/server"
import { getRepository } from "@/lib/repository"
import { requireAdmin } from "@/lib/auth"

// 修复 M19: GET 触发批量写改为 POST (无 UI 调用方, 防止 CSRF 式触发)
export async function POST(req: NextRequest) {
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
        // 关键：pending_verification 表示「客户很可能已经付了款，只是服务端当时无法核验」
        // （PayPal 接口超时等）。这类订单绝不能当作未支付自动取消——否则真付了钱的
        // 客户会被静默取消且永不发货。它们必须留给人工核对处理。
        if (o.paymentStatus === 'pending_verification') {
          console.warn(`[auto-confirm] 订单 ${o.id} 处于待人工核验状态，跳过自动取消`)
          return
        }
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
