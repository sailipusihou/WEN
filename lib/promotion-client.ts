'use client'

import { useEffect, useState } from 'react'
import { computePromotionForProduct, type Promotion } from '@/lib/promotion-shared'

let cached: Promotion[] | null = null
let cachedAt = 0

export function useActivePromotions(): Promotion[] {
  const [promos, setPromos] = useState<Promotion[]>(cached || [])
  useEffect(() => {
    let alive = true
    if (cached && Date.now() - cachedAt < 60_000) {
      setPromos(cached)
      return
    }
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
