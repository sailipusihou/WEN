import { NextRequest, NextResponse } from "next/server"
import { toPublicUser } from "@/lib/users"
import { getRepository } from "@/lib/repository"
import { requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'users_view')
  if ('error' in auth) return auth.error

  const repo = getRepository()
  const users = repo.users.list()
  const orders = repo.orders.list()
  
  const customers = users.map(u => {
    const userOrders = orders.filter((o: any) => {
      const email = o.email || o.shipping?.email || ""
      return email.toLowerCase() === u.email.toLowerCase()
    })
    return {
      ...toPublicUser(u),
      orderCount: userOrders.length,
      totalSpent: userOrders.reduce((s: number, o: any) => s + (o.total || 0), 0),
    }
  })
  
  // Also include guest customers (people who ordered but didn't register)
  const registeredEmails = new Set(users.map(u => u.email.toLowerCase()))
  const guestOrders: Record<string, any[]> = {}
  orders.forEach((o: any) => {
    const email = (o.email || o.shipping?.email || "").toLowerCase()
    if (email && !registeredEmails.has(email)) {
      if (!guestOrders[email]) guestOrders[email] = []
      guestOrders[email].push(o)
    }
  })
  
  Object.entries(guestOrders).forEach(([email, ords]) => {
    customers.push({
      id: "guest-" + email.replace(/[^a-z0-9]/g, "-"),
      email,
      firstName: ords[0]?.shipping?.firstName || "",
      lastName: ords[0]?.shipping?.lastName || "",
      phone: ords[0]?.shipping?.phone || "",
      addresses: [],
      createdAt: ords[0]?.createdAt || ords[0]?.date || "",
      orderCount: ords.length,
      totalSpent: ords.reduce((s: number, o: any) => s + (o.total || 0), 0),
    })
  })

  return NextResponse.json(customers)
}
