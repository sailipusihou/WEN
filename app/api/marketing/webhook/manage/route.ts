import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/settings'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Webhook 订阅管理 API
 * 
 * GET  — 获取当前 webhook 配置状态
 * POST — 保存 webhook 配置（verify token, base URL）
 * PUT  — 触发订阅/取消订阅到 Meta 平台
 */

export async function GET(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const settings = getSettings()

    return NextResponse.json({
      success: true,
      config: {
        webhookVerifyToken: settings.webhookVerifyToken ? '***configured***' : '',
        webhookBaseUrl: settings.webhookBaseUrl,
        webhookIgSubscribed: settings.webhookIgSubscribed,
        webhookFbSubscribed: settings.webhookFbSubscribed,
        webhookXSubscribed: settings.webhookXSubscribed,
        webhookPtSubscribed: settings.webhookPtSubscribed,
        metaWebhookUrl: settings.webhookBaseUrl ? `${settings.webhookBaseUrl}/api/marketing/webhook/meta` : '',
        xWebhookUrl: settings.webhookBaseUrl ? `${settings.webhookBaseUrl}/api/marketing/webhook/x` : '',
        pinterestWebhookUrl: settings.webhookBaseUrl ? `${settings.webhookBaseUrl}/api/marketing/webhook/pinterest` : '',
        sseStreamUrl: '/api/marketing/events/stream',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { webhookVerifyToken, webhookBaseUrl, metaAppSecret } = body

    const updates: Record<string, any> = {}
    if (webhookVerifyToken !== undefined) updates.webhookVerifyToken = webhookVerifyToken.trim()
    if (webhookBaseUrl !== undefined) updates.webhookBaseUrl = webhookBaseUrl.trim()
    if (metaAppSecret !== undefined) updates.metaAppSecret = metaAppSecret.trim()

    saveSettings(updates)

    return NextResponse.json({ success: true, message: 'Webhook configuration saved' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'messages_view')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { platform, action } = body // platform: 'instagram' | 'facebook' | 'x', action: 'subscribe' | 'unsubscribe'

    if (!platform || !action) {
      return NextResponse.json({ error: 'Missing platform or action' }, { status: 400 })
    }

    const settings = getSettings()

    if (!settings.webhookVerifyToken || !settings.webhookBaseUrl) {
      return NextResponse.json({ error: 'Webhook not configured. Set verify token and base URL first.' }, { status: 400 })
    }

    if (platform === 'instagram' || platform === 'facebook') {
      // Meta 平台订阅：需要调用 Meta API 注册 webhook
      // 这通常在 Meta 开发者平台手动完成，这里提供辅助说明
      const field = platform === 'instagram' ? 'webhookIgSubscribed' : 'webhookFbSubscribed'
      
      if (action === 'subscribe') {
        // 在实际生产中，这里会调用 Meta App subscriptions API
        // POST https://graph.facebook.com/v18.0/{app-id}/subscriptions
        // 目前标记为已订阅（需要开发者在 Meta 后台手动配置或使用 App Access Token）
        saveSettings({ [field]: true })
        return NextResponse.json({
          success: true,
          message: `${platform} webhook marked as subscribed. Make sure to configure the webhook in Meta Developer Console.`,
          webhookUrl: `${settings.webhookBaseUrl}/api/marketing/webhook/meta`,
          verifyToken: settings.webhookVerifyToken,
          fields: platform === 'instagram' 
            ? 'comments,messages,mentions' 
            : 'feed,messages,follows,ratings',
        })
      } else {
        saveSettings({ [field]: false })
        return NextResponse.json({ success: true, message: `${platform} webhook unsubscribed` })
      }
    }

    if (platform === 'x') {
      if (action === 'subscribe') {
        // X/Twitter Account Activity API 需要在开发者门户配置
        saveSettings({ webhookXSubscribed: true })
        return NextResponse.json({
          success: true,
          message: 'X webhook marked as subscribed. Configure in Twitter Developer Portal.',
          webhookUrl: `${settings.webhookBaseUrl}/api/marketing/webhook/x`,
          crcUrl: `${settings.webhookBaseUrl}/api/marketing/webhook/x`,
        })
      } else {
        saveSettings({ webhookXSubscribed: false })
        return NextResponse.json({ success: true, message: 'X webhook unsubscribed' })
      }
    }

    if (platform === 'pinterest') {
      if (action === 'subscribe') {
        // Pinterest Webhook 需要在开发者门户配置
        saveSettings({ webhookPtSubscribed: true })
        return NextResponse.json({
          success: true,
          message: 'Pinterest webhook marked as subscribed. Configure in Pinterest Developer Portal.',
          webhookUrl: `${settings.webhookBaseUrl}/api/marketing/webhook/pinterest`,
          fields: 'pin_comment,pin,board',
        })
      } else {
        saveSettings({ webhookPtSubscribed: false })
        return NextResponse.json({ success: true, message: 'Pinterest webhook unsubscribed' })
      }
    }

    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
