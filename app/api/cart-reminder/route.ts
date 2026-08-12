import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

// 简易内存限频：同一邮箱/IP 每小时最多 3 封，防止接口被滥用发垃圾邮件
const rateMap = new Map<string, number[]>()
function allowSend(key: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const hits = (rateMap.get(key) || []).filter(t => now - t < windowMs)
  if (hits.length >= 3) {
    rateMap.set(key, hits)
    return false
  }
  hits.push(now)
  rateMap.set(key, hits)
  return true
}

export async function POST(req: NextRequest) {
  try {
    // 安全校验：邮箱、购物车参数、限频（防止接口被滥用发垃圾邮件）
    const { email, items, total } = await req.json()
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'Invalid cart items' }, { status: 400 })
    }
    if (!Number.isFinite(total) || Number(total) < 0 || Number(total) > 10000000) {
      return NextResponse.json({ error: 'Invalid total' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    if (!allowSend(`email:${email.toLowerCase()}`) || !allowSend(`ip:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests, please try later' }, { status: 429 })
    }

    const price = ((total || 0) / 100).toFixed(2)
    const htmlBacktick = String.fromCharCode(96)
    const html = htmlBacktick + '<div style=\"font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px\"><div style=\"text-align:center\"><span style=\"font-size:36px\">&#x1F6D2;</span><h1 style=\"font-size:22px;color:#1a1a2e\">You left something behind!</h1><p style=\"color:#666\">Your cart has ' + (items || 0) + ' items totaling $' + price + '.</p><a href=\"' + (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001') + '/cart\" style=\"display:inline-block;padding:12px 30px;background:#B8452E;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;margin-top:15px\">Complete Your Order</a></div></div>' + htmlBacktick
    const result = await sendEmail({ to: email, subject: 'Complete Your Order', html })
    if (result.success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: result.error }, { status: 500 })
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
