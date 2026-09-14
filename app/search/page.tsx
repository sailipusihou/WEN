"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, X, Loader2, ArrowUpLeft, Clock, TrendingUp } from "lucide-react"
import ProductCard from "@/components/product/ProductCard"
import type { Product } from "@/lib/products"

const PAGE_SIZE = 12

const POPULAR_SEARCHES = ['celadon', 'silk', 'bamboo', 'tea', 'incense', 'ceramic']

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const loaderRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 加载搜索历史
  useEffect(() => {
    try {
      const stored = localStorage.getItem('search_history')
      if (stored) setSearchHistory(JSON.parse(stored).slice(0, 8))
    } catch {}
  }, [])

  // 保存搜索历史
  const saveSearchHistory = useCallback((q: string) => {
    if (!q.trim()) return
    try {
      const stored = localStorage.getItem('search_history')
      const history = stored ? JSON.parse(stored) : []
      const filtered = history.filter((h: string) => h.toLowerCase() !== q.toLowerCase())
      const updated = [q, ...filtered].slice(0, 8)
      localStorage.setItem('search_history', JSON.stringify(updated))
      setSearchHistory(updated)
    } catch {}
  }, [])

  const clearHistory = () => {
    localStorage.removeItem('search_history')
    setSearchHistory([])
  }

  // 执行搜索
  const performSearch = useCallback(async (q: string, pageNum: number, append: boolean) => {
    if (!q.trim()) {
      setProducts([])
      setTotal(0)
      setHasMore(false)
      setHasSearched(false)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: q.trim(),
        pageSize: String(PAGE_SIZE),
        page: String(pageNum),
        sort: 'default',
      })
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (data.items) {
          setProducts(prev => append ? [...prev, ...data.items] : data.items)
          setTotal(data.pagination.total)
          setHasMore(data.pagination.hasNext)
        } else {
          setProducts(data)
          setTotal(data.length)
          setHasMore(false)
        }
        setPage(pageNum)
      }
      setHasSearched(true)
      // 修复 M16: 用 router.replace 同步 URL, 支持浏览器前进/后退 (原 history.replaceState 不联动路由)
      const url = new URL(window.location.href)
      url.searchParams.set('q', q.trim())
      router.replace(url.pathname + url.search, { scroll: false })
    } catch {
      // 忽略错误
    } finally {
      setLoading(false)
    }
  }, [])

  // 搜索框变化时触发搜索（防抖）
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      if (query.trim()) {
        saveSearchHistory(query)
        performSearch(query, 1, false)
      } else {
        setProducts([])
        setTotal(0)
        setHasMore(false)
        setHasSearched(false)
      }
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [query, performSearch, saveSearchHistory])

  // 初始加载 URL 中的搜索词
  useEffect(() => {
    if (initialQuery && !hasSearched) {
      setQuery(initialQuery)
      performSearch(initialQuery, 1, false)
    }
  }, [initialQuery, hasSearched, performSearch])

  // 无限滚动
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    await performSearch(query, page + 1, true)
  }, [loading, hasMore, query, page, performSearch])

  useEffect(() => {
    if (!loaderRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [loadMore, hasMore, loading])

  const handleHistoryClick = (term: string) => {
    setQuery(term)
    inputRef.current?.focus()
  }

  return (
    <div className="bg-[#F1E9DC] min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-8 pb-4">
        <nav className="flex items-center gap-2 font-sans text-[10px] text-[#57503F]/50 tracking-wider uppercase mb-6">
          <Link href="/" className="hover:text-[#221E1A] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#8A6A2E]">Search</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-8 md:pb-12">
        {/* Search Box */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search size={20} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#57503F]/30" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              placeholder="Search for products..."
              className="w-full pl-12 pr-12 py-4 text-base border border-[#DDCEB4] bg-white/80 font-sans text-[#221E1A] placeholder:text-[#57503F]/30 focus:outline-none focus:border-[#A07C34]/50 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#57503F]/30 hover:text-[#221E1A] transition-colors"
                aria-label="Clear search"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* 未搜索时显示历史和热门搜索 */}
        {!query.trim() && (
          <div className="max-w-2xl mx-auto space-y-8">
            {searchHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-sans text-[10px] text-[#57503F]/60 tracking-[0.15em] uppercase font-medium flex items-center gap-2">
                    <Clock size={12} strokeWidth={1.5} /> Recent Searches
                  </h3>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="font-sans text-[10px] text-[#57503F]/40 hover:text-[#8A6A2E] transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleHistoryClick(term)}
                      className="px-3 py-1.5 bg-white/80 border border-[#DDCEB4] text-xs font-sans text-[#403A31] hover:border-[#A07C34]/50 hover:text-[#221E1A] transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-sans text-[10px] text-[#57503F]/60 tracking-[0.15em] uppercase font-medium flex items-center gap-2 mb-3">
                <TrendingUp size={12} strokeWidth={1.5} /> Popular Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleHistoryClick(term)}
                    className="px-3 py-1.5 bg-[#221E1A] text-white text-xs font-sans hover:bg-[#8A6A2E] transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 搜索结果 */}
        {query.trim() && (
          <>
            <div className="mb-6">
              {hasSearched && !loading && (
                <p className="font-sans text-sm text-[#57503F]/60">
                  {total > 0
                    ? `${total} result${total !== 1 ? 's' : ''} for "${query}"`
                    : `No results for "${query}"`}
                </p>
              )}
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            ) : hasSearched && !loading ? (
              <div className="text-center py-20">
                <p className="font-sans text-[#57503F]/50 text-base mb-2">No products found</p>
                <p className="font-sans text-xs text-[#57503F]/40 mb-6">Try different keywords or browse our collections</p>
                <Link
                  href="/products"
                  className="inline-block px-6 py-3 bg-[#221E1A] text-white text-[10px] tracking-[0.12em] uppercase font-sans hover:bg-[#8A6A2E] transition-colors"
                >
                  Browse All Products
                </Link>
              </div>
            ) : null}

            {/* Infinite scroll loader */}
            <div ref={loaderRef} className="mt-12 flex justify-center">
              {loading && <Loader2 size={24} className="text-[#8A6A2E] animate-spin" />}
              {!hasMore && products.length > 0 && !loading && (
                <p className="font-sans text-[10px] text-[#57503F]/40 tracking-wider uppercase">
                  You&apos;ve reached the end
                </p>
              )}
            </div>
          </>
        )}

        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#57503F] hover:text-[#221E1A] transition-colors tracking-wider uppercase font-sans font-medium"
          >
            <ArrowUpLeft size={12} strokeWidth={1.5} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
