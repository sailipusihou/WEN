import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { generateFacebookAuthLink } from '@/lib/facebook'
import { savePendingSocialOAuth } from '@/lib/social-oauth-store'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const settings = getSettings()

    if (!settings.fbApiEnabled) {
      return NextResponse.json(
        { error: 'Facebook API is not enabled. Please enable Facebook API in settings.' },
        { status: 400 }
      )
    }

    if (!settings.fbClientId || !settings.fbClientSecret) {
      return NextResponse.json(
        { error: 'Facebook API is not configured. Please set up Client ID and Client Secret in settings.' },
        { status: 400 }
      )
    }

    const { searchParams } = req.nextUrl
    const staffId = searchParams.get('staffId')
    const staffName = searchParams.get('staffName')
    const staffAvatar = searchParams.get('staffAvatar') || undefined
    const mode = searchParams.get('mode') || undefined

    if (!staffId || !staffName) {
      return NextResponse.json({ error: 'Missing staff info' }, { status: 400 })
    }

    const callbackUrl =
      settings.fbCallbackUrl ||
      `${req.nextUrl.origin}/api/marketing/facebook-oauth/callback`

    const result = await generateFacebookAuthLink(callbackUrl)

    savePendingSocialOAuth('facebook', result.state, {
      platform: 'facebook',
      staffId,
      staffName,
      staffAvatar,
      state: result.state,
      codeVerifier: result.codeVerifier,
      extraData: {
        codeChallenge: result.codeChallenge,
        mode,
      },
    })

    return NextResponse.redirect(new URL(result.url, req.nextUrl.origin))
  } catch (e: any) {
    console.error('[Facebook OAuth] GET error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to generate Facebook auth link' },
      { status: 500 }
    )
  }
}