import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getPinterestUserInfo, refreshPinterestToken, getPinterestBoards } from '@/lib/pinterest'

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

    if (account.platform !== 'pinterest' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected Pinterest account' }, { status: 400 })
    }

    let accessToken = account.accessToken
    let tokenRefreshed = false

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshPinterestToken(account.refreshToken)
        accessToken = newTokens.accessToken
        tokenRefreshed = true
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[Pinterest Profile] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      userInfo = await getPinterestUserInfo(accessToken)
    } catch (err: any) {
      console.error('[Pinterest Profile] Token validation failed:', err?.message)
      if (account.refreshToken && !tokenRefreshed) {
        try {
          const newTokens = await refreshPinterestToken(account.refreshToken)
          accessToken = newTokens.accessToken
          tokenRefreshed = true
          updateSocialAccount(accountId, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            lastSync: new Date().toISOString(),
          })
          userInfo = await getPinterestUserInfo(accessToken)
        } catch (refreshErr) {
          console.error('[Pinterest Profile] Token refresh also failed:', refreshErr)
          return NextResponse.json({ error: 'Pinterest token expired. Please re-login.' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Pinterest token expired. Please re-login.' }, { status: 401 })
      }
    }

    let boards: any[] = []
    try {
      boards = await getPinterestBoards(accessToken)
    } catch {
      console.log('[Pinterest Profile] Could not fetch boards')
    }

    const profileData: any = {
      username: userInfo.username,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      email: userInfo.email,
      profileImage: userInfo.profileImage,
      website: userInfo.website,
      profileUrl: `https://www.pinterest.com/${userInfo.username}/`,
      boards,
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
    console.error('[Pinterest Profile API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch Pinterest profile' }, { status: 500 })
  }
}