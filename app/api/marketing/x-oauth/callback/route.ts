import { NextRequest, NextResponse } from 'next/server'
import { loginXWithCallback, exchangeOAuth2Code, getXUserInfoOAuth2 } from '@/lib/x-twitter'
import { getPendingXAuth, removePendingXAuth } from '@/lib/x-oauth-store'
import { addSocialAccount, getSocialAccountByPlatform, updateSocialAccount } from '@/lib/social-accounts'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const settings = getSettings()
    const authType = settings.xApiAuthType || 'oauth2'
    const { searchParams } = req.nextUrl

    if (authType === 'oauth2') {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error || searchParams.get('error_description')) {
        const errorMsg = error || searchParams.get('error_description') || 'OAuth 2.0 authorization failed'
        return NextResponse.redirect(new URL(`/admin/marketing?x_auth=error&msg=${encodeURIComponent(errorMsg)}`, req.nextUrl.origin))
      }

      if (!code) {
        return NextResponse.redirect(new URL('/admin/marketing?x_auth=error&msg=No authorization code received', req.nextUrl.origin))
      }

      const pendingKey = state || 'pending'
      const pending = getPendingXAuth(pendingKey) || getPendingXAuth('pending')
      if (!pending) {
        return NextResponse.redirect(new URL('/admin/marketing?x_auth=expired', req.nextUrl.origin))
      }

      const callbackUrl = settings.xCallbackUrl || `${req.nextUrl.origin}/api/marketing/x-oauth/callback`
      
      const tokenResult = await exchangeOAuth2Code(
        code,
        callbackUrl,
        pending.codeVerifier || ''
      )

      const userInfo = await getXUserInfoOAuth2(tokenResult.accessToken)

      const existing = getSocialAccountByPlatform(pending.staffId, 'twitter')
      if (existing) {
        updateSocialAccount(existing.id, {
          platformUserId: userInfo.id,
          username: userInfo.username,
          avatar: userInfo.profileImageUrl || existing.avatar,
          profileUrl: `https://x.com/${userInfo.username}`,
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          status: 'connected',
        })
      } else {
        addSocialAccount({
          staffId: pending.staffId,
          staffName: pending.staffName,
          staffAvatar: pending.staffAvatar,
          avatar: userInfo.profileImageUrl || '',
          platformUserId: userInfo.id,
          platform: 'twitter',
          platformName: 'X (Twitter)',
          username: userInfo.username,
          profileUrl: `https://x.com/${userInfo.username}`,
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
        })
      }

      removePendingXAuth(pendingKey)
      if (pendingKey !== 'pending') {
        removePendingXAuth('pending')
      }

      return NextResponse.redirect(new URL('/admin/marketing?x_auth=success', req.nextUrl.origin))
    } else {
      const oauthToken = searchParams.get('oauth_token')
      const oauthVerifier = searchParams.get('oauth_verifier')
      const denied = searchParams.get('denied')

      if (denied) {
        return NextResponse.redirect(new URL('/admin/marketing?x_auth=cancelled', req.nextUrl.origin))
      }

      if (!oauthToken || !oauthVerifier) {
        return NextResponse.redirect(new URL('/admin/marketing?x_auth=error', req.nextUrl.origin))
      }

      const pending = getPendingXAuth(oauthToken)
      if (!pending) {
        return NextResponse.redirect(new URL('/admin/marketing?x_auth=expired', req.nextUrl.origin))
      }

      const result = await loginXWithCallback(
        oauthToken,
        oauthVerifier,
        pending.oauthTokenSecret!
      )

      const existing = getSocialAccountByPlatform(pending.staffId, 'twitter')
      if (existing) {
        updateSocialAccount(existing.id, {
          username: result.user.username,
          avatar: result.user.profileImageUrl || existing.avatar,
          profileUrl: `https://twitter.com/${result.user.username}`,
          accessToken: result.accessToken,
          refreshToken: result.accessTokenSecret,
          status: 'connected',
        })
      } else {
        addSocialAccount({
          staffId: pending.staffId,
          staffName: pending.staffName,
          staffAvatar: pending.staffAvatar,
          avatar: result.user.profileImageUrl || '',
          platform: 'twitter',
          platformName: 'X (Twitter)',
          username: result.user.username,
          profileUrl: `https://twitter.com/${result.user.username}`,
          accessToken: result.accessToken,
          refreshToken: result.accessTokenSecret,
        })
      }

      removePendingXAuth(oauthToken)

      return NextResponse.redirect(new URL('/admin/marketing?x_auth=success', req.nextUrl.origin))
    }
  } catch (e: any) {
    console.error('[X OAuth Callback] GET error:', e)
    return NextResponse.redirect(
      new URL(`/admin/marketing?x_auth=error&msg=${encodeURIComponent(e.message || '')}`, req.nextUrl.origin)
    )
  }
}
