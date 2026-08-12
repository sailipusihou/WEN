import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { generateLinkedInAuthLink } from '@/lib/linkedin'
import { savePendingSocialOAuth } from '@/lib/social-oauth-store'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const settings = getSettings()

    if (!settings.liApiEnabled) {
      return NextResponse.json(
        { error: 'LinkedIn API is not enabled. Please enable LinkedIn API in settings.' },
        { status: 400 }
      )
    }

    if (!settings.liClientId || !settings.liClientSecret) {
      return NextResponse.json(
        { error: 'LinkedIn API is not configured. Please set up Client ID and Client Secret in settings.' },
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
      settings.liCallbackUrl ||
      `${req.nextUrl.origin}/api/marketing/linkedin-oauth/callback`

    const result = await generateLinkedInAuthLink(callbackUrl)

    savePendingSocialOAuth('linkedin', result.state, {
      platform: 'linkedin',
      staffId,
      staffName,
      staffAvatar,
      state: result.state,
      extraData: { mode },
    })

    return NextResponse.redirect(new URL(result.url, req.nextUrl.origin))
  } catch (e: any) {
    console.error('[LinkedIn OAuth] GET error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to generate LinkedIn auth link' },
      { status: 500 }
    )
  }
}