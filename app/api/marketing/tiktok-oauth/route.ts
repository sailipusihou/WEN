import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { generateTikTokAuthLink } from '@/lib/tiktok'
import { savePendingSocialOAuth } from '@/lib/social-oauth-store'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const settings = getSettings()

    if (!settings.tkApiEnabled) {
      return NextResponse.json(
        { error: 'TikTok API is not enabled. Please enable TikTok API in settings.' },
        { status: 400 }
      )
    }

    if (!settings.tkClientId || !settings.tkClientSecret) {
      return NextResponse.json(
        { error: 'TikTok API is not configured. Please set up Client ID and Client Secret in settings.' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { staffId, staffName, staffAvatar } = body

    if (!staffId || !staffName) {
      return NextResponse.json({ error: 'Missing staff info' }, { status: 400 })
    }

    const callbackUrl =
      settings.tkCallbackUrl ||
      `${req.nextUrl.origin}/api/marketing/tiktok-oauth/callback`

    const result = await generateTikTokAuthLink(callbackUrl)

    savePendingSocialOAuth('tiktok', result.state, {
      platform: 'tiktok',
      staffId,
      staffName,
      staffAvatar,
      state: result.state,
      codeVerifier: result.codeVerifier,
    })

    return NextResponse.json({
      success: true,
      authUrl: result.url,
      state: result.state,
    })
  } catch (e: any) {
    console.error('[TikTok OAuth] POST error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to generate TikTok auth link' },
      { status: 500 }
    )
  }
}