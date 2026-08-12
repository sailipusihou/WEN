import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requirePermission, requireUser, rateLimit, getClientIp } from '@/lib/auth'
import { validateEmail, sanitizeString, validateString } from '@/lib/validation'
import { getRepository } from '@/lib/repository'

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email')
    const repo = getRepository()
    const all = repo.messages.list()

    if (email) {
      const userAuth = requireUser(req)
      const adminAuth = requireAdmin(req)
      if ('error' in userAuth && 'error' in adminAuth) {
        return userAuth.error
      }
      if ('user' in userAuth && 'error' in adminAuth) {
        if (userAuth.user.email.toLowerCase() !== email.toLowerCase()) {
          return NextResponse.json({ error: 'Forbidden: can only view your own messages' }, { status: 403 })
        }
      }
      return NextResponse.json(all.filter((m: any) => m.email === email))
    }

    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error
    return NextResponse.json(all)
  }
  catch { return NextResponse.json([]) }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_reply')
    if ('error' in auth) {
      const userAuth = requireUser(req)
      if ('error' in userAuth) return auth.error
      const body = await req.json()
      const repo = getRepository()
      if (body.markAdminRead && body.email) {
        const all = repo.messages.list()
        const adminMsgs = all.filter((m: any) => m.email === body.email && m.senderType === 'admin' && !m.adminRead)
        for (const m of adminMsgs) {
          repo.messages.update(m.id, { adminRead: true })
        }
        return NextResponse.json({ ok: true, count: adminMsgs.length })
      }
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    const body = await req.json()
    const repo = getRepository()
    const existing = repo.messages.getById(body.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.adminReply !== undefined && body.adminReply !== '') {
      const newMsg = repo.messages.add({
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        subject: existing.subject,
        message: body.adminReply,
        source: existing.source,
        attachments: [],
        adminReply: '',
        adminAttachments: body.adminAttachments || [],
        adminName: body.adminName || '',
        adminAvatar: body.adminAvatar || '',
        repliedAt: new Date().toISOString(),
        read: true,
        replied: false,
        senderType: 'admin',
      })
      repo.messages.update(body.id, { replied: true, read: true })
      return NextResponse.json(newMsg)
    }

    const allowed = ['read', 'replied', 'reply', 'replyText', 'status', 'adminReply', 'repliedAt', 'adminAttachments', 'adminName', 'adminAvatar', 'adminRead']
    const updates: any = {}
    for (const f of allowed) {
      if (body[f] !== undefined) updates[f] = body[f]
    }
    const updated = repo.messages.update(body.id, updates)
    return NextResponse.json(updated)
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 400 }) }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!rateLimit('message_post:' + ip, 10, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many messages, please try again later' }, { status: 429 })
    }
    const body = await req.json()

    if (body.email && !validateEmail(body.email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (body.message && !validateString(body.message, 10000)) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }
    if (body.name && !validateString(body.name, 100)) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 })
    }

    const repo = getRepository()
    const msg = repo.messages.add({
      ...body,
      name: body.name ? sanitizeString(body.name) : '',
      message: body.message ? sanitizeString(body.message) : '',
      read: false,
      replied: false,
      attachments: body.attachments || [],
      avatar: body.avatar || undefined,
    })
    return NextResponse.json(msg, { status: 201 })
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 400 }) }
}
