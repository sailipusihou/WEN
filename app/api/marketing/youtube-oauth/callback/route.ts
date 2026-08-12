import { NextRequest, NextResponse } from 'next/server'
import { exchangeYouTubeCode, getYouTubeUserInfo } from '@/lib/youtube'
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

    if (error) {
      const errorMsg = searchParams.get('error_description') || error || 'OAuth 2.0 authorization failed'
      return NextResponse.redirect(new URL(`/admin/marketing?yt_auth=error&msg=${encodeURIComponent(errorMsg)}`, req.nextUrl.origin))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/admin/marketing?yt_auth=error&msg=No authorization code received', req.nextUrl.origin))
    }

    if (!state) {
      return NextResponse.redirect(new URL('/admin/marketing?yt_auth=error&msg=No state parameter received', req.nextUrl.origin))
    }

    const pending = getPendingSocialOAuth('youtube', state)
    if (!pending) {
      return NextResponse.redirect(new URL('/admin/marketing?yt_auth=expired', req.nextUrl.origin))
    }

    const callbackUrl = settings.ytCallbackUrl || `${req.nextUrl.origin}/api/marketing/youtube-oauth/callback`

    const tokenResult = await exchangeYouTubeCode(code, callbackUrl)

    const userInfo = await getYouTubeUserInfo(tokenResult.accessToken)

    const mode = pending.extraData?.mode
    const existing = mode === 'add' ? undefined : getSocialAccountByPlatform(pending.staffId, 'youtube')
    const avatarUrl = userInfo.thumbnailUrl || ''
    const now = new Date().toISOString()
    if (existing) {
      updateSocialAccount(existing.id, {
        username: userInfo.title,
        avatar: avatarUrl || existing.avatar,
        profileUrl: `https://www.youtube.com/channel/${userInfo.id}`,
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
        platform: 'youtube',
        platformName: 'YouTube',
        username: userInfo.title,
        avatar: avatarUrl,
        profileUrl: `https://www.youtube.com/channel/${userInfo.id}`,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
      })
    }

    removePendingSocialOAuth('youtube', state)

    return NextResponse.redirect(new URL('/admin/marketing?yt_auth=success', req.nextUrl.origin))
  } catch (e: any) {
    console.error('[YouTube OAuth Callback] GET error:', e)
    return NextResponse.redirect(
      new URL(`/admin/marketing?yt_auth=error&msg=${encodeURIComponent(e.message || '')}`, req.nextUrl.origin)
    )
  }
}