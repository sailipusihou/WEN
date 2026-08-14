import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@/lib/users'
import { hashPassword, toPublicUser, generateToken } from '@/lib/users'
import { getRepository } from '@/lib/repository'
import { sendEmail, buildWelcomeEmail } from '@/lib/email'
import { rateLimit, getClientIp } from '@/lib/auth'
import { validateEmail, sanitizeString, validateString } from '@/lib/validation'
import { getAllCoupons } from '@/lib/promotions'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!rateLimit('register:' + ip, 5, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts, please try again later' }, { status: 429 })
    }

    const { email, password, firstName, lastName } = await req.json()
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }
    if (password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be 6-128 characters' }, { status: 400 })
    }
    if (!validateString(firstName, 50) || !validateString(lastName, 50)) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 })
    }
    const repo = getRepository()
    if (repo.users.getByEmail(email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    const { hash, salt } = hashPassword(password)
    const token = generateToken()
    const userData: User = {
      id: 'USR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      email: email.toLowerCase().trim(),
      passwordHash: hash, salt,
      firstName: sanitizeString(firstName), lastName: sanitizeString(lastName),
      phone: '', addresses: [], token,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    const user = repo.users.add(userData)
    // Issue a welcome coupon to new registrations if an active welcome coupon exists
    let welcomeCoupon: any = null
    const welcome = getAllCoupons().find(c => c.kind === 'welcome' && c.active)
    if (welcome) {
      const now = Date.now()
      welcomeCoupon = {
        code: welcome.code,
        name: welcome.name,
        discountType: welcome.discountType,
        value: welcome.value,
        minSpend: welcome.minSpend,
        maxDiscount: welcome.maxDiscount,
        issuedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + welcome.validDays * 24 * 3600 * 1000).toISOString(),
        used: false,
      }
      repo.users.update(user.id, { coupons: [welcomeCoupon] })
    }
    const res = NextResponse.json({ user: toPublicUser(user), welcomeCoupon }, { status: 201 })
    res.cookies.set('user_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
    const welcomeEmail = buildWelcomeEmail(firstName)
    sendEmail({ to: email, ...welcomeEmail }).then(result => {
      if (!result.success) console.warn('[Register] Welcome email not sent:', result.error)
    })
    return res
  } catch { return NextResponse.json({ error: 'Registration failed' }, { status: 500 }) }
}
