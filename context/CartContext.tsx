'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { CartItem } from '@/lib/cart-types'

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('otm_cart')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => { setItems(loadCart()) }, [])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
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
    items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal
  }), [items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}