import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'
import { socialEventBus } from '@/lib/social-event-bus'
import { getAllSocialAccounts } from '@/lib/social-accounts'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Pinterest Webhook 端点
 * 
 * GET  — CRC 验证（Pinterest 回调验证）
 * POST — 接收 Pinterest 推送的实时事件
 */

// ===== GET: CRC 验证 =====
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challenge = searchParams.get('challenge')

  if (challenge) {
    console.log('[Pinterest Webhook] CRC verification, challenge:', challenge.substring(0, 20) + '...')
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.log('[Pinterest Webhook] GET request without challenge')
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

// ===== POST: 接收 Webhook 事件 =====
export async function POST(req: NextRequest) {
  try {
    const settings = getSettings()
    const body = await req.text()

    // 验证签名: 配置了 Webhook Secret 时, 签名必须存在且匹配 (修复: 原先缺 header 即跳过校验)
    if (settings.ptClientSecret) {
      const signature = req.headers.get('x-pinterest-signature') || ''
      if (!signature) {
        console.warn('[Pinterest Webhook] Missing signature header')
        return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
      }
      const expectedSig = crypto.createHmac('sha256', settings.ptClientSecret).update(body).digest('hex')
      if (signature !== expectedSig) {
        console.warn('[Pinterest Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    } else {
      console.warn('[Pinterest Webhook] No webhook secret configured — signature verification disabled')
    }

    const payload = JSON.parse(body)
    console.log('[Pinterest Webhook] Received event, type:', payload.event_type, 'SSE listeners:', socialEventBus.getListenerCount())

    processPinterestEvents(payload)

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err: any) {
    console.error('[Pinterest Webhook] POST error:', err)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

/**
 * 处理 Pinterest Webhook 事件
 */
function processPinterestEvents(payload: any) {
  const allAccounts = getAllSocialAccounts()
  const ptAccounts = allAccounts.filter(a => a.platform === 'pinterest' && a.status === 'connected')

  if (ptAccounts.length === 0) {
    console.log('[Pinterest Webhook] No connected Pinterest accounts found, skipping event')
    return
  }

  const eventType = payload.event_type || 'unknown'
  const data = payload.data || {}
  const userId = data.user_id || payload.owner_user_id || ''

  // 找到对应的系统账号：优先按 platformUserId 匹配，其次按 platformId，最后使用第一个已连接账号
  let account = ptAccounts.find(a => a.platformUserId && a.platformUserId === userId)
  if (!account) {
    account = ptAccounts.find(a => a.platformId && a.platformId === userId)
  }
  if (!account) {
    account = ptAccounts[0]
    console.log('[Pinterest Webhook] No exact account match for userId:', userId, 'using first connected account:', account.username)
  }
  const accountUsername = account?.username || 'unknown'
  const accountId = account?.id || ''

  switch (eventType) {
    case 'pin_comment':
      // 评论事件
      socialEventBus.emit({
        id: `pt_comment_${data.comment_id || Date.now()}`,
        type: 'comment',
        platform: 'pinterest',
        accountId,
        accountUsername,
        timestamp: data.created_at || new Date().toISOString(),
        data: {
          commentId: data.comment_id,
          pinId: data.pin_id,
          text: data.text || '',
          username: data.commenter?.username || '',
          userId: data.commenter?.id || '',
          pinTitle: data.pin_title || '',
          pinImageUrl: data.pin_image_url || '',
        },
      })
      console.log('[Pinterest Webhook] Pin comment from @' + (data.commenter?.username || 'unknown'))
      break

    case 'pin':
      // Pin 创建/更新事件
      socialEventBus.emit({
        id: `pt_pin_${data.pin_id || Date.now()}`,
        type: 'insight',
        platform: 'pinterest',
        accountId,
        accountUsername,
        timestamp: data.created_at || new Date().toISOString(),
        data: {
          pinId: data.pin_id,
          title: data.pin_title || '',
          action: data.action || 'update',
          boardId: data.board_id || '',
        },
      })
      console.log('[Pinterest Webhook] Pin event:', data.action || 'update')
      break

    case 'board':
      // Board 事件
      socialEventBus.emit({
        id: `pt_board_${data.board_id || Date.now()}`,
        type: 'insight',
        platform: 'pinterest',
        accountId,
        accountUsername,
        timestamp: new Date().toISOString(),
        data: {
          boardId: data.board_id,
          boardName: data.board_name || '',
          action: data.action || 'update',
        },
      })
      console.log('[Pinterest Webhook] Board event:', data.action || 'update')
      break

    default:
      console.log('[Pinterest Webhook] Unknown event type:', eventType, JSON.stringify(data).substring(0, 200))
  }
}