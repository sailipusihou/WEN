import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { generateYouTubeAuthLink } from '@/lib/youtube'
import { savePendingSocialOAuth } from '@/lib/social-oauth-store'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const settings = getSettings()

    if (!settings.ytApiEnabled) {
      return NextResponse.json(
        { error: 'YouTube API is not enabled. Please enable YouTube API in settings.' },
        { status: 400 }
      )
    }

    if (!settings.ytClientId || !settings.ytClientSecret) {
      return NextResponse.json(
        { error: 'YouTube API OAuth 2.0 is not configured. Please set up Client ID and Client Secret in settings.' },
        { status: 400 }
      )
    }

    const { searchParams } = req.nextUrl
    const staffId = searchParams.get('staffId')
    const staffName = searchParams.get('staffName')
    const staffAvatar = searchParams.get('staffAvatar') || undefined
    const mode = searchParams.get('mode') || undefined

    if (!staffId || !staffName) {
      return NextResponse.json({ error: 'Missing staff info (staffId, staffName)' }, { status: 400 })
    }

    const callbackUrl =
      settings.ytCallbackUrl ||
      `${req.nextUrl.origin}/api/marketing/youtube-oauth/callback`

    const result = await generateYouTubeAuthLink(callbackUrl)

    savePendingSocialOAuth('youtube', result.state, {
      platform: 'youtube',
      staffId,
      staffName,
      staffAvatar,
      state: result.state,
      extraData: { mode },
    })

    return NextResponse.json({
      success: true,
      authUrl: result.url,
      state: result.state,
    })
  } catch (e: any) {
    console.error('[YouTube OAuth] GET error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to generate YouTube auth link' },
      { status: 500 }
    )
  }
}