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

    // 校验账号归属：非管理员只能查看自己的账号
    const canViewAll = ['super_admin', 'admin'].includes(auth.user.role)
    if (!canViewAll && account.staffId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: you can only view your own accounts' }, { status: 403 })
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
        console.log('[X Insights] Token refresh failed, using existing token')
      }
    }

    let userInfo
    try {
      userInfo = await getXUserInfoOAuth2(accessToken)
    } catch (err: any) {
      console.error('[X Insights] Token validation failed:', err?.message)
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
          console.error('[X Insights] Token refresh also failed:', refreshErr)
          return NextResponse.json({ error: 'X token expired. Please re-login.' }, { status: 401 })
        }
    } else {
      return NextResponse.json({ error: 'X token expired. Please re-login.' }, { status: 401 })
    }
  }

  // 回填旧账号缺失的 platformUserId，供 X DMs / mentions 使用
  const resolvedUserId = userInfo.id || ''
  if (resolvedUserId && !account.platformUserId) {
    try {
      updateSocialAccount(accountId, { platformUserId: resolvedUserId })
    } catch {
      // 非关键写入，失败不影响本次 insights 返回
    }
  }

  const insightsData: any = {
      followers: 0,
      following: 0,
      tweetsCount: 0,
      impressions: 0,
      profileClicks: 0,
      linkClicks: 0,
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
        insightsData.followers = metrics?.followers_count || 0
        insightsData.following = metrics?.following_count || 0
        insightsData.tweetsCount = metrics?.tweet_count || 0
      }

      const userId = userResponse.data?.id
      if (userId) {
        try {
          const tweetsResponse = await client.v2.userTimeline(userId, {
            max_results: 100,
            'tweet.fields': ['public_metrics', 'non_public_metrics'],
          })

          if (tweetsResponse.data) {
            const tweets = (tweetsResponse.data as any) as Array<any>
            let totalImpressions = 0
            for (const tweet of tweets) {
              const publicMetrics = (tweet as any).public_metrics
              const nonPublicMetrics = (tweet as any).non_public_metrics
              if (publicMetrics?.impression_count) {
                totalImpressions += publicMetrics.impression_count
              }
              if (nonPublicMetrics?.user_profile_clicks) {
                insightsData.profileClicks += nonPublicMetrics.user_profile_clicks
              }
              if (nonPublicMetrics?.url_link_clicks) {
                insightsData.linkClicks += nonPublicMetrics.url_link_clicks
              }
            }
            insightsData.impressions = totalImpressions
          }
        } catch (tweetErr) {
          console.error('[X Insights] Failed to fetch tweet timeline:', tweetErr)
        }
      }
    } catch (err) {
      console.error('[X Insights] Failed to fetch metrics:', err)
    }

    return NextResponse.json({
      success: true,
      insights: insightsData,
      account: {
        id: account.id,
        username: account.username,
        platform: account.platform,
        status: account.status,
      },
    })
  } catch (e) {
    console.error('[X Insights API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch X insights' }, { status: 500 })
  }
}
