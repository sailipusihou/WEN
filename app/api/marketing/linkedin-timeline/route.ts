import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { refreshLinkedInToken, getLinkedInTimeline } from '@/lib/linkedin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const accountId = searchParams.get('accountId')
    const authorUrn = searchParams.get('authorUrn') || undefined
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.platform !== 'linkedin' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected LinkedIn account' }, { status: 400 })
    }

    let accessToken = account.accessToken

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshLinkedInToken(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[LinkedIn Timeline] Token refresh failed, using existing token')
      }
    }

    const finalAuthorUrn = authorUrn || `urn:li:person:${account.username}`

    try {
      const posts = await getLinkedInTimeline(accessToken, finalAuthorUrn, limit)

      return NextResponse.json({
        success: true,
        posts,
        count: posts.length,
      })
    } catch (err: any) {
      console.error('[LinkedIn Timeline] Fetch error:', err)
      const errMsg = err?.message || 'Failed to fetch LinkedIn timeline'
      const statusCode = errMsg.includes('expired') ? 401 : 500
      return NextResponse.json({ error: errMsg }, { status: statusCode })
    }
  } catch (e) {
    console.error('[LinkedIn Timeline API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch LinkedIn timeline' }, { status: 500 })
  }
}