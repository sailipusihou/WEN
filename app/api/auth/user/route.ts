import { NextRequest, NextResponse } from 'next/server'
import { toPublicUser } from '@/lib/users'
import { getRepository } from '@/lib/repository'
import { validateString, sanitizeString, validateId } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/auth'
import { getSettings, DEFAULTS } from '@/lib/settings'

function getUserByToken(token: string) {
  const repo = getRepository()
  return repo.users.getByToken(token)
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const user = getUserByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  
  const repo = getRepository()
  const customer = repo.customers.getByEmail(user.email)
  const settings = getSettings()
  const tiers = settings.customerTiers || DEFAULTS.customerTiers
  
  const tierInfo = tiers.find(t => t.id === customer?.tier) || tiers[0]
  
  return NextResponse.json({
    user: toPublicUser(user),
    customer: customer ? {
      tier: customer.tier,
      stars: customer.rating,
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      tierInfo,
    } : null,
    customerTiers: tiers,
  })
}

export async function PUT(req: NextRequest) {
  const ip = getClientIp(req)
  if (!rateLimit('user_profile:' + ip, 20, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const user = getUserByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const updates: any = {}
  if (body.firstName !== undefined) {
    if (!validateString(body.firstName, 50)) return NextResponse.json({ error: 'First name too long' }, { status: 400 })
    updates.firstName = sanitizeString(body.firstName)
  }
  if (body.lastName !== undefined) {
    if (!validateString(body.lastName, 50)) return NextResponse.json({ error: 'Last name too long' }, { status: 400 })
    updates.lastName = sanitizeString(body.lastName)
  }
  if (body.phone !== undefined) {
    if (!validateString(body.phone, 30)) return NextResponse.json({ error: 'Phone too long' }, { status: 400 })
    updates.phone = sanitizeString(body.phone)
  }
  if (body.avatar !== undefined) {
    if (!validateString(body.avatar, 500)) return NextResponse.json({ error: 'Avatar URL too long' }, { status: 400 })
    updates.avatar = sanitizeString(body.avatar)
  }
  if (body.dob !== undefined) {
    if (!validateString(body.dob, 20)) return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
    updates.dob = sanitizeString(body.dob)
  }
  if (body.gender !== undefined) {
    if (!validateString(body.gender, 20)) return NextResponse.json({ error: 'Invalid gender' }, { status: 400 })
    updates.gender = sanitizeString(body.gender)
  }
  if (body.bio !== undefined) {
    if (!validateString(body.bio, 500)) return NextResponse.json({ error: 'Bio too long' }, { status: 400 })
    updates.bio = sanitizeString(body.bio)
  }
  if (body.preferredCurrency !== undefined) {
    if (!validateString(body.preferredCurrency, 10)) return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    updates.preferredCurrency = sanitizeString(body.preferredCurrency)
  }

  const repo = getRepository()
  const updated = repo.users.update(user.id, updates)
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 400 })
  return NextResponse.json({ user: toPublicUser(updated) })
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!rateLimit('user_addr:' + ip, 20, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const user = getUserByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const label = body.label ? (validateString(body.label, 30) ? sanitizeString(body.label) : 'Home') : 'Home'
  const firstName = validateString(body.firstName, 50) ? sanitizeString(body.firstName) : ''
  const lastName = validateString(body.lastName, 50) ? sanitizeString(body.lastName) : ''
  const phone = validateString(body.phone, 30) ? sanitizeString(body.phone) : ''
  const address = validateString(body.address, 200) ? sanitizeString(body.address) : ''
  const city = validateString(body.city, 100) ? sanitizeString(body.city) : ''
  const state = validateString(body.state, 100) ? sanitizeString(body.state) : ''
  const zip = validateString(body.zip, 20) ? sanitizeString(body.zip) : ''
  const country = validateString(body.country, 100) ? sanitizeString(body.country) : 'United States'

  if (!address) return NextResponse.json({ error: 'Address is required' }, { status: 400 })

  const repo = getRepository()
  const addresses = user.addresses || []
  const newAddr = {
    id: 'ADDR-' + Date.now().toString(36).toUpperCase(),
    label, firstName, lastName, phone, address, city, state, zip, country,
    isDefault: !!body.isDefault,
  }
  let newAddresses = [...addresses]
  if (body.isDefault) {
    newAddresses = newAddresses.map(a => ({ ...a, isDefault: false }))
  }
  newAddresses.push(newAddr)
  const updated = repo.users.update(user.id, { addresses: newAddresses })
  if (!updated) return NextResponse.json({ error: 'Failed to add address' }, { status: 400 })
  return NextResponse.json({ address: newAddr, addresses: updated.addresses || [] })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const user = getUserByToken(token)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { addressId } = body
  if (!addressId || typeof addressId !== 'string' || !validateId(addressId)) {
    return NextResponse.json({ error: 'Valid address ID required' }, { status: 400 })
  }
  const addresses = user.addresses || []
  const newAddresses = addresses.filter(a => a.id !== addressId)
  if (newAddresses.length === addresses.length) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 })
  }
  const repo = getRepository()
  const updated = repo.users.update(user.id, { addresses: newAddresses })
  return NextResponse.json({ addresses: updated?.addresses || [] })
}
