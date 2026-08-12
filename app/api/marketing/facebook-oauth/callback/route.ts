import { NextRequest, NextResponse } from 'next/server'
import { exchangeFacebookCode, getFacebookUserInfo } from '@/lib/facebook'
import { getPendingSocialOAuth, removePendingSocialOAuth } from '@/lib/social-oauth-store'
import { addSocialAccount, getSocialAccountByPlatform, updateSocialAccount } from '@/lib/social-accounts'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const settings = getSettings()
    const { searchParams } = req.nextUrl

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error || searchParams.get('error_description')) {
      const errorMsg = error || searchParams.get('error_description') || 'OAuth authorization failed'
      return NextResponse.redirect(new URL(`/admin/marketing?facebook_auth=error&msg=${encodeURIComponent(errorMsg)}`, req.nextUrl.origin))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/admin/marketing?facebook_auth=error&msg=No authorization code received', req.nextUrl.origin))
    }

    const pendingKey = state || 'pending'
    const pending = getPendingSocialOAuth('facebook', pendingKey) || getPendingSocialOAuth('facebook', 'pending')
    if (!pending) {
      return NextResponse.redirect(new URL('/admin/marketing?facebook_auth=expired', req.nextUrl.origin))
    }

    const callbackUrl = settings.fbCallbackUrl || `${req.nextUrl.origin}/api/marketing/facebook-oauth/callback`

    const tokenResult = await exchangeFacebookCode(
      code,
      callbackUrl,
      pending.codeVerifier
    )

    const userInfo = await getFacebookUserInfo(tokenResult.accessToken)

    const displayName = userInfo.name || userInfo.id
    const avatarUrl = userInfo.picture?.data?.url || ''
    const mode = pending.extraData?.mode
    const existing = mode === 'add' ? undefined : getSocialAccountByPlatform(pending.staffId, 'facebook')
    const now = new Date().toISOString()
    if (existing) {
      updateSocialAccount(existing.id, {
        username: displayName,
        avatar: avatarUrl || existing.avatar,
        profileUrl: userInfo.link,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        status: 'connected',
        isOnline: true,
        lastOnlineCheck: now,
      })
    } else {
      addSocialAccount({
        staffId: pending.staffId,
        staffName: pending.staffName,
        staffAvatar: pending.staffAvatar,
        platform: 'facebook',
        platformName: 'Facebook',
        username: displayName,
        avatar: avatarUrl,
        profileUrl: userInfo.link,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
      })
    }

    removePendingSocialOAuth('facebook', pendingKey)
    if (pendingKey !== 'pending') {
      removePendingSocialOAuth('facebook', 'pending')
    }

    return NextResponse.redirect(new URL('/admin/marketing?facebook_auth=success', req.nextUrl.origin))
  } catch (e: any) {
    console.error('[Facebook OAuth Callback] GET error:', e)
    return NextResponse.redirect(
      new URL(`/admin/marketing?facebook_auth=error&msg=${encodeURIComponent(e.message || '')}`, req.nextUrl.origin)
    )
  }
}