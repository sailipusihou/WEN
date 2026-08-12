import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const repo = getRepository()
  const user = repo.users.getByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  const allOrders = repo.orders.list()
  const userOrders = allOrders.filter(o =>
    (o.userEmail && o.userEmail.toLowerCase() === user.email.toLowerCase()) ||
    (o.shipping && (o.shipping as any).email && (o.shipping as any).email.toLowerCase() === user.email.toLowerCase())
  )
  return NextResponse.json(userOrders)
}

