import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { refreshFacebookToken } from '@/lib/facebook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function fetchWithProxy(url: string, options: RequestInit = {}) {
  const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
  if (PROXY_URL) {
    const { ProxyAgent } = await import('undici')
    const agent = new ProxyAgent(PROXY_URL)
    return fetch(url, { ...options, dispatcher: agent as any } as any)
  }
  return fetch(url, options)
}

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'facebook' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await refreshFacebookToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Facebook DMs] Token refresh failed, using existing')
      }
    }

    // 获取 Page conversations
    const convUrl = `https://graph.facebook.com/v18.0/me/conversations?fields=id,participants,updated_time,message_count,unread_count&limit=25&access_token=${accessToken}`
    const convResponse = await fetchWithProxy(convUrl)

    if (!convResponse.ok) {
      const errorData = await convResponse.json().catch(() => ({}))
      return NextResponse.json({ error: errorData?.error?.message || 'Failed to fetch conversations' }, { status: convResponse.status })
    }

    const convData = await convResponse.json()
    const conversations = convData.data || []

    // 获取每个会话的消息
    const result: any[] = []
    for (const conv of conversations) {
      try {
        const msgUrl = `https://graph.facebook.com/v18.0/${conv.id}/messages?fields=id,message,from,created_time&limit=20&access_token=${accessToken}`
        const msgResponse = await fetchWithProxy(msgUrl)
        if (msgResponse.ok) {
          const msgData = await msgResponse.json()
          const messages = (msgData.data || []).map((m: any) => ({
            id: m.id,
            text: m.message || '',
            fromId: m.from?.id || '',
            fromUsername: m.from?.name || '',
            timestamp: m.created_time || '',
            isRead: true,
          }))
          result.push({
            id: conv.id,
            participants: conv.participants?.data || [],
            messages: messages.reverse(),
            unreadCount: conv.unread_count || 0,
            messageCount: conv.message_count || 0,
            updatedAt: conv.updated_time || '',
          })
        }
      } catch {
        // skip
      }
    }

    return NextResponse.json({ success: true, conversations: result, total: result.length })
  } catch (err: any) {
    console.error('[Facebook DMs API] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, recipientId, message } = body

    if (!accountId || !recipientId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account || account.platform !== 'facebook' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await refreshFacebookToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Facebook DMs] Token refresh failed, using existing')
      }
    }

    const msgUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`
    const msgBody = {
      recipient: { id: recipientId },
      message: { text: message },
    }

    const response = await fetchWithProxy(msgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ error: errorData?.error?.message || 'Send failed' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ success: true, result: { id: data.id } })
  } catch (err: any) {
    console.error('[Facebook DMs API] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
