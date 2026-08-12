/**
 * 社交营销实时事件总线
 * 用于 Webhook → SSE 的消息传递，实现平台事件实时推送到前端
 *
 * 使用 globalThis 持久化单例，确保 Next.js 开发模式下
 * 不同路由编译后仍共享同一个事件总线实例
 */

export interface SocialEvent {
  id: string
  type: 'comment' | 'dm' | 'mention' | 'like' | 'follow' | 'insight' | 'workflow'
  platform: 'instagram' | 'twitter' | 'facebook' | 'pinterest' | 'internal'
  accountId: string
  accountUsername: string
  timestamp: string
  data: Record<string, any>
}

type EventListener = (event: SocialEvent) => void

class SocialEventBus {
  private listeners: Set<EventListener> = new Set()
  private recentEvents: SocialEvent[] = []
  private maxRecent = 100

  /**
   * 发布事件到所有监听器
   */
  emit(event: SocialEvent): void {
    this.recentEvents.push(event)
    if (this.recentEvents.length > this.maxRecent) {
      this.recentEvents.shift()
    }
    console.log('[SocialEventBus] Emitting event:', event.type, event.platform, 'to', this.listeners.size, 'listeners')
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (err) {
        console.error('[SocialEventBus] Listener error:', err)
      }
    }
  }

  /**
   * 订阅事件流
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener)
    console.log('[SocialEventBus] Listener added, total:', this.listeners.size)
    return () => {
      this.listeners.delete(listener)
      console.log('[SocialEventBus] Listener removed, total:', this.listeners.size)
    }
  }

  /**
   * 获取最近的事件
   */
  getRecentEvents(since?: string): SocialEvent[] {
    if (!since) return [...this.recentEvents]
    return this.recentEvents.filter(e => new Date(e.timestamp) > new Date(since))
  }

  /**
   * 获取当前监听器数量
   */
  getListenerCount(): number {
    return this.listeners.size
  }
}

// 使用 globalThis 持久化单例，防止 Next.js HMR 导致实例丢失
const globalForBus = globalThis as unknown as { __socialEventBus?: SocialEventBus }

if (!globalForBus.__socialEventBus) {
  globalForBus.__socialEventBus = new SocialEventBus()
  console.log('[SocialEventBus] New singleton created')
} else {
  console.log('[SocialEventBus] Reusing existing singleton, listeners:', globalForBus.__socialEventBus.getListenerCount())
}

export const socialEventBus = globalForBus.__socialEventBus
