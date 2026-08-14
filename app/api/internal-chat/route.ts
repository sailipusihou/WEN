import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getClientIp, rateLimit } from '@/lib/auth'
import { validateString } from '@/lib/validation'
import { getRepository } from '@/lib/repository'

function getConversationId(staffId1: string, staffId2: string): string {
  const sorted = [staffId1, staffId2].sort()
  return `INTERNAL-${sorted[0]}-${sorted[1]}`
}

function getAdminAsStaff(repo: any) {
  const settings = repo.settings.get()
  return {
    id: 'main-admin',
    name: settings.adminUsername || 'Admin',
    email: settings.adminEmail || '',
    avatar: settings.adminAvatar || '',
    role: 'super_admin',
    active: true,
    password: '',
    createdAt: new Date().toISOString(),
    permissions: ['*'],
  }
}

function getAllStaffWithAdmin(repo: any) {
  const staff = repo.staff.list()
  const admin = getAdminAsStaff(repo)
  return [admin, ...staff.filter((s: any) => s.active)]
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const repo = getRepository()
    const currentUserId = auth.user.id
    const action = req.nextUrl.searchParams.get('action')
    const staffId = req.nextUrl.searchParams.get('staffId')
    const conversationId = req.nextUrl.searchParams.get('conversationId')

    if (action === 'staff') {
      const allStaff = getAllStaffWithAdmin(repo)
      const otherStaff = allStaff.filter((s: any) => s.id !== currentUserId)
      return NextResponse.json({ staff: otherStaff })
    }

    if (action === 'messages' && conversationId) {
      const all = repo.messages.list()
      const internalMsgs = all.filter((m: any) => {
        if (m.chatType !== 'internal') return false
        const convId = getConversationId(m.fromStaffId, m.toStaffId)
        return convId === conversationId
      })
      // 修复 H5: 校验当前用户是会话参与者之一, 防止员工枚举读取任意两人私聊
      const sample = internalMsgs[0]
      if (sample && sample.fromStaffId !== currentUserId && sample.toStaffId !== currentUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const sorted = [...internalMsgs].sort((a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      return NextResponse.json({ messages: sorted })
    }

    if (action === 'messages_with' && staffId) {
      const convId = getConversationId(currentUserId, staffId)
      const all = repo.messages.list()
      const internalMsgs = all.filter((m: any) => {
        if (m.chatType !== 'internal') return false
        const cId = getConversationId(m.fromStaffId, m.toStaffId)
        return cId === convId
      })
      const sorted = [...internalMsgs].sort((a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      let otherStaff = repo.staff.getById(staffId)
      if (!otherStaff && staffId === 'main-admin') {
        otherStaff = getAdminAsStaff(repo)
      }

      return NextResponse.json({
        conversationId: convId,
        otherStaff,
        messages: sorted,
      })
    }

    const all = repo.messages.list()
    const internalMsgs = all.filter((m: any) => m.chatType === 'internal')

    const conversations: Record<string, any[]> = {}
    for (const msg of internalMsgs) {
      const convId = getConversationId(msg.fromStaffId || '', msg.toStaffId || '')
      if (!conversations[convId]) {
        conversations[convId] = []
      }
      conversations[convId].push(msg)
    }

    const myConversations: any[] = []
    for (const [convId, msgs] of Object.entries(conversations)) {
      const hasMe = msgs.some((m: any) => m.fromStaffId === currentUserId || m.toStaffId === currentUserId)
      if (hasMe) {
        const otherMsg = msgs.find((m: any) => m.fromStaffId !== currentUserId || m.toStaffId !== currentUserId)
        const otherStaffId = otherMsg?.fromStaffId === currentUserId ? otherMsg?.toStaffId : otherMsg?.fromStaffId
        const sortedMsgs = [...msgs].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        const latest = sortedMsgs[0]
        const unreadCount = msgs.filter((m: any) => m.toStaffId === currentUserId && !m.read).length

        let otherStaff = null
        if (otherStaffId) {
          otherStaff = repo.staff.getById(otherStaffId)
          if (!otherStaff && otherStaffId === 'main-admin') {
            otherStaff = getAdminAsStaff(repo)
          }
        }

        myConversations.push({
          conversationId: convId,
          otherStaffId,
          otherStaff,
          latestMessage: latest,
          unreadCount,
          messageCount: msgs.length,
        })
      }
    }

    myConversations.sort((a, b) => new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime())

    return NextResponse.json({
      conversations: myConversations,
    })
  } catch {
    return NextResponse.json({ conversations: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const ip = getClientIp(req)
    if (!rateLimit('internal_chat:' + ip, 60, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many messages, please try again later' }, { status: 429 })
    }

    const body = await req.json()
    const { toStaffId, message, attachments, orderRef } = body

    if (!toStaffId || typeof toStaffId !== 'string') {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
    }
    if (!message || !validateString(message, 5000)) {
      return NextResponse.json({ error: 'Message is required and must be under 5000 characters' }, { status: 400 })
    }

    const repo = getRepository()

    let targetStaff = repo.staff.getById(toStaffId)
    if (!targetStaff && toStaffId === 'main-admin') {
      targetStaff = getAdminAsStaff(repo) as any
    }
    if (!targetStaff) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    const fromStaff = auth.user
    const fromStaffId = fromStaff.id

    const msg = repo.messages.add({
      chatType: 'internal',
      fromStaffId,
      toStaffId,
      fromName: fromStaff.name || 'Staff',
      toName: (targetStaff as any).name || 'Staff',
      fromAvatar: fromStaff.avatar || '',
      toAvatar: (targetStaff as any).avatar || '',
      message,
      attachments: attachments || [],
      orderRef: orderRef || null,
      read: false,
      senderType: 'admin',
      name: (targetStaff as any).name || '',
      email: (targetStaff as any).email || '',
      subject: 'Internal Message',
    } as any)

    return NextResponse.json(msg, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requireAdmin(req)
    if ('error' in auth) return auth.error

    const body = await req.json()
    const repo = getRepository()
    const currentUserId = auth.user.id

    if (body.action === 'mark_read' && body.conversationId) {
      const all = repo.messages.list()
      const internalMsgs = all.filter((m: any) =>
        m.chatType === 'internal' &&
        m.toStaffId === currentUserId
      )

      let count = 0
      for (const msg of internalMsgs) {
        const convId = getConversationId(msg.fromStaffId || '', msg.toStaffId || '')
        if (convId === body.conversationId && !msg.read) {
          repo.messages.update(msg.id, { read: true } as any)
          count++
        }
      }

      return NextResponse.json({ ok: true, count })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}
