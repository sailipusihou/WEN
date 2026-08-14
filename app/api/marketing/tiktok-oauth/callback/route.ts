import { NextRequest, NextResponse } from 'next/server'
import { exchangeTikTokCode, getTikTokUserInfo } from '@/lib/tiktok'
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
      return NextResponse.redirect(new URL(`/admin/marketing?tiktok_auth=error&msg=${encodeURIComponent(errorMsg)}`, req.nextUrl.origin))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/admin/marketing?tiktok_auth=error&msg=No authorization code received', req.nextUrl.origin))
    }

    // 修复 S7: state 必须存在且精确匹配, 不再回退 'pending' 固定键
    const pendingKey = state || ''
    const pending = pendingKey ? getPendingSocialOAuth('tiktok', pendingKey) : null
    if (!pending) {
      return NextResponse.redirect(new URL('/admin/marketing?tiktok_auth=expired', req.nextUrl.origin))
    }

    const callbackUrl = settings.tkCallbackUrl || `${req.nextUrl.origin}/api/marketing/tiktok-oauth/callback`

    const tokenResult = await exchangeTikTokCode(
      code,
      callbackUrl,
      pending.codeVerifier
    )

    const userInfo = await getTikTokUserInfo(tokenResult.accessToken)

    const mode = pending.extraData?.mode
    const existing = mode === 'add' ? undefined : getSocialAccountByPlatform(pending.staffId, 'tiktok')
    const avatarUrl = userInfo.avatarUrl || ''
    const now = new Date().toISOString()
    if (existing) {
      updateSocialAccount(existing.id, {
        username: userInfo.username,
        avatar: avatarUrl || existing.avatar,
        profileUrl: `https://www.tiktok.com/@${userInfo.username}`,
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
        platform: 'tiktok',
        platformName: 'TikTok',
        username: userInfo.username,
        avatar: avatarUrl,
        profileUrl: `https://www.tiktok.com/@${userInfo.username}`,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
      })
    }

    removePendingSocialOAuth('tiktok', pendingKey)

    return NextResponse.redirect(new URL('/admin/marketing?tiktok_auth=success', req.nextUrl.origin))
  } catch (e: any) {
    console.error('[TikTok OAuth Callback] GET error:', e)
    return NextResponse.redirect(
      new URL(`/admin/marketing?tiktok_auth=error&msg=${encodeURIComponent(e.message || '')}`, req.nextUrl.origin)
    )
  }
}