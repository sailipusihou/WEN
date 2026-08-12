import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getTikTokTimeline, refreshTikTokToken } from '@/lib/tiktok'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const accountId = searchParams.get('accountId')
    const cursor = searchParams.get('cursor') || undefined
    const maxCount = parseInt(searchParams.get('maxCount') || '10', 10)

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.platform !== 'tiktok' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected TikTok account' }, { status: 400 })
    }

    let accessToken = account.accessToken

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshTikTokToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[TikTok Timeline] Token refresh failed, using existing token')
      }
    }

    try {
      const result = await getTikTokTimeline(accessToken, maxCount, cursor)

      return NextResponse.json({
        success: true,
        videos: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        count: result.items.length,
      })
    } catch (err: any) {
      console.error('[TikTok Timeline] Fetch error:', err)
      const errMsg = err?.message || 'Failed to fetch TikTok timeline'
      const statusCode = err?.includes?.('expired') ? 401 : 500
      return NextResponse.json({ error: errMsg }, { status: statusCode })
    }
  } catch (e) {
    console.error('[TikTok Timeline API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch TikTok timeline' }, { status: 500 })
  }
}