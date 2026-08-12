import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { generateXAuthLink } from '@/lib/x-twitter'
import { savePendingXAuth } from '@/lib/x-oauth-store'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const settings = getSettings()
    const authType = settings.xApiAuthType || 'oauth2'
    
    console.log('[X OAuth] settings:', {
      authType,
      xApiEnabled: settings.xApiEnabled,
      hasClientId: !!settings.xClientId,
      hasClientSecret: !!settings.xClientSecret,
      hasApiKey: !!settings.xApiKey,
      hasApiSecret: !!settings.xApiSecret,
      xCallbackUrl: settings.xCallbackUrl,
    })
    
    if (!settings.xApiEnabled) {
      return NextResponse.json(
        { error: 'X API is not enabled. Please enable X API in settings.' },
        { status: 400 }
      )
    }

    if (authType === 'oauth2' && (!settings.xClientId || !settings.xClientSecret)) {
      return NextResponse.json(
        { error: 'X API OAuth 2.0 is not configured. Please set up Client ID and Client Secret in settings.' },
        { status: 400 }
      )
    }

    if (authType === 'oauth1' && (!settings.xApiKey || !settings.xApiSecret)) {
      return NextResponse.json(
        { error: 'X API OAuth 1.0a is not configured. Please set up API Key and API Secret in settings.' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { staffId, staffName, staffAvatar } = body

    if (!staffId || !staffName) {
      return NextResponse.json({ error: 'Missing staff info' }, { status: 400 })
    }

    const callbackUrl =
      settings.xCallbackUrl ||
      `${req.nextUrl.origin}/api/marketing/x-oauth/callback`

    console.log('[X OAuth] callbackUrl:', callbackUrl)
    const result = await generateXAuthLink(callbackUrl)

    if (authType === 'oauth2') {
      savePendingXAuth(result.state || result.codeVerifier || 'pending', {
        authType: 'oauth2',
        codeVerifier: result.codeVerifier,
        state: result.state,
        staffId,
        staffName,
        staffAvatar,
      })

      return NextResponse.json({
        success: true,
        authUrl: result.url,
        state: result.state,
      })
    } else {
      savePendingXAuth(result.oauthToken!, {
        authType: 'oauth1',
        oauthTokenSecret: result.oauthTokenSecret,
        staffId,
        staffName,
        staffAvatar,
      })

      return NextResponse.json({
        success: true,
        authUrl: result.url,
        oauthToken: result.oauthToken,
      })
    }
  } catch (e: any) {
    console.error('[X OAuth] POST error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to generate X auth link' },
      { status: 500 }
    )
  }
}
