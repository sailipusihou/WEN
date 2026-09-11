'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Check, X, ShoppingBag, ArrowRight } from 'lucide-react'
import type { CartItem } from '@/lib/cart-types'
import { formatPrice, convertPrice } from '@/lib/cart-types'
import { useCurrency } from '@/context/CurrencyContext'

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  isLoggedIn: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('otm_cart')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

// 登录态判断：顾客登录后后端会写入 user_token cookie
function hasUserToken(): boolean {
  if (typeof document === 'undefined') return false
  return /(?:^|;\s*)user_token=/.test(document.cookie)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  // 未登录时点击加入购物车 → 弹出登录引导
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  // 已登录加入成功 → 弹出下单引导
  const [justAdded, setJustAdded] = useState<CartItem | null>(null)
  const { currency } = useCurrency()

  useEffect(() => {
    setItems(loadCart())
    setIsLoggedIn(hasUserToken())
  }, [])

  // ESC 关闭提示弹窗
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAuthPrompt(false)
        setJustAdded(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    // 未登录：不允许加入购物车，提示先创建账户/登录
    if (!hasUserToken()) {
      setIsLoggedIn(false)
      setJustAdded(null)
      setShowAuthPrompt(true)
      return
    }

    setIsLoggedIn(true)
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      let updated: CartItem[]
      if (existing) {
        updated = prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      } else {
        updated = [...prev, { ...item, quantity: 1 }]
      }
      localStorage.setItem('otm_cart', JSON.stringify(updated))
      return updated
    })
    // 加入成功 → 引导下单
    setShowAuthPrompt(false)
    setJustAdded({ ...item, quantity: 1 })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.id !== id)
      localStorage.setItem('otm_cart', JSON.stringify(updated))
      return updated
    })
  }, [])

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty < 1) return removeItem(id)
    setItems(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, quantity: qty } : i)
      localStorage.setItem('otm_cart', JSON.stringify(updated))
      return updated
    })
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem('otm_cart')
  }, [])

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items])

  const value = useMemo(() => ({
    items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, isLoggedIn
  }), [items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, isLoggedIn])

  const redirectParam = typeof window !== 'undefined'
    ? `?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
    : ''

  return (
    <CartContext.Provider value={value}>
      {children}

      {/* ===== 未登录：引导创建账户 / 登录 ===== */}
      <AnimatePresence>
        {showAuthPrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAuthPrompt(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-[420px] bg-white rounded-lg shadow-2xl p-8 text-center"
            >
              <button
                onClick={() => setShowAuthPrompt(false)}
                aria-label="Close"
                className="absolute top-4 right-4 p-1 text-otb-slate/40 hover:text-otb-slate transition-colors"
              >
                <X size={18} />
              </button>

              <div className="mx-auto w-14 h-14 rounded-full bg-otb-jade/10 flex items-center justify-center mb-5">
                <Lock size={24} className="text-otb-jade" />
              </div>

              <h3 className="font-en text-2xl text-otb-ink mb-3">Sign in to add items</h3>
              <p className="font-sans text-sm text-otb-slate/80 leading-relaxed mb-7">
                Create a free account or sign in to add items to your cart and complete your order.
              </p>

              <div className="space-y-3">
                <Link
                  href={`/register${redirectParam}`}
                  onClick={() => setShowAuthPrompt(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-otb-ink text-white font-sans text-sm tracking-wide hover:bg-otb-jade transition-colors rounded-sm"
                >
                  Create Account <ArrowRight size={15} />
                </Link>
                <Link
                  href={`/login${redirectParam}`}
                  onClick={() => setShowAuthPrompt(false)}
                  className="flex items-center justify-center w-full py-3 border border-otb-ink/20 text-otb-ink font-sans text-sm tracking-wide hover:border-otb-ink transition-colors rounded-sm"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => setShowAuthPrompt(false)}
                  className="w-full py-2 font-sans text-xs text-otb-slate/60 hover:text-otb-slate transition-colors"
                >
                  Continue browsing
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 已登录：加入成功 → 引导下单 ===== */}
      <AnimatePresence>
        {justAdded && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setJustAdded(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-[420px] bg-white rounded-lg shadow-2xl p-8"
            >
              <button
                onClick={() => setJustAdded(null)}
                aria-label="Close"
                className="absolute top-4 right-4 p-1 text-otb-slate/40 hover:text-otb-slate transition-colors"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <Check size={26} className="text-green-600" />
                </div>
                <h3 className="font-en text-2xl text-otb-ink">Added to Cart</h3>
                <p className="font-sans text-sm text-otb-slate/70 mt-2">
                  {totalItems > 1 ? `${totalItems} items in your cart` : '1 item in your cart'}
                </p>
              </div>

              {/* 商品预览 */}
              <div className="flex items-center gap-3 p-3 bg-otb-paper/60 rounded-sm mb-6">
                {justAdded.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={justAdded.image}
                    alt=""
                    className="w-14 h-14 object-cover rounded-sm bg-white flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-otb-ink truncate">{justAdded.nameEn || justAdded.name}</p>
                  <p className="font-sans text-xs text-otb-slate/70 mt-1">
                    {formatPrice(convertPrice(justAdded.price, currency), currency)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href="/checkout"
                  onClick={() => setJustAdded(null)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-otb-ink text-white font-sans text-sm tracking-wide hover:bg-otb-jade transition-colors rounded-sm"
                >
                  <ShoppingBag size={15} /> Proceed to Checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setJustAdded(null)}
                  className="flex items-center justify-center w-full py-3 border border-otb-ink/20 text-otb-ink font-sans text-sm tracking-wide hover:border-otb-ink transition-colors rounded-sm"
                >
                  View Cart
                </Link>
                <button
                  onClick={() => setJustAdded(null)}
                  className="w-full py-2 font-sans text-xs text-otb-slate/60 hover:text-otb-slate transition-colors"
                >
                  Continue shopping
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
