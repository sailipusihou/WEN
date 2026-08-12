import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { createYouTubeUpload, refreshYouTubeToken } from '@/lib/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { accountId, title, description, tags, categoryId, privacyStatus } = body

    if (!accountId || !title) {
      return NextResponse.json({ error: 'Missing required fields (accountId, title)' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    if (account.platform !== 'youtube') {
      return NextResponse.json({ error: 'This API only supports YouTube' }, { status: 400 })
    }

    if (!account.accessToken) {
      return NextResponse.json({ error: 'Account not properly connected. Please reconnect.' }, { status: 400 })
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
        console.log('[YouTube Publish] Token refresh failed, using existing token')
      }
    }

    try {
      const result = await createYouTubeUpload(accessToken, {
        title,
        description: description || '',
        tags: tags || [],
        categoryId: categoryId || '22',
        privacyStatus: privacyStatus || 'private',
      })

      return NextResponse.json({
        success: true,
        uploadUrl: result.uploadUrl,
        videoId: result.videoId,
        title: result.title,
        message: 'Upload session created. POST your video binary to the uploadUrl.',
      })
    } catch (err: any) {
      console.error('[YouTube Publish] Upload creation error:', err)
      return NextResponse.json(
        { error: err.message || 'Failed to create YouTube upload' },
        { status: 500 }
      )
    }
  } catch (e: any) {
    console.error('[YouTube Publish] POST error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to initiate YouTube upload' },
      { status: 500 }
    )
  }
}