'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Currency } from '@/lib/cart-types'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (c: Currency) => void
  toggleCurrency: () => void
}

// 定价基线已统一为 USD: 前台固定美元显示。
// 移除 localStorage 偏好读取 (残留的 CNY 偏好会导致前台错误显示人民币)。
const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const currency: Currency = 'USD'
  const setCurrency = () => {}
  const toggleCurrency = () => {}

  const value = useMemo(() => ({
    currency, setCurrency, toggleCurrency
  }), [currency, setCurrency, toggleCurrency])

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}