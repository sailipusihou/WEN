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

    // 校验账号归属：非管理员只能查看自己的账号
    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only view your own accounts' }, { status: 403 })
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
        console.log('[Facebook Insights] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      userInfo = await getFacebookUserInfo(accessToken)
    } catch (err: any) {
      console.error('[Facebook Insights] Token validation failed:', err?.message)
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
          userInfo = await getFacebookUserInfo(accessToken)
        } catch (refreshErr) {
          console.error('[Facebook Insights] Token refresh also failed:', refreshErr)
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
      console.log('[Facebook Insights] Could not fetch pages')
    }

    const insightsData: any = {
      totalFollowers: 0,
      newFollowers: 0,
      impressions: 0,
      engagements: 0,
      tokenRefreshed,
    }

    if (pages.length > 0) {
      const pageId = pages[0].id
      try {
        const insightsParams = new URLSearchParams({
          fields: 'total_fans,new_fans,impressions,engaged_users',
          period: 'days_28',
          access_token: accessToken,
        })
        const insightsUrl = `https://graph.facebook.com/v18.0/${pageId}/insights?${insightsParams.toString()}`

        const response = await fetch(insightsUrl, { method: 'GET' })
        if (response.ok) {
          const data = await response.json()
          const insights = data.data || []

          for (const item of insights) {
            const metricName = item.name
            const values = item.values
            if (values && values.length > 0) {
              const latestValue = values[0].value
              switch (metricName) {
                case 'total_fans':
                  insightsData.totalFollowers = latestValue || 0
                  break
                case 'new_fans':
                  insightsData.newFollowers = latestValue || 0
                  break
                case 'impressions':
                  insightsData.impressions = latestValue || 0
                  break
                case 'engaged_users':
                  insightsData.engagements = latestValue || 0
                  break
              }
            }
          }
        } else {
          console.log('[Facebook Insights] Failed to fetch insights:', await response.text())
        }
      } catch (err) {
        console.error('[Facebook Insights] Error fetching page insights:', err)
      }
    }

    return NextResponse.json({
      success: true,
      insights: insightsData,
      pages: pages.map(p => ({
        id: p.id,
        name: p.name,
        followersCount: p.followers_count || 0,
        likesCount: p.likes_count || 0,
      })),
      account: {
        id: account.id,
        username: account.username,
        platform: account.platform,
        status: account.status,
      },
    })
  } catch (e) {
    console.error('[Facebook Insights API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch Facebook insights' }, { status: 500 })
  }
}