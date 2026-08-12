import { NextRequest, NextResponse } from 'next/server'
import { exchangeInstagramCode, exchangeInstagramLongLivedToken, getInstagramUserInfo } from '@/lib/instagram'
import { getPendingSocialOAuth, removePendingSocialOAuth } from '@/lib/social-oauth-store'
import { addSocialAccount, getSocialAccountByPlatform, updateSocialAccount } from '@/lib/social-accounts'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getAppOrigin(req: NextRequest, callbackUrl?: string): string {
  if (callbackUrl) {
    try {
      return new URL(callbackUrl).origin
    } catch {}
  }

  const forwardedHost = req.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https'
    return `${forwardedProto}://${forwardedHost}`
  }

  return req.nextUrl.origin
}

export async function GET(req: NextRequest) {
  try {
    const settings = getSettings()
    const { searchParams } = req.nextUrl
    const appOrigin = getAppOrigin(req, settings.igCallbackUrl)

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error || searchParams.get('error_description')) {
      const errorMsg = error || searchParams.get('error_description') || 'OAuth authorization failed'
      return NextResponse.redirect(new URL(`/admin/marketing?instagram_auth=error&msg=${encodeURIComponent(errorMsg)}`, appOrigin))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/admin/marketing?instagram_auth=error&msg=No authorization code received', appOrigin))
    }

    const pendingKey = state || 'pending'
    const pending = getPendingSocialOAuth('instagram', pendingKey) || getPendingSocialOAuth('instagram', 'pending')
    if (!pending) {
      return NextResponse.redirect(new URL('/admin/marketing?instagram_auth=expired', appOrigin))
    }

    const callbackUrl =
      (pending.extraData?.callbackUrl as string | undefined) ||
      settings.igCallbackUrl ||
      `${req.nextUrl.origin}/api/marketing/instagram-oauth/callback`

    const tokenResult = await exchangeInstagramCode(code, callbackUrl)

    let accessToken = tokenResult.accessToken
    let longLivedToken: string | undefined

    if (settings.igClientSecret) {
      try {
        const longLived = await exchangeInstagramLongLivedToken(tokenResult.accessToken)
        accessToken = longLived.accessToken
        longLivedToken = longLived.accessToken
      } catch {
        console.log('[Instagram OAuth] Long-lived token exchange failed, using short-lived token')
      }
    }

    const userInfo = await getInstagramUserInfo(accessToken)

    const displayName = userInfo.username || userInfo.id
    const avatarUrl = userInfo.profile_picture_url || ''
    const mode = pending.extraData?.mode
    const existing = mode === 'add' ? undefined : getSocialAccountByPlatform(pending.staffId, 'instagram')
    const now = new Date().toISOString()
    if (existing) {
      updateSocialAccount(existing.id, {
        username: displayName,
        avatar: avatarUrl || existing.avatar,
        profileUrl: `https://instagram.com/${userInfo.username}`,
        accessToken,
        refreshToken: longLivedToken,
        status: 'connected',
        isOnline: true,
        lastOnlineCheck: now,
        lastSync: now,
      })
    } else {
      addSocialAccount({
        staffId: pending.staffId,
        staffName: pending.staffName,
        staffAvatar: pending.staffAvatar,
        platform: 'instagram',
        platformName: 'Instagram',
        username: displayName,
        avatar: avatarUrl,
        profileUrl: `https://instagram.com/${userInfo.username}`,
        accessToken,
        refreshToken: longLivedToken,
      })
    }

    removePendingSocialOAuth('instagram', pendingKey)
    if (pendingKey !== 'pending') {
      removePendingSocialOAuth('instagram', 'pending')
    }

    return NextResponse.redirect(new URL('/admin/marketing?instagram_auth=success', appOrigin))
  } catch (e: any) {
    console.error('[Instagram OAuth Callback] GET error:', e)
    return NextResponse.redirect(
      new URL(`/admin/marketing?instagram_auth=error&msg=${encodeURIComponent(e.message || '')}`, getAppOrigin(req, getSettings().igCallbackUrl))
    )
  }
}
