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
  const orders = repo.orders.list()
  let count = 0

  orders.forEach(o => {
    if (o.status === "pending") {
      const created = new Date(o.createdAt).getTime()
      if (now - created >= threshold) {
        repo.orders.update(o.id, { status: "confirmed" as any })
        count++
      }
    }
  })

  return NextResponse.json({ autoConfirmed: count })
}
