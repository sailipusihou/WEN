import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getYouTubeChannelVideos, refreshYouTubeToken } from '@/lib/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const accountId = searchParams.get('accountId')
    const maxResults = parseInt(searchParams.get('maxResults') || '10', 10)

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.platform !== 'youtube' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected YouTube account' }, { status: 400 })
    }

    let accessToken = account.accessToken

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshYouTubeToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[YouTube Timeline] Token refresh failed, using existing token')
      }
    }

    try {
      const videos = await getYouTubeChannelVideos(accessToken, maxResults)

      return NextResponse.json({
        success: true,
        videos,
        count: videos.length,
      })
    } catch (err: any) {
      console.error('[YouTube Timeline] Fetch error:', err)
      const errMsg = err?.message || 'Failed to fetch YouTube timeline'
      const statusCode = err?.includes?.('expired') ? 401 : 500
      return NextResponse.json({ error: errMsg }, { status: statusCode })
    }
  } catch (e) {
    console.error('[YouTube Timeline API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch YouTube timeline' }, { status: 500 })
  }
}