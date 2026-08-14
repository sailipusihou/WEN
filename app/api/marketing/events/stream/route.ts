import { NextRequest } from 'next/server'
import { socialEventBus, SocialEvent } from '@/lib/social-event-bus'
import { requirePermission } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * SSE (Server-Sent Events) 实时推送端点
 * 使用 ReadableStream 实现，兼容 Next.js 开发模式
 */
export async function GET(req: NextRequest) {
  // 权限验证
  const auth = requirePermission(req, 'messages_view')
  if ('error' in auth) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since') || ''
  const typesFilter = searchParams.get('types')?.split(',').filter(Boolean) || []
  const platformsFilter = searchParams.get('platforms')?.split(',').filter(Boolean) || []

  const encoder = new TextEncoder()
  let closed = false
  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let guard: ReturnType<typeof setTimeout> | null = null

  // 修复: 集中清理 — cancel/abort/超时都会执行, 防止定时器与订阅泄漏
  const cleanup = () => {
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null }
    if (guard) { clearTimeout(guard); guard = null }
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      // 发送 SSE 数据
      const send = (data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          close()
        }
      }

      const close = () => {
        if (closed) return
        closed = true
        cleanup()
        try { controller.close() } catch { /* ignore */ }
        console.log('[SSE Stream] Connection closed and cleaned up')
      }

      // 发送 SSE 事件
      const sendEvent = (event: SocialEvent) => {
        if (typesFilter.length > 0 && !typesFilter.includes(event.type)) return
        if (platformsFilter.length > 0 && !platformsFilter.includes(event.platform)) return
        send(`data: ${JSON.stringify(event)}\n\n`)
        console.log('[SSE Stream] Event sent:', event.type, event.platform)
      }

      // 发送连接确认
      send(`event: connected\ndata: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        listenerCount: socialEventBus.getListenerCount(),
      })}\n\n`)

      // 发送缓存的历史事件
      if (since) {
        const recentEvents = socialEventBus.getRecentEvents(since)
        for (const event of recentEvents) {
          sendEvent(event)
        }
      }

      // 订阅事件总线
      unsubscribe = socialEventBus.subscribe(sendEvent)
      console.log('[SSE Stream] Client connected, listeners:', socialEventBus.getListenerCount())

      // 心跳包
      heartbeat = setInterval(() => {
        send(':heartbeat\n\n')
      }, 15000)

      // 请求取消时清理
      ;(req as any).signal?.addEventListener('abort', () => {
        close()
      })

      // 超时保护
      guard = setTimeout(() => {
        close()
      }, 3600000)
    },
    cancel() {
      // 修复: 客户端断开时清理定时器与订阅
      closed = true
      cleanup()
      console.log('[SSE Stream] Client disconnected (stream cancelled)')
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
