import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.name || typeof body.value !== 'number') {
      return NextResponse.json({ error: 'Invalid metrics' }, { status: 400 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', body.name, body.value, body.rating, body.page)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}
