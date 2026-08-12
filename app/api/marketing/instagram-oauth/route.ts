import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { generateInstagramAuthLink } from '@/lib/instagram'
import { savePendingSocialOAuth } from '@/lib/social-oauth-store'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const settings = getSettings()

    if (!settings.igApiEnabled) {
      return NextResponse.json(
        { error: 'Instagram API is not enabled. Please enable Instagram API in settings.' },
        { status: 400 }
      )
    }

    if (!settings.igClientId || !settings.igClientSecret) {
      return NextResponse.json(
        { error: 'Instagram API is not configured. Please set up Instagram App ID and Instagram App Secret in settings.' },
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
      settings.igCallbackUrl ||
      `${req.nextUrl.origin}/api/marketing/instagram-oauth/callback`

    const result = await generateInstagramAuthLink(callbackUrl)

    savePendingSocialOAuth('instagram', result.state, {
      platform: 'instagram',
      staffId,
      staffName,
      staffAvatar,
      state: result.state,
      extraData: {
        callbackUrl,
        mode,
      },
    })

    return NextResponse.redirect(new URL(result.url, req.nextUrl.origin))
  } catch (e: any) {
    console.error('[Instagram OAuth] GET error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to generate Instagram auth link' },
      { status: 500 }
    )
  }
}
