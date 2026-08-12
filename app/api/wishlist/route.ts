import { NextRequest, NextResponse } from 'next/server'
import { toPublicUser } from '@/lib/users'
import { getRepository } from '@/lib/repository'
import { rateLimit, getClientIp } from '@/lib/auth'
import { validateId } from '@/lib/validation'

function getUserByToken(token: string) {
  const repo = getRepository()
  return repo.users.getByToken(token)
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const user = getUserByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ ids: user.wishlist || [] })
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!rateLimit('wishlist:' + ip, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const user = getUserByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { productId } = body
  if (!productId || typeof productId !== 'string' || !validateId(productId)) {
    return NextResponse.json({ error: 'Valid product ID required' }, { status: 400 })
  }
  const wishlist = user.wishlist || []
  if (wishlist.length >= 500) {
    return NextResponse.json({ error: 'Wishlist is full (max 500 items)' }, { status: 400 })
  }
  if (!wishlist.includes(productId)) { wishlist.push(productId) }
  const repo = getRepository()
  repo.users.update(user.id, { wishlist })
  return NextResponse.json({ ids: wishlist })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const user = getUserByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { productId } = body
  if (!productId || typeof productId !== 'string' || !validateId(productId)) {
    return NextResponse.json({ error: 'Valid product ID required' }, { status: 400 })
  }
  const wishlist = (user.wishlist || []).filter((id: string) => id !== productId)
  const repo = getRepository()
  repo.users.update(user.id, { wishlist })
  return NextResponse.json({ ids: wishlist })
}
