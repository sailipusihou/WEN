'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, Loader2 } from 'lucide-react'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import OptimizedImage from '@/components/ui/OptimizedImage'

interface SearchSuggestion {
  id: string
  name: string
  subtitle: string
  image: string
  price: number
  category: string
}

export default function SearchBox({ onClose }: { onClose?: () => void }) {
  const { currency } = useCurrency()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setSuggestions([])
      setLoading(false)
      setSelectedIndex(-1)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=8`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data || [])
          setSelectedIndex(-1)
        }
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      onClose?.()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        router.push(`/products/${suggestions[selectedIndex].id}`)
        setIsOpen(false)
        onClose?.()
      } else if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
        setIsOpen(false)
        onClose?.()
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/40 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products..."
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FBFAF7] border border-[#F7F0DE] focus:border-[#5F7D72] focus:outline-none transition-colors font-sans text-ink"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); inputRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/40 hover:text-ink transition-colors"
            aria-label="Clear search"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
        {loading && (
          <Loader2
            size={16}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-[#5F7D72] animate-spin"
          />
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#FFFFFF] border border-[#F7F0DE] shadow-lg max-h-[400px] overflow-y-auto z-50">
          {suggestions.length > 0 ? (
            <>
              {suggestions.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  onClick={() => { setIsOpen(false); onClose?.() }}
                  className={`flex items-center gap-3 p-3 transition-colors border-b border-[#F7F0DE]/50 last:border-0 ${
                    selectedIndex === index ? 'bg-[#FBFAF7]' : 'hover:bg-[#FBFAF7]'
                  }`}
                >
                  <div className="relative w-12 h-12 shrink-0 overflow-hidden bg-[#F7F0DE]">
                    <OptimizedImage
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="48px"
                      objectFit="cover"
                      placeholder="blur"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-en text-xs text-ink font-medium truncate">
                      {item.name}
                    </h4>
                    <p className="font-sans text-micro text-ink-soft/50 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                  <span className="font-en text-xs font-medium text-ink shrink-0">
                    {formatPrice(convertPrice(item.price, currency), currency)}
                  </span>
                </Link>
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => { setIsOpen(false); onClose?.() }}
                className="block text-center py-3 text-micro text-[#5F7D72] hover:bg-[#FBFAF7] transition-colors tracking-[0.18em] uppercase font-sans font-medium"
              >
                View all results
              </Link>
            </>
          ) : !loading ? (
            <div className="p-6 text-center">
              <p className="font-sans text-xs text-ink-soft/50">
                No products found for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
