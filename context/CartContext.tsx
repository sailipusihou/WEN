'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ShoppingBag } from 'lucide-react'
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

// 登录态：顾客登录后后端写入 user_token cookie
function hasUserToken(): boolean {
  if (typeof document === 'undefined') return false
  return /(?:^|;\s*)user_token=/.test(document.cookie)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  // 加入成功后的轻量提示（含下单引导）
  const [justAdded, setJustAdded] = useState<CartItem | null>(null)
  const { currency } = useCurrency()

  useEffect(() => {
    setItems(loadCart())
    setIsLoggedIn(hasUserToken())
  }, [])

  // ESC 关闭提示
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setJustAdded(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 任何人都可以加入购物车；下单环节再要求登录
  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setIsLoggedIn(hasUserToken())
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

  return (
    <CartContext.Provider value={value}>
      {children}

      {/* ===== 已加入购物车：精致小卡片 ===== */}
      <AnimatePresence>
        {justAdded && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setJustAdded(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-[300px] bg-white rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#EDE8DC] px-5 py-6"
            >
              <button
                onClick={() => setJustAdded(null)}
                aria-label="Close"
                className="absolute top-3 right-3 p-1 text-[#6B6B6B]/30 hover:text-[#6B6B6B] transition-colors"
              >
                <X size={14} />
              </button>

              <div className="text-center mb-4">
                <div className="mx-auto w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mb-2.5">
                  <Check size={16} strokeWidth={2} className="text-green-600" />
                </div>
                <h3 className="font-en text-base text-[#2C2C2C] tracking-tight">Added to Cart</h3>
                {totalItems > 0 && (
                  <p className="font-sans text-[10px] text-[#6B6B6B]/60 mt-1">
                    {totalItems} {totalItems > 1 ? 'items' : 'item'} in cart
                  </p>
                )}
              </div>

              {/* 商品预览（更紧凑） */}
              <div className="flex items-center gap-2.5 px-2.5 py-2 bg-[#F8F5F0] rounded-sm mb-4">
                {justAdded.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={justAdded.image}
                    alt=""
                    className="w-9 h-9 object-cover rounded-sm bg-white flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[11px] text-[#2C2C2C] truncate leading-tight">
                    {justAdded.nameEn || justAdded.name}
                  </p>
                  <p className="font-sans text-[10px] text-[#6B6B6B]/70 mt-0.5">
                    {formatPrice(convertPrice(justAdded.price, currency), currency)}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Link
                  href="/checkout"
                  onClick={() => setJustAdded(null)}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#2C2C2C] text-white text-[10px] tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors rounded-sm"
                >
                  <ShoppingBag size={12} strokeWidth={1.5} /> Checkout
                </Link>
                <button
                  onClick={() => setJustAdded(null)}
                  className="w-full py-1.5 font-sans text-[10px] text-[#6B6B6B]/60 hover:text-[#6B6B6B] transition-colors"
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
