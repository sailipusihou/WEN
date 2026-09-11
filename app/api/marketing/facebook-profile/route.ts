import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getFacebookUserInfo, refreshFacebookToken, getFacebookPageInfo } from '@/lib/facebook'

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

    if (account.platform !== 'facebook' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected Facebook account' }, { status: 400 })
    }

    let accessToken = account.accessToken
    let tokenRefreshed = false

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshFacebookToken(account.refreshToken)
        accessToken = newTokens.accessToken
        tokenRefreshed = true
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Facebook Profile] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      // Page 账号（platformUserId = Page ID）用 Page 端点验证；个人账号用 /me
      if (account.platformUserId && account.username === 'Low Flame') {
        const pages = await getFacebookPageInfo(accessToken, account.platformUserId)
        const page = pages[0]
        userInfo = {
          id: page.id,
          name: page.name,
          email: '',
          picture: page.picture,
          link: `https://facebook.com/${page.id}`,
        }
      } else {
        userInfo = await getFacebookUserInfo(accessToken)
      }
    } catch (err: any) {
      console.error('[Facebook Profile] Token validation failed:', err?.message)
      if (account.refreshToken && !tokenRefreshed) {
        try {
          const newTokens = await refreshFacebookToken(account.refreshToken)
          accessToken = newTokens.accessToken
          tokenRefreshed = true
          updateSocialAccount(accountId, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            lastSync: new Date().toISOString(),
          })
          if (account.platformUserId && account.username === 'Low Flame') {
            const pages = await getFacebookPageInfo(accessToken, account.platformUserId)
            const page = pages[0]
            userInfo = {
              id: page.id,
              name: page.name,
              email: '',
              picture: page.picture,
              link: `https://facebook.com/${page.id}`,
            }
          } else {
            userInfo = await getFacebookUserInfo(accessToken)
          }
        } catch (refreshErr) {
          console.error('[Facebook Profile] Token refresh also failed:', refreshErr)
          return NextResponse.json({ error: 'Facebook token expired. Please re-login.' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Facebook token expired. Please re-login.' }, { status: 401 })
      }
    }

    let pages: any[] = []
    try {
      pages = await getFacebookPageInfo(accessToken)
    } catch {
      console.log('[Facebook Profile] Could not fetch pages (may need additional permissions)')
    }

    const profileData: any = {
      id: userInfo.id,
      name: userInfo.name,
      email: userInfo.email,
      profileImageUrl: userInfo.picture?.data?.url,
      link: userInfo.link,
      pages: pages.map(p => ({
        id: p.id,
        name: p.name,
        picture: p.picture?.data?.url,
        followersCount: p.followers_count || 0,
        likesCount: p.likes_count || 0,
      })),
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
    console.error('[Facebook Profile API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch Facebook profile' }, { status: 500 })
  }
}