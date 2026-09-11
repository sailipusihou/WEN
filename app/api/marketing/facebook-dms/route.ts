import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { refreshFacebookToken } from '@/lib/facebook'
import { cachedFetch, invalidateCacheKey } from '@/lib/marketing-cache'

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
        // token 刷新加缓存（10 分钟）：每次请求都刷新会导致轮询打慢速 OAuth API
        const newTokens = await cachedFetch(`fb-refresh:${accountId}`, 10 * 60 * 1000, () => refreshFacebookToken(account.refreshToken))
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Facebook DMs] Token refresh failed, using existing')
      }
    }

    // 短期缓存：轮询时避免每次打慢速 FB API（8s TTL，15s 轮询下每两次只打一次）
    const result = await cachedFetch(`fb-dms:${accountId}`, 8000, async () => {
      // 获取 Page conversations
      const convUrl = `https://graph.facebook.com/v18.0/me/conversations?fields=id,participants,updated_time,message_count,unread_count&limit=25&access_token=${accessToken}`
      const convResponse = await fetchWithProxy(convUrl)

      if (!convResponse.ok) {
        const errorData = await convResponse.json().catch(() => ({}))
        throw new Error(errorData?.error?.message || 'Failed to fetch conversations')
      }

      // 强制 UTF-8 解码（避免全局代理 agent 导致的 GBK mojibake）
      const convBuf = await convResponse.arrayBuffer()
      const convData = JSON.parse(new TextDecoder('utf-8').decode(convBuf))
      const conversations = convData.data || []

      // 获取每个会话的消息
      const result: any[] = []
      for (const conv of conversations) {
        try {
          const msgUrl = `https://graph.facebook.com/v18.0/${conv.id}/messages?fields=id,message,from,created_time,attachments&limit=20&access_token=${accessToken}`
          const msgResponse = await fetchWithProxy(msgUrl)
          if (msgResponse.ok) {
            const msgBuf = await msgResponse.arrayBuffer()
            const msgData = JSON.parse(new TextDecoder('utf-8').decode(msgBuf))
            const messages = (msgData.data || []).map((m: any) => ({
              id: m.id,
              text: m.message || '',
              fromId: m.from?.id || '',
              fromUsername: m.from?.name || '',
              timestamp: m.created_time || '',
              isRead: true,
              attachments: m.attachments?.data || [],
            }))
            // 获取 participants 真实头像 URL（带 token, redirect=false 返回 fbcdn 地址）
            const rawParticipants = conv.participants?.data || []
            const participants = await Promise.all(rawParticipants.map(async (p: any) => {
              const base = {
                ...p,
                profileUrl: p.id ? `https://facebook.com/${p.id}` : '',
              }
              if (!p.id) return { ...base, picture: '' }
              try {
                const picResp = await fetchWithProxy(`https://graph.facebook.com/v18.0/${p.id}/picture?type=large&redirect=false&access_token=${accessToken}`)
                if (picResp.ok) {
                  const picData = await picResp.json()
                  return { ...base, picture: picData?.data?.url || '' }
                }
              } catch {}
              return { ...base, picture: '' }
            }))
            result.push({
              id: conv.id,
              participants,
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
      return result
    })

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
    const { accountId, recipientId, message, attachmentUrl, attachmentType, action, conversationId } = body

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
        // token 刷新加缓存（10 分钟），避免发送消息时等待慢速 OAuth API
        const newTokens = await cachedFetch(`fb-refresh:${accountId}`, 10 * 60 * 1000, () => refreshFacebookToken(account.refreshToken))
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Facebook DMs] Token refresh failed, using existing')
      }
    }

    // 标记会话已读（打开会话时调用，未读归零）
    if (action === 'mark-read') {
      if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
      }
      try {
        await fetchWithProxy(`https://graph.facebook.com/v18.0/${conversationId}?mark_read=true&access_token=${accessToken}`, {
          method: 'POST',
        })
      } catch {
        console.log('[Facebook DMs] mark-read failed (ignored)')
      }
      invalidateCacheKey(`fb-dms:${accountId}`)
      return NextResponse.json({ success: true })
    }

    if (!recipientId || (!message && !attachmentUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const msgUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`
    const msgBody: any = { recipient: { id: recipientId } }
    if (attachmentUrl && (attachmentType === 'image' || attachmentType === 'audio' || attachmentType === 'file')) {
      // 附件消息（FB 不允许 text + attachment 同对象，仅发附件）
      msgBody.message = {
        attachment: {
          type: attachmentType === 'image' ? 'image' : attachmentType === 'audio' ? 'audio' : 'file',
          payload: { url: attachmentUrl, is_reusable: true },
        },
      }
    } else {
      msgBody.message = { text: message || '' }
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
    invalidateCacheKey(`fb-dms:${accountId}`)
    return NextResponse.json({ success: true, result: { id: data.id } })
  } catch (err: any) {
    console.error('[Facebook DMs API] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
