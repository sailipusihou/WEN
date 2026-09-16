'use client'

/**
 * 收藏（wishlist）的共享状态。
 *
 * 解决的问题：
 *   1) 页头收藏图标此前没有数字角标，客户不知道自己收藏了几件；
 *   2) 收藏切换是各商品卡里的裸 fetch（ProductCard 的 handleToggleWishlist），
 *      彼此不知道对方的状态 —— 在卡片上加收藏，详情页的心形不会跟着变，
 *      页头数字更无从更新。
 *
 * 登录态复用 CartContext 的判定结果（它已经探过一次 /api/auth/user），
 * 这里不再重复探测 —— 体检时定过规则：未登录就不该发这些请求。
 * 所以本 Provider 必须嵌在 CartProvider 内部。
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useCart } from '@/context/CartContext'

interface WishlistContextType {
  /** 已收藏的商品 id */
  ids: string[]
  count: number
  has: (productId: string) => boolean
  isLoggedIn: boolean
  /** 是否已从服务端取到（未登录时为 false） */
  loaded: boolean
  /**
   * 切换收藏。返回结果供调用方决定提示文案：
   *   reason='not-logged-in' → 引导登录
   *   reason='error'         → 网络/服务端错误
   */
  toggle: (productId: string) => Promise<{ ok: boolean; added: boolean; reason?: 'not-logged-in' | 'error' }>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useCart()
  const [ids, setIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // 未登录不发请求 —— 直接清空本地视图
    if (!isLoggedIn) { setIds([]); setLoaded(false); return }
    let alive = true
    fetch('/api/wishlist', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive) return
        if (d && Array.isArray(d.ids)) { setIds(d.ids); setLoaded(true) }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [isLoggedIn])

  const toggle = useCallback(async (productId: string) => {
    if (!isLoggedIn) return { ok: false, added: false, reason: 'not-logged-in' as const }
    const added = !ids.includes(productId)
    try {
      const res = await fetch('/api/wishlist', {
        method: added ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ productId }),
      })
      if (!res.ok) {
        return { ok: false, added, reason: res.status === 401 ? ('not-logged-in' as const) : ('error' as const) }
      }
      // 服务端会回最新 ids；拿不到就本地先落定，保证手感一致
      const d = await res.json().catch(() => null)
      if (d && Array.isArray(d.ids)) setIds(d.ids)
      else setIds(prev => (added ? [...prev, productId] : prev.filter(id => id !== productId)))
      return { ok: true, added }
    } catch {
      return { ok: false, added, reason: 'error' as const }
    }
  }, [isLoggedIn, ids])

  const value = useMemo<WishlistContextType>(() => ({
    ids,
    count: ids.length,
    has: (productId: string) => ids.includes(productId),
    isLoggedIn,
    loaded,
    toggle,
  }), [ids, isLoggedIn, loaded, toggle])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider')
  return ctx
}
