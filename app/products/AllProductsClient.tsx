"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Search, Grid3X3, List, ArrowUpLeft, Loader2, X, SlidersHorizontal } from "lucide-react"
import ProductCard from "@/components/product/ProductCard"
import { useCurrency } from "@/context/CurrencyContext"
import { convertPrice, formatPrice } from "@/lib/cart-types"
import type { Product } from "@/lib/products"
import { useActivePromotions } from "@/lib/promotion-client"
import { computePromotionForProduct } from "@/lib/promotion-shared"
import { PromoSaleTag, promoPriceClass } from "@/components/product/PromoBadge"
import { useCategories } from "@/lib/use-categories"

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'rating' | 'newest'

const PAGE_SIZE = 12

// 分类筛选改为读取后台真实分类（此前硬编码 cultural-gifts/home-decor/creative-gifts，
// 这三个 slug 在数据库里根本不存在，筛选结果恒为 0）
const PRICE_RANGES = [
  { label: 'All Prices', min: '', max: '' },
  { label: 'Under $50', min: '', max: '50' },
  { label: '$50 - $100', min: '50', max: '100' },
  { label: '$100 - $200', min: '100', max: '200' },
  { label: '$200+', min: '200', max: '' },
]

export default function AllProductsClient({ products: initialProducts }: { products: Product[] }) {
  const { currency } = useCurrency()
  const { categories } = useCategories()
  // 修复 H16: 列表视图也展示促销价 (与网格 ProductCard 一致)
  const promotions = useActivePromotions()
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [sort, setSort] = useState<SortOption>('default')
  const [category, setCategory] = useState('')
  const [priceRange, setPriceRange] = useState(0)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialProducts.length)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 构建查询参数
  const buildParams = useCallback((pageNum: number) => {
    const params = new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      page: String(pageNum),
      sort,
    })
    if (search.trim()) params.set('search', search.trim())
    if (category) params.set('category', category)
    const range = PRICE_RANGES[priceRange]
    if (range.min) params.set('minPrice', range.min)
    if (range.max) params.set('maxPrice', range.max)
    if (featuredOnly) params.set('featured', 'true')
    return params
  }, [search, sort, category, priceRange, featuredOnly])

  // 搜索和筛选变化时重新加载第一页
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?${buildParams(1)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.items) {
            setProducts(data.items)
            setTotal(data.pagination.total)
            setHasMore(data.pagination.hasNext)
          } else {
            setProducts(data)
            setTotal(data.length)
            setHasMore(false)
          }
          setPage(1)
        }
      } catch {
        // 失败时保持现有数据
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [buildParams])

  // 无限滚动加载下一页
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetch(`/api/products?${buildParams(page + 1)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.items) {
          setProducts(prev => [...prev, ...data.items])
          setHasMore(data.pagination.hasNext)
          setPage(prev => prev + 1)
        }
      }
    } catch {
      // 忽略错误
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, buildParams])

  // IntersectionObserver 触发无限滚动
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

  const clearFilters = () => {
    setSearch('')
    setCategory('')
    setPriceRange(0)
    setFeaturedOnly(false)
    setSort('default')
  }

  const hasActiveFilters = search || category || priceRange > 0 || featuredOnly

  return (
    <div className="bg-[#FBFAF7] min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-8 pb-4">
        <nav className="flex items-center gap-2 font-sans text-micro text-ink-soft/50 tracking-[0.18em] uppercase mb-6">
          <Link href="/" className="hover:text-ink transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#8A6A2E]">All Objects</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-8 md:pb-12">
        {/* Title + Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
          <div>
            <h1 className="font-en text-3xl md:text-5xl text-ink font-medium tracking-[0.005em]">All Objects</h1>
            <p className="font-sans text-sm text-ink-soft/60 mt-2">{total} pieces</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/30" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-40 md:w-52 pl-9 pr-9 py-2.5 border border-[#EFE7D4] bg-[#FFFFFF]/80 text-sm font-sans text-ink placeholder:text-ink-soft/30 focus:outline-none focus:border-[#A07C34]/50 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/30 hover:text-ink transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="px-3 py-2.5 border border-[#EFE7D4] bg-[#FFFFFF]/80 text-sm font-sans text-ink focus:outline-none focus:border-[#A07C34]/50 transition-colors cursor-pointer"
            >
              <option value="default">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
            </select>
            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border text-sm font-sans transition-colors ${showFilters ? 'bg-ink text-white border-ink' : 'bg-[#FFFFFF]/80 text-ink border-[#EFE7D4] hover:border-[#A07C34]/50'}`}
            >
              <SlidersHorizontal size={14} strokeWidth={1.5} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 bg-[#8A6A2E] rounded-full" />
              )}
            </button>
            {/* View toggle */}
            <div className="flex items-center border border-[#EFE7D4] overflow-hidden">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={"p-2.5 transition-colors " + (view === "grid" ? "bg-ink text-white" : "bg-[#FFFFFF]/80 text-ink-soft/50 hover:text-ink")}
                aria-label="Grid view"
              >
                <Grid3X3 size={14} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={"p-2.5 transition-colors " + (view === "list" ? "bg-ink text-white" : "bg-[#FFFFFF]/80 text-ink-soft/50 hover:text-ink")}
                aria-label="List view"
              >
                <List size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#FFFFFF]/60 border border-[#EFE7D4]/50 p-5 mb-6 overflow-hidden"
          >
            <div className="flex flex-wrap gap-6">
              {/* Category */}
              <div>
                <h4 className="font-sans text-micro text-ink-soft/60 tracking-[0.24em] uppercase font-medium mb-2">Category</h4>
                <div className="flex flex-wrap gap-2">
                  {[{ slug: '', label: 'All' }, ...categories.map(c => ({ slug: c.slug, label: c.nameEn || c.name }))].map(cat => (
                    <button
                      key={cat.slug || 'all'}
                      type="button"
                      onClick={() => setCategory(cat.slug)}
                      className={`px-3 py-1.5 text-xs font-sans transition-colors ${category === cat.slug ? 'bg-ink text-white' : 'bg-[#FFFFFF]/80 text-[#4A3E2E] border border-[#EFE7D4] hover:border-[#A07C34]/50'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Price */}
              <div>
                <h4 className="font-sans text-micro text-ink-soft/60 tracking-[0.24em] uppercase font-medium mb-2">Price Range</h4>
                <div className="flex flex-wrap gap-2">
                  {PRICE_RANGES.map((range, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPriceRange(i)}
                      className={`px-3 py-1.5 text-xs font-sans transition-colors ${priceRange === i ? 'bg-ink text-white' : 'bg-[#FFFFFF]/80 text-[#4A3E2E] border border-[#EFE7D4] hover:border-[#A07C34]/50'}`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Featured */}
              <div>
                <h4 className="font-sans text-micro text-ink-soft/60 tracking-[0.24em] uppercase font-medium mb-2">Special</h4>
                <button
                  type="button"
                  onClick={() => setFeaturedOnly(!featuredOnly)}
                  className={`px-3 py-1.5 text-xs font-sans transition-colors ${featuredOnly ? 'bg-ink text-white' : 'bg-[#FFFFFF]/80 text-[#4A3E2E] border border-[#EFE7D4] hover:border-[#A07C34]/50'}`}
                >
                  Featured Only
                </button>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-[#EFE7D4]/50">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-micro text-[#8A6A2E] hover:underline font-sans tracking-[0.18em] uppercase"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </motion.div>
        )}

        {products.length === 0 && !loading ? (
          <div className="text-center py-20">
            <p className="font-sans text-ink-soft/50 text-base">No objects found</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-[#8A6A2E] hover:underline mt-2 font-sans"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product, i) => {
              const isRemote = !!product.image && product.image.startsWith('http')
              const eff = computePromotionForProduct({ id: product.id, category: product.category || '', price: product.price }, promotions)
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="bg-[#FFFFFF]/70 border border-[#EFE7D4]/50 p-4 flex items-center gap-4 hover:bg-[#FFFFFF] transition-colors"
                >
                  <Link href={"/products/" + product.id} className="relative w-16 h-16 shrink-0 overflow-hidden bg-[#F7F0DE]">
                    <Image
                      src={product.image}
                      alt={product.nameEn || product.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                      // 修复 M15: 远程图 (非 next.config 白名单域名) 走 unoptimized 原生加载, 本地图才走优化
                      unoptimized={isRemote}
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={"/products/" + product.id} className="font-en text-sm text-ink hover:text-[#8A6A2E] transition-colors font-medium">
                      {product.nameEn || product.name}
                    </Link>
                    <p className="font-sans text-micro text-ink-soft/50 mt-0.5 truncate">{product.subtitleEn || product.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-en text-base font-medium ${promoPriceClass(eff, 'text-ink')}`}>
                      {formatPrice(convertPrice(eff.price, currency), currency)}
                      {eff.discount > 0 && <PromoSaleTag />}
                    </p>
                    {(eff.originalPrice || product.originalPrice) && (
                      <p className="font-sans text-sm text-ink-soft/60 line-through">
                        {formatPrice(convertPrice(eff.originalPrice || product.originalPrice || 0, currency), currency)}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="mt-12 flex justify-center">
          {loading && (
            <Loader2 size={24} className="text-[#8A6A2E] animate-spin" />
          )}
          {!hasMore && products.length > 0 && !loading && (
            <p className="font-sans text-micro text-ink-soft/40 tracking-[0.18em] uppercase">
              You&apos;ve reached the end
            </p>
          )}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors tracking-[0.18em] uppercase font-sans font-medium"
          >
            <ArrowUpLeft size={12} strokeWidth={1.5} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
