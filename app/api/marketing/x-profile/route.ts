import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getXUserInfoOAuth2, refreshOAuth2Token } from '@/lib/x-twitter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const { searchParams } = req.nextUrl
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const account = getSocialAccountById(accountId)
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.platform !== 'twitter' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected X account' }, { status: 400 })
    }

    let accessToken = account.accessToken
    let tokenRefreshed = false

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshOAuth2Token(account.refreshToken)
        accessToken = newTokens.accessToken
        tokenRefreshed = true
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[X Profile] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      userInfo = await getXUserInfoOAuth2(accessToken)
    } catch (err: any) {
      console.error('[X Profile] Token validation failed:', err?.message)
      if (account.refreshToken && !tokenRefreshed) {
        try {
          const newTokens = await refreshOAuth2Token(account.refreshToken)
          accessToken = newTokens.accessToken
          tokenRefreshed = true
          updateSocialAccount(accountId, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            lastSync: new Date().toISOString(),
          })
          userInfo = await getXUserInfoOAuth2(accessToken)
        } catch (refreshErr) {
          console.error('[X Profile] Token refresh also failed:', refreshErr)
          return NextResponse.json({ error: 'X token expired. Please re-login.' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'X token expired. Please re-login.' }, { status: 401 })
      }
    }

    const profileData: any = {
      id: userInfo.id,
      username: userInfo.username,
      name: userInfo.name,
      profileImageUrl: userInfo.profileImageUrl,
      description: userInfo.description,
      followersCount: 0,
      followingCount: 0,
      tweetsCount: 0,
      verified: false,
      location: '',
      url: account.profileUrl || `https://x.com/${userInfo.username}`,
      tokenRefreshed,
    }

    try {
      const { TwitterApi } = await import('twitter-api-v2')
      const client = new TwitterApi(accessToken)

      const userResponse = await client.v2.me({
        'user.fields': ['public_metrics', 'description', 'location', 'url', 'verified', 'profile_image_url', 'name', 'username'],
      })

      if (userResponse.data) {
        const metrics = userResponse.data.public_metrics
        profileData.followersCount = metrics?.followers_count || 0
        profileData.followingCount = metrics?.following_count || 0
        profileData.tweetsCount = metrics?.tweet_count || 0
        profileData.verified = userResponse.data.verified || false
        profileData.location = userResponse.data.location || ''
        profileData.url = userResponse.data.url || profileData.url
      }
    } catch (err) {
      console.error('[X Profile] Failed to fetch full profile:', err)
    }

    return NextResponse.json({
      success: true,
      profile: profileData,
      account: {
        id: account.id,
        username: account.username,
        platform: account.platform,
        status: account.status,
      },
    })
  } catch (e) {
    console.error('[X Profile API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch X profile' }, { status: 500 })
  }
}
