import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getXConversations, sendXDM, refreshOAuth2Token, getXUserInfoOAuth2 } from '@/lib/x-twitter'
import { cachedFetch, invalidateCacheKey } from '@/lib/marketing-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    if (!account || account.platform !== 'twitter' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await cachedFetch(`x-refresh:${accountId}`, 10 * 60 * 1000, () => refreshOAuth2Token(account.refreshToken as string))
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[X DMs] Token refresh failed, using existing')
      }
    }

    let userId = account.platformUserId || account.platformId || ''
    // 修复: OAuth 连接时未保存 platformUserId 的旧账号，主动拉取一次并回填
    if (!userId) {
      try {
        const userInfo = await getXUserInfoOAuth2(accessToken)
        userId = userInfo.id || ''
        if (userId) {
          updateSocialAccount(accountId, { platformUserId: userId })
        }
      } catch (err: any) {
        console.error('[X DMs] Failed to resolve user ID:', err?.message)
        return NextResponse.json({ error: 'Failed to resolve X user ID: ' + (err?.message || 'unknown') }, { status: 400 })
      }
    }
    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID for this account' }, { status: 400 })
    }

    const conversations = await cachedFetch(`x-dms:${accountId}`, 8000, () => getXConversations(accessToken, userId))
    return NextResponse.json({ success: true, conversations, total: conversations.length })
  } catch (err: any) {
    console.error('[X DMs API] GET error:', err)
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
    if (!account || account.platform !== 'twitter' || !account.accessToken) {
      return NextResponse.json({ error: 'Invalid or disconnected account' }, { status: 400 })
    }

    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await refreshOAuth2Token(account.refreshToken as string)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[X DMs] Token refresh failed, using existing')
      }
    }

    const result = await sendXDM(accessToken, recipientId, message)
    invalidateCacheKey(`x-dms:${accountId}`)
    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('[X DMs API] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
