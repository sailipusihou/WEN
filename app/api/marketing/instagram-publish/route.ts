import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById } from '@/lib/social-accounts'
import { publishInstagramMedia, publishInstagramContainer, refreshInstagramToken } from '@/lib/instagram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'social_publish')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, mediaUrl, caption, mediaType } = body

    if (!accountId) {
      return NextResponse.json({ error: 'Missing required field: accountId' }, { status: 400 })
    }

    if (!mediaUrl || (Array.isArray(mediaUrl) && mediaUrl.length === 0)) {
      return NextResponse.json({ error: 'Missing required field: mediaUrl' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    if (account.platform !== 'instagram') {
      return NextResponse.json({ error: 'This API only supports Instagram' }, { status: 400 })
    }

    if (!account.accessToken) {
      return NextResponse.json({ error: 'Account not properly connected. Please reconnect.' }, { status: 400 })
    }

    let accessToken = account.accessToken
    if (account.refreshToken) {
      try {
        const newTokens = await refreshInstagramToken(account.refreshToken)
        accessToken = newTokens.accessToken
      } catch {
        console.log('[Instagram Publish] Token refresh failed, using existing token')
      }
    }

    try {
      const type = (mediaType || 'IMAGE').toUpperCase() as 'IMAGE' | 'VIDEO' | 'CAROUSEL'

      const containerResult = await publishInstagramMedia(accessToken, mediaUrl, caption, type)

      const publishResult = await publishInstagramContainer(accessToken, containerResult.containerId)

      return NextResponse.json({
        success: true,
        message: 'Instagram media published successfully',
        mediaId: publishResult.mediaId,
        containerId: containerResult.containerId,
      })
    } catch (err: any) {
      console.error('[Instagram Publish] Error:', err)
      return NextResponse.json(
        { error: err.message || 'Failed to publish to Instagram' },
        { status: 500 }
      )
    }
  } catch (e: any) {
    console.error('[Instagram Publish] POST error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to process Instagram publish request' },
      { status: 500 }
    )
  }
}
