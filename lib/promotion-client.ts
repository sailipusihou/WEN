'use client'

import { useEffect, useState } from 'react'
import { computePromotionForProduct, type Promotion } from '@/lib/promotion-shared'

// 修复 H13: 原 cached/cachedAt 只写不读, 每个商品卡片各自发起 /api/promotions 请求。
// 现在: 30s TTL 缓存 + 共享 in-flight 请求, 同一页面多个卡片只发一次请求。
const CACHE_TTL_MS = 30 * 1000
let cached: Promotion[] | null = null
let cachedAt = 0
let inFlight: Promise<Promotion[]> | null = null

function fetchPromotions(): Promise<Promotion[]> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return Promise.resolve(cached)
  }
  if (!inFlight) {
    inFlight = fetch('/api/promotions?active=1')
      .then(r => (r.ok ? r.json() : []))
      .then((d: Promotion[]) => {
        cached = Array.isArray(d) ? d : []
        cachedAt = Date.now()
        return cached
      })
      .catch(() => [])
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

export function useActivePromotions(): Promotion[] {
  const [promos, setPromos] = useState<Promotion[]>(() => {
    // 初始渲染直接用新鲜缓存, 避免闪烁与重复请求
    if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached
    return []
  })
  useEffect(() => {
    let alive = true
    fetchPromotions().then(d => {
      if (alive) setPromos(d)
    })
    return () => {
      alive = false
    }
  }, [])
  return promos
}

export function useProductPrice(product: { id: string; category: string; price: number } | null | undefined) {
  const promotions = useActivePromotions()
  if (!product) return { price: 0, originalPrice: undefined, discount: 0, promoName: undefined }
  return computePromotionForProduct(product, promotions)
}

/**
 * 购物车「促销后」小计。
 *
 * 购物车项存的是**基础价**（CartContext.addItem 传的是 product.price），
 * 而购物车页/结算页/服务端下单都会再套一次促销价，
 * 所以任何展示小计的地方都必须走这条路，否则会出现：
 *   底部购物车条显示 $93.33，购物车页却显示 $74.66 —— 客户会认为算错了。
 * 免邮进度也必须用促销后小计，因为服务端 calculateShipping 收到的就是这个值。
 */
export function useDiscountedCartSubtotal(items: { id: string; category?: string; price: number; quantity: number }[]): number {
  const promotions = useActivePromotions()
  return items.reduce((sum, it) => {
    const eff = computePromotionForProduct(
      { id: it.id, category: it.category || '', price: it.price },
      promotions
    )
    return sum + eff.price * it.quantity
  }, 0)
}
