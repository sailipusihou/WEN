'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeCtxType {
  theme: Theme
  toggle: () => void
}

const Ctx = createContext<ThemeCtxType>({ theme: 'dark', toggle: () => {} })

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('admin_theme') as Theme | null
    if (saved && saved !== theme) setTheme(saved)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-admin-theme', theme)
      localStorage.setItem('admin_theme', theme)
    }
  }, [theme, mounted])

  const toggle = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdminTheme() { return useContext(Ctx) }
