import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { generatePinterestAuthLink } from '@/lib/pinterest'
import { savePendingSocialOAuth } from '@/lib/social-oauth-store'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const settings = getSettings()

    if (!settings.ptApiEnabled) {
      return NextResponse.json(
        { error: 'Pinterest API is not enabled. Please enable Pinterest API in settings.' },
        { status: 400 }
      )
    }

    if (!settings.ptClientId || !settings.ptClientSecret) {
      return NextResponse.json(
        { error: 'Pinterest API is not configured. Please set up Client ID and Client Secret in settings.' },
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
      settings.ptCallbackUrl ||
      `${req.nextUrl.origin}/api/marketing/pinterest-oauth/callback`

    const result = await generatePinterestAuthLink(callbackUrl)

    savePendingSocialOAuth('pinterest', result.state, {
      platform: 'pinterest',
      staffId,
      staffName,
      staffAvatar,
      state: result.state,
      extraData: { mode },
    })

    return NextResponse.redirect(new URL(result.url, req.nextUrl.origin))
  } catch (e: any) {
    console.error('[Pinterest OAuth] GET error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to generate Pinterest auth link' },
      { status: 500 }
    )
  }
}