import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getTikTokUserInfo, refreshTikTokToken } from '@/lib/tiktok'

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

    if (account.platform !== 'tiktok' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected TikTok account' }, { status: 400 })
    }

    let accessToken = account.accessToken
    let tokenRefreshed = false

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshTikTokToken(account.refreshToken)
        accessToken = newTokens.accessToken
        tokenRefreshed = true
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[TikTok Profile] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      userInfo = await getTikTokUserInfo(accessToken)
    } catch (err: any) {
      console.error('[TikTok Profile] Token validation failed:', err?.message)
      if (account.refreshToken && !tokenRefreshed) {
        try {
          const newTokens = await refreshTikTokToken(account.refreshToken)
          accessToken = newTokens.accessToken
          tokenRefreshed = true
          updateSocialAccount(accountId, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            lastSync: new Date().toISOString(),
          })
          userInfo = await getTikTokUserInfo(accessToken)
        } catch (refreshErr) {
          console.error('[TikTok Profile] Token refresh also failed:', refreshErr)
          return NextResponse.json({ error: 'TikTok token expired. Please re-login.' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'TikTok token expired. Please re-login.' }, { status: 401 })
      }
    }

    const profileData: any = {
      id: userInfo.id,
      username: userInfo.username,
      nickname: userInfo.nickname,
      avatarUrl: userInfo.avatarUrl,
      bioDescription: userInfo.bioDescription,
      followerCount: userInfo.followerCount || 0,
      followingCount: userInfo.followingCount || 0,
      likesCount: userInfo.likesCount || 0,
      videoCount: userInfo.videoCount || 0,
      url: account.profileUrl || `https://www.tiktok.com/@${userInfo.username}`,
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
    console.error('[TikTok Profile API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch TikTok profile' }, { status: 500 })
  }
}