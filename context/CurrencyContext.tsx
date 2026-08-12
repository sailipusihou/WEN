'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { Currency } from '@/lib/cart-types'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (c: Currency) => void
  toggleCurrency: () => void
}

const STORAGE_KEY = 'otm_currency'

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

function isValidCurrency(v: string): v is Currency {
  return v === 'USD' || v === 'CNY'
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && isValidCurrency(stored)) {
        setCurrencyState(stored)
      }
    } catch {}
  }, [])

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    try { localStorage.setItem(STORAGE_KEY, c) } catch {}
  }, [])

  const toggleCurrency = useCallback(() => {
    setCurrencyState(prev => {
      const next = prev === 'USD' ? 'CNY' : 'USD'
      try { localStorage.setItem(STORAGE_KEY, next) } catch {}
      return next
    })
  }, [])

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