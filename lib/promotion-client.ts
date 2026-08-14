'use client'

import { useEffect, useState } from 'react'
import { computePromotionForProduct, type Promotion } from '@/lib/promotion-shared'

// Cache disabled: ensure real-time promotion pricing based on current product prices
let cached: Promotion[] | null = null
let cachedAt = 0

export function useActivePromotions(): Promotion[] {
  const [promos, setPromos] = useState<Promotion[]>([])
  useEffect(() => {
    let alive = true
    // Always fetch fresh promotions to ensure pricing is based on current product prices
    fetch('/api/promotions?active=1')
      .then(r => (r.ok ? r.json() : []))
      .then((d: Promotion[]) => {
        if (!alive) return
        if (Array.isArray(d)) {
          cached = d
          cachedAt = Date.now()
          setPromos(d)
        }
      })
      .catch(() => {})
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
