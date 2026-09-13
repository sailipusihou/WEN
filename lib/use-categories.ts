'use client'

/**
 * 分类数据统一入口。
 *
 * 背景：前台多处曾把分类名硬编码成旧品牌的三个 slug
 * （cultural-gifts / home-decor / creative-gifts），而真实分类是
 * tea-ceremony / ceramic-art / incense-rituals / …，
 * 结果是每张商品卡都落到 else 分支、显示成 "Gift Ideas"。
 *
 * 现在统一从 /api/categories 取真实分类，模块级缓存 + 并发去重，
 * 全站只请求一次。
 */
import { useEffect, useState } from 'react'
import type { Category } from '@/lib/products'

let cache: Category[] | null = null
let inflight: Promise<Category[]> | null = null

export function fetchCategories(): Promise<Category[]> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = fetch('/api/categories', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then((list: unknown) => {
        cache = Array.isArray(list) ? (list as Category[]) : []
        inflight = null
        return cache
      })
      .catch(() => {
        inflight = null
        return [] as Category[]
      })
  }
  return inflight
}

/** slug（或旧 id）→ 展示名；找不到时用 slug 本身美化，绝不回退到错误分类 */
export function categoryLabel(list: Category[], slug?: string | null, lang: 'en' | 'zh' = 'en'): string {
  if (!slug) return ''
  const key = String(slug)
  const found = list.find(c => c.slug === key || (c as any).id === key)
  if (found) {
    const name = lang === 'en' ? (found.nameEn || found.name) : (found.name || found.nameEn)
    if (name) return name
  }
  return key.replace(/[-_]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cache || [])

  useEffect(() => {
    let alive = true
    fetchCategories().then(list => { if (alive) setCategories(list) })
    return () => { alive = false }
  }, [])

  return {
    categories,
    labelFor: (slug?: string | null, lang: 'en' | 'zh' = 'en') => categoryLabel(categories, slug, lang),
  }
}
