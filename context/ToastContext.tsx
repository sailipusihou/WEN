'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X, ShoppingBag } from 'lucide-react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'error'
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const value = useMemo(() => ({
    toasts, addToast, removeToast
  }), [toasts, addToast, removeToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-sm shadow-lg border backdrop-blur-sm
                ${toast.type === 'success' ? 'bg-white border-green-200' : toast.type === 'error' ? 'bg-white border-red-200' : 'bg-white border-blue-200'}`}
            >
              <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-green-100' : toast.type === 'error' ? 'bg-red-100' : 'bg-blue-100'}`}>
                {toast.type === 'success' ? <CheckCircle size={16} className="text-green-600" /> :
                 toast.type === 'error' ? <X size={16} className="text-red-600" /> :
                 <ShoppingBag size={16} className="text-blue-600" />}
              </div>
              <span className="font-sans text-sm text-otb-ink min-w-[160px] max-w-[280px]">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="text-otb-slate/40 hover:text-otb-slate transition-colors ml-2">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}