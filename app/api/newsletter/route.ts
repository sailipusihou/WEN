import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/auth'
import { validateEmail, sanitizeString, validateString } from '@/lib/validation'
import { getRepository } from '@/lib/repository'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!rateLimit('newsletter:' + ip, 5, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts, please try again later' }, { status: 429 })
    }

    const { email, source = 'footer' } = await req.json()

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    if (!validateString(source, 50)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }

    const repo = getRepository()
    const normalized = email.toLowerCase().trim()
    const cleanSource = sanitizeString(source)

    const existing = repo.newsletter.getByEmail(normalized)
    if (existing) {
      return NextResponse.json({ ok: true, message: 'You are already subscribed' })
    }

    repo.newsletter.add(normalized, cleanSource)

    return NextResponse.json({ ok: true, message: 'Subscribed successfully' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}
