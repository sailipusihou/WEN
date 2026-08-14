import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getInstagramUserInfo, refreshInstagramToken } from '@/lib/instagram'

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

    if (account.platform !== 'instagram' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected Instagram account' }, { status: 400 })
    }

    let accessToken = account.accessToken
    let tokenRefreshed = false

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshInstagramToken(account.refreshToken)
        accessToken = newTokens.accessToken
        tokenRefreshed = true
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.accessToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Instagram Profile] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      userInfo = await getInstagramUserInfo(accessToken)
    } catch (err: any) {
      console.error('[Instagram Profile] Token validation failed:', err?.message)
      if (account.refreshToken && !tokenRefreshed) {
        try {
          const newTokens = await refreshInstagramToken(account.refreshToken)
          accessToken = newTokens.accessToken
          tokenRefreshed = true
          updateSocialAccount(accountId, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.accessToken,
            lastSync: new Date().toISOString(),
          })
          userInfo = await getInstagramUserInfo(accessToken)
        } catch (refreshErr) {
          console.error('[Instagram Profile] Token refresh also failed:', refreshErr)
          return NextResponse.json({ error: 'Instagram token expired. Please re-login.' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Instagram token expired. Please re-login.' }, { status: 401 })
      }
    }

    const profileData: any = {
      id: userInfo.id,
      username: userInfo.username,
      name: userInfo.name,
      profilePictureUrl: userInfo.profile_picture_url,
      mediaCount: userInfo.media_count || 0,
      followersCount: userInfo.followers_count || 0,
      followsCount: userInfo.follows_count || 0,
      bio: userInfo.biography || '',
      website: userInfo.website || '',
      url: `https://instagram.com/${userInfo.username}`,
      tokenRefreshed,
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
    console.error('[Instagram Profile API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch Instagram profile' }, { status: 500 })
  }
}
