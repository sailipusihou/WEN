import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { getNotifications, getUnreadCount, markAsRead, checkAll } from '@/lib/ai-notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'ai_assistant')
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const check = searchParams.get('check') === 'true'

    if (check) {
      await checkAll()
    }

    const notifications = getNotifications({ limit, unreadOnly })
    const unreadCount = getUnreadCount()

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('[AI Notifications] GET error:', error)
    return NextResponse.json({ error: 'Failed to get notifications' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = requirePermission(req, 'ai_assistant')
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { id } = body as { id?: string }

    markAsRead(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AI Notifications] PUT error:', error)
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}
