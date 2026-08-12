import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getSocialAccountById, updateSocialAccount } from '@/lib/social-accounts'
import { refreshOAuth2Token } from '@/lib/x-twitter'

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

    const shouldRefresh = !account.lastSync || (Date.now() - new Date(account.lastSync).getTime() > 55 * 60 * 1000)
    if (account.refreshToken && shouldRefresh) {
      try {
        const newTokens = await refreshOAuth2Token(account.refreshToken)
        accessToken = newTokens.accessToken
        updateSocialAccount(accountId, {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          lastSync: new Date().toISOString(),
        })
      } catch {
        console.log('[X Timeline] Token refresh failed, using existing token')
      }
    }

    try {
      const { TwitterApi } = await import('twitter-api-v2')
      const client = new TwitterApi(accessToken)

      const meResponse = await client.v2.me()
      const userId = meResponse.data.id

      const timeline = await client.v2.userTimeline(userId, {
        max_results: 10,
        'tweet.fields': ['created_at', 'public_metrics', 'text'],
        expansions: ['author_id'],
        'user.fields': ['name', 'username', 'profile_image_url'],
      })

      const tweets = (timeline.tweets || []).map((tweet: any) => {
        const author = timeline.includes?.users?.find((u: any) => u.id === tweet.author_id)
        const metrics = tweet.public_metrics || {}
        return {
          id: tweet.id,
          text: tweet.text,
          createdAt: tweet.created_at,
          author: author ? {
            name: author.name,
            username: author.username,
            profileImageUrl: author.profile_image_url,
          } : {
            name: account.staffName,
            username: account.username,
            profileImageUrl: undefined,
          },
          metrics: {
            replies: metrics.reply_count || 0,
            retweets: metrics.retweet_count || 0,
            likes: metrics.like_count || 0,
            quotes: metrics.quote_count || 0,
            impressions: metrics.impression_count || 0,
            bookmarks: metrics.bookmark_count || 0,
          },
          url: `https://x.com/${author?.username || account.username}/status/${tweet.id}`,
        }
      })

      return NextResponse.json({
        success: true,
        tweets,
        count: tweets.length,
      })
    } catch (err: any) {
      console.error('[X Timeline] Fetch error:', err)
      const errMsg = err?.message || err?.data?.errors?.[0]?.message || 'Failed to fetch timeline'
      const statusCode = err?.code === 401 ? 401 : 500
      return NextResponse.json({ error: errMsg }, { status: statusCode })
    }
  } catch (e) {
    console.error('[X Timeline API] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
  }
}
