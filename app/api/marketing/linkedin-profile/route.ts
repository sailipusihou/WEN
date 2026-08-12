import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { getLinkedInUserInfo, refreshLinkedInToken, getLinkedInCompanyInfo } from '@/lib/linkedin'

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

    if (account.platform !== 'linkedin' || !account.accessToken) {
      return NextResponse.json({ error: 'Not a connected LinkedIn account' }, { status: 400 })
    }

    let accessToken = account.accessToken
    let tokenRefreshed = false

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshLinkedInToken(account.refreshToken)
        accessToken = newTokens.accessToken
        tokenRefreshed = true
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[LinkedIn Profile] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      userInfo = await getLinkedInUserInfo(accessToken)
    } catch (err: any) {
      console.error('[LinkedIn Profile] Token validation failed:', err?.message)
      if (account.refreshToken && !tokenRefreshed) {
        try {
          const newTokens = await refreshLinkedInToken(account.refreshToken)
          accessToken = newTokens.accessToken
          tokenRefreshed = true
          updateSocialAccount(accountId, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            lastSync: new Date().toISOString(),
          })
          userInfo = await getLinkedInUserInfo(accessToken)
        } catch (refreshErr) {
          console.error('[LinkedIn Profile] Token refresh also failed:', refreshErr)
          return NextResponse.json({ error: 'LinkedIn token expired. Please re-login.' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'LinkedIn token expired. Please re-login.' }, { status: 401 })
      }
    }

    let companies: any[] = []
    try {
      companies = await getLinkedInCompanyInfo(accessToken)
    } catch {
      console.log('[LinkedIn Profile] Could not fetch company info (may need additional permissions)')
    }

    const profileData: any = {
      id: userInfo.id,
      name: userInfo.name,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      email: userInfo.email,
      profileImageUrl: userInfo.picture,
      locale: userInfo.locale,
      profileUrl: `https://www.linkedin.com/in/${userInfo.id}`,
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        logoUrl: c.logoUrl,
        description: c.description,
        followersCount: c.followersCount || 0,
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
    console.error('[LinkedIn Profile API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch LinkedIn profile' }, { status: 500 })
  }
}