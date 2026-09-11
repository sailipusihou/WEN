import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'
import { socialEventBus, SocialEvent } from '@/lib/social-event-bus'
import { getSocialAccountById, getAllSocialAccounts } from '@/lib/social-accounts'
import { invalidateCacheKey } from '@/lib/marketing-cache'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Meta Webhook (Instagram + Facebook) 端点
 * 
 * GET  — Webhook 验证（Meta 回调验证）
 * POST — 接收 Meta 推送的实时事件（评论、私信、提及等）
 */

// ===== GET: Webhook 验证 =====
export async function GET(req: NextRequest) {
  const settings = getSettings()
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('[Meta Webhook] Verification request:', { mode, token: token ? '***' : 'missing' })

  if (mode === 'subscribe' && token === settings.webhookVerifyToken) {
    console.log('[Meta Webhook] Verification successful')
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  console.warn('[Meta Webhook] Verification failed')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ===== POST: 接收 Webhook 事件 =====
export async function POST(req: NextRequest) {
  try {
    // 验证签名（修复 S6: 密钥未配置时拒绝事件而非放行, 签名缺失/不符一律 403）
    const settings = getSettings()
    const body = await req.text()
    const signature = req.headers.get('x-hub-signature-256') || ''

    // 签名验证：Meta App Secret 或 IG/FB Client Secret 任一匹配即可
    // （Instagram 产品可能使用独立 Instagram App 的密钥签名）
    const candidateSecrets = [settings.metaAppSecret, settings.igClientSecret, settings.fbClientSecret].filter(Boolean) as string[]
    if (candidateSecrets.length === 0) {
      console.warn('[Meta Webhook] No app secret configured — rejecting event (secure default)')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 403 })
    }
    const valid = candidateSecrets.some(
      (s) => signature === 'sha256=' + crypto.createHmac('sha256', s).update(body).digest('hex')
    )
    if (!valid) {
      console.warn('[Meta Webhook] Invalid signature', { received: signature ? 'present' : 'missing', secretsTried: candidateSecrets.length })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const payload = JSON.parse(body)
    console.log('[Meta Webhook] Received event, object:', payload.object, 'entries:', payload.entry?.length, 'SSE listeners:', socialEventBus.getListenerCount())

    // Meta 发送的 webhook 格式: { object: "instagram"|"page", entry: [...] }
    if (payload.object === 'instagram') {
      processInstagramEvents(payload.entry || [])
    } else if (payload.object === 'page') {
      processFacebookEvents(payload.entry || [])
    } else {
      console.log('[Meta Webhook] Unknown object type:', payload.object)
    }

    // 有事件到达：失效对应平台缓存，让下一次轮询立即拉取最新（不等待 8s TTL）
    invalidateCacheKey('ig-dms:')
    invalidateCacheKey('fb-dms:')
    invalidateCacheKey('x-dms:')

    // Meta 要求必须返回 200
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err: any) {
    console.error('[Meta Webhook] POST error:', err)
    // 仍然返回 200 避免 Meta 重试
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

/**
 * 处理 Instagram Webhook 事件
 */
function processInstagramEvents(entries: any[]) {
  const allAccounts = getAllSocialAccounts()
  // 不限制 status === 'connected'，Webhook 事件由 Meta 主动推送，不需要账号已连接
  const igAccounts = allAccounts.filter(a => a.platform === 'instagram')

  for (const entry of entries) {
    const igBusinessId = entry.id

    // 找到对应的系统账号
    const account = igAccounts.find(a => a.platformUserId === igBusinessId || a.platformId === igBusinessId)
    const accountUsername = account?.username || 'unknown'
    const accountId = account?.id || ''

    // 评论事件
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          const commentData = change.value
          socialEventBus.emit({
            id: `ig_comment_${commentData.comment_id || Date.now()}`,
            type: 'comment',
            platform: 'instagram',
            accountId,
            accountUsername,
            timestamp: new Date().toISOString(),
            data: {
              commentId: commentData.comment_id,
              mediaId: commentData.media_id,
              text: commentData.text,
              username: commentData.from?.username || commentData.from?.name || '',
              userId: commentData.from?.id || '',
              mediaPermalink: commentData.media?.permalink || '',
            },
          })
          console.log('[Meta Webhook] IG comment from @' + (commentData.from?.username || 'unknown'))
        }

        if (change.field === 'mentions') {
          const mentionData = change.value
          socialEventBus.emit({
            id: `ig_mention_${mentionData.comment_id || Date.now()}`,
            type: 'mention',
            platform: 'instagram',
            accountId,
            accountUsername,
            timestamp: new Date().toISOString(),
            data: {
              commentId: mentionData.comment_id,
              mediaId: mentionData.media_id,
              text: mentionData.text || '',
              username: mentionData.from?.username || '',
            },
          })
        }
      }
    }

    // 私信事件 (Instagram Messaging)
    if (entry.messaging) {
      for (const message of entry.messaging) {
        socialEventBus.emit({
          id: `ig_dm_${message.message?.mid || Date.now()}`,
          type: 'dm',
          platform: 'instagram',
          accountId,
          accountUsername,
          timestamp: message.timestamp ? new Date(Number(message.timestamp)).toISOString() : new Date().toISOString(),
          data: {
            senderId: message.sender?.id || '',
            senderName: message.sender?.username || message.sender?.name || '',
            recipientId: message.recipient?.id || '',
            text: message.message?.text || '',
            messageId: message.message?.mid || '',
          },
        })
        console.log('[Meta Webhook] IG DM from', message.sender?.username || message.sender?.id)
      }
    }
  }
}

/**
 * 处理 Facebook Page Webhook 事件
 */
function processFacebookEvents(entries: any[]) {
  const allAccounts = getAllSocialAccounts()
  // 不限制 status === 'connected'，Webhook 事件由 Meta 主动推送，不需要账号已连接
  const fbAccounts = allAccounts.filter(a => a.platform === 'facebook')

  for (const entry of entries) {
    const pageId = entry.id

    const account = fbAccounts.find(a => a.platformUserId === pageId || a.platformId === pageId)
    const accountUsername = account?.username || 'unknown'
    const accountId = account?.id || ''

    // 评论事件
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'feed') {
          const feedData = change.value
          if (feedData.item === 'comment') {
            socialEventBus.emit({
              id: `fb_comment_${feedData.comment_id || Date.now()}`,
              type: 'comment',
              platform: 'facebook',
              accountId,
              accountUsername,
              timestamp: feedData.created_time || new Date().toISOString(),
              data: {
                commentId: feedData.comment_id,
                postId: feedData.post_id,
                text: feedData.message || '',
                username: feedData.from?.name || '',
                userId: feedData.from?.id || '',
                permalink: feedData.permalink_url || '',
              },
            })
            console.log('[Meta Webhook] FB comment from', feedData.from?.name)
          } else if (feedData.item === 'post' || feedData.item === 'status') {
            // 帖子/动态更新事件
            socialEventBus.emit({
              id: `fb_post_${feedData.post_id || Date.now()}`,
              type: 'comment',
              platform: 'facebook',
              accountId,
              accountUsername,
              timestamp: feedData.created_time || new Date().toISOString(),
              data: {
                commentId: feedData.post_id,
                postId: feedData.post_id,
                text: feedData.message || feedData.story || '',
                username: feedData.from?.name || '',
                userId: feedData.from?.id || '',
                permalink: feedData.permalink_url || '',
              },
            })
            console.log('[Meta Webhook] FB post from', feedData.from?.name)
          } else {
            console.log('[Meta Webhook] FB feed item type:', feedData.item, 'verb:', feedData.verb)
          }
        }
      }
    }

    // 私信事件 (Facebook Messaging)
    if (entry.messaging) {
      for (const message of entry.messaging) {
        socialEventBus.emit({
          id: `fb_dm_${message.message?.mid || Date.now()}`,
          type: 'dm',
          platform: 'facebook',
          accountId,
          accountUsername,
          timestamp: message.timestamp ? new Date(Number(message.timestamp)).toISOString() : new Date().toISOString(),
          data: {
            senderId: message.sender?.id || '',
            senderName: message.sender?.name || '',
            recipientId: message.recipient?.id || '',
            text: message.message?.text || '',
            messageId: message.message?.mid || '',
          },
        })
        console.log('[Meta Webhook] FB DM from', message.sender?.name || message.sender?.id)
      }
    }

    // 其他事件（点赞、关注等）
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'ratings' || change.field === 'likes') {
          const likeData = change.value
          socialEventBus.emit({
            id: `fb_like_${Date.now()}`,
            type: 'like',
            platform: 'facebook',
            accountId,
            accountUsername,
            timestamp: new Date().toISOString(),
            data: {
              userId: likeData.user_id || likeData.sender_id || '',
              pageId,
            },
          })
        }
        if (change.field === 'follows') {
          const followData = change.value
          socialEventBus.emit({
            id: `fb_follow_${Date.now()}`,
            type: 'follow',
            platform: 'facebook',
            accountId,
            accountUsername,
            timestamp: new Date().toISOString(),
            data: {
              userId: followData.user_id || '',
            },
          })
        }
      }
    }
  }
}
