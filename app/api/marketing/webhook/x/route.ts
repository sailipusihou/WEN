import { NextRequest, NextResponse } from 'next/server'
import { socialEventBus } from '@/lib/social-event-bus'
import { getAllSocialAccounts } from '@/lib/social-accounts'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * X/Twitter Webhook 端点
 * 
 * GET  — CRC (Challenge-Response Check) 验证
 * POST — 接收 Twitter Account Activity API 推送的事件
 * 
 * 注意: X/Twitter 的 Account Activity API 需要 Enterprise 级别
 * 对于 Pro/Basic 级别，可以使用 Filtered Stream API 作为替代
 */

// ===== GET: CRC 验证 =====
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const crcToken = searchParams.get('crc_token')

  console.log('[X Webhook] CRC verification request:', crcToken ? 'token present' : 'no token')

  if (!crcToken) {
    return NextResponse.json({ error: 'Missing crc_token' }, { status: 400 })
  }

  // X/Twitter CRC 验证需要用 consumer secret 签名
  const { getSettings } = await import('@/lib/settings')
  const settings = getSettings()

  if (!settings.xApiSecret) {
    return NextResponse.json({ error: 'X API not configured' }, { status: 500 })
  }

  const hmac = crypto.createHmac('sha256', settings.xApiSecret).update(crcToken).digest('base64')

  return NextResponse.json({
    response_token: `sha256=${hmac}`,
  }, { status: 200 })
}

// ===== POST: 接收 Webhook 事件 =====
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const payload = JSON.parse(body)

    console.log('[X Webhook] Received event:', JSON.stringify(payload).substring(0, 200))

    const allAccounts = getAllSocialAccounts()
    const xAccounts = allAccounts.filter(a => a.platform === 'twitter' && a.status === 'connected')

    // X/Twitter Account Activity API 事件格式
    // { for_user_id: "...", user_has_authorized: true, ... events }

    const forUserId = payload.for_user_id
    const account = xAccounts.find(a => a.platformUserId === forUserId || a.platformId === forUserId)
    const accountUsername = account?.username || 'unknown'
    const accountId = account?.id || ''

    // 处理提及事件
    if (payload.tweet_create_events) {
      for (const tweet of payload.tweet_create_events) {
        // 排除自己发的推文
        if (tweet.user?.id_str === forUserId) continue

        socialEventBus.emit({
          id: `x_mention_${tweet.id_str || Date.now()}`,
          type: 'mention',
          platform: 'twitter',
          accountId,
          accountUsername,
          timestamp: tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString(),
          data: {
            tweetId: tweet.id_str,
            text: tweet.text || tweet.full_text || '',
            username: tweet.user?.screen_name || '',
            userId: tweet.user?.id_str || '',
            inReplyToStatusId: tweet.in_reply_to_status_id_str || '',
            isReply: !!tweet.in_reply_to_status_id_str,
            likes: tweet.favorite_count || 0,
            retweets: tweet.retweet_count || 0,
          },
        })

        // 如果是回复我们推文的，归类为评论
        if (tweet.in_reply_to_status_id_str) {
          socialEventBus.emit({
            id: `x_comment_${tweet.id_str || Date.now()}`,
            type: 'comment',
            platform: 'twitter',
            accountId,
            accountUsername,
            timestamp: tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString(),
            data: {
              tweetId: tweet.id_str,
              text: tweet.text || tweet.full_text || '',
              username: tweet.user?.screen_name || '',
              userId: tweet.user?.id_str || '',
              inReplyToStatusId: tweet.in_reply_to_status_id_str,
            },
          })
          console.log('[X Webhook] Reply from @' + tweet.user?.screen_name)
        } else {
          console.log('[X Webhook] Mention from @' + tweet.user?.screen_name)
        }
      }
    }

    // 处理私信事件
    if (payload.direct_message_events) {
      for (const dm of payload.direct_message_events) {
        const messageCreate = dm.message_create
        if (!messageCreate) continue

        // 排除自己发的消息
        if (messageCreate.sender_id === forUserId) continue

        socialEventBus.emit({
          id: `x_dm_${dm.id || Date.now()}`,
          type: 'dm',
          platform: 'twitter',
          accountId,
          accountUsername,
          timestamp: dm.created_timestamp ? new Date(Number(dm.created_timestamp)).toISOString() : new Date().toISOString(),
          data: {
            senderId: messageCreate.sender_id || '',
            recipientId: messageCreate.target?.recipient_id || '',
            text: messageCreate.message_data?.text || '',
            messageId: dm.id || '',
          },
        })
        console.log('[X Webhook] DM from user', messageCreate.sender_id)
      }
    }

    // 处理关注事件
    if (payload.follow_events) {
      for (const follow of payload.follow_events) {
        if (follow.type === 'follow') {
          socialEventBus.emit({
            id: `x_follow_${Date.now()}`,
            type: 'follow',
            platform: 'twitter',
            accountId,
            accountUsername,
            timestamp: new Date().toISOString(),
            data: {
              userId: follow.source?.id_str || '',
              username: follow.source?.screen_name || '',
            },
          })
        }
      }
    }

    // 处理点赞事件
    if (payload.favorite_events) {
      for (const fav of payload.favorite_events) {
        socialEventBus.emit({
          id: `x_like_${Date.now()}`,
          type: 'like',
          platform: 'twitter',
          accountId,
          accountUsername,
          timestamp: new Date().toISOString(),
          data: {
            userId: fav.user?.id_str || '',
            username: fav.user?.screen_name || '',
            tweetId: fav.favorited_status?.id_str || '',
          },
        })
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err: any) {
    console.error('[X Webhook] POST error:', err)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
