import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getYouTubeUserInfo, refreshYouTubeToken } from '@/lib/youtube'

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

    if (account.platform !== 'youtube' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected YouTube account' }, { status: 400 })
    }

    let accessToken = account.accessToken
    let tokenRefreshed = false

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshYouTubeToken(account.refreshToken)
        accessToken = newTokens.accessToken
        tokenRefreshed = true
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[YouTube Profile] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      userInfo = await getYouTubeUserInfo(accessToken)
    } catch (err: any) {
      console.error('[YouTube Profile] Token validation failed:', err?.message)
      if (account.refreshToken && !tokenRefreshed) {
        try {
          const newTokens = await refreshYouTubeToken(account.refreshToken)
          accessToken = newTokens.accessToken
          tokenRefreshed = true
          updateSocialAccount(accountId, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            lastSync: new Date().toISOString(),
          })
          userInfo = await getYouTubeUserInfo(accessToken)
        } catch (refreshErr) {
          console.error('[YouTube Profile] Token refresh also failed:', refreshErr)
          return NextResponse.json({ error: 'YouTube token expired. Please re-login.' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'YouTube token expired. Please re-login.' }, { status: 401 })
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: userInfo.id,
        title: userInfo.title,
        description: userInfo.description,
        thumbnailUrl: userInfo.thumbnailUrl,
        subscriberCount: userInfo.subscriberCount,
        videoCount: userInfo.videoCount,
        viewCount: userInfo.viewCount,
        country: userInfo.country,
        customUrl: userInfo.customUrl,
        url: account.profileUrl || `https://www.youtube.com/channel/${userInfo.id}`,
        tokenRefreshed,
      },
      account: {
        id: account.id,
        username: account.username,
        platform: account.platform,
        status: account.status,
      },
    })
  } catch (e) {
    console.error('[YouTube Profile API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch YouTube profile' }, { status: 500 })
  }
}