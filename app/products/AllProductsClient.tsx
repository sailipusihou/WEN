"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Search, Grid3X3, List, ArrowUpLeft, X, SlidersHorizontal } from "lucide-react"
import ProductCard from "@/components/product/ProductCard"
import { useCurrency } from "@/context/CurrencyContext"
import { convertPrice, formatPrice } from "@/lib/cart-types"
import type { Product } from "@/lib/products"
import { useActivePromotions } from "@/lib/promotion-client"
import { computePromotionForProduct } from "@/lib/promotion-shared"
import { PromoSaleTag, promoPriceClass } from "@/components/product/PromoBadge"
import { PRODUCTS_PAGE_SIZE } from "@/lib/pagination"

/** 题材标签的展示顺序（只列商品里确实存在的） */
const THEME_TAGS = ['Tea Sets', 'Travel Sets', 'Cups', 'Tableware']

/**
 * 加载中的骨架屏。
 *
 * 为什么不能只放一个转圈图标：商品区如果整块空着，客户会以为「就这些了 / 没货了」
 * 而离开。骨架屏占着和真实卡片一样的版面，一眼就知道「还在加载」。
 */
function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse" aria-hidden="true">
          <div className="aspect-[4/5] bg-[#EFE9DA]" />
          <div className="h-3 w-1/3 bg-[#EFE9DA] mt-4" />
          <div className="h-4 w-2/3 bg-[#EFE9DA] mt-2" />
          <div className="h-3 w-1/4 bg-[#EFE9DA] mt-3" />
        </div>
      ))}
    </div>
  )
}

/** 页码列表；页数多时只显示当前页附近，其余折叠成省略号 */
function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const from = Math.max(2, current - 1)
  const to = Math.min(total - 1, current + 1)
  if (from > 2) out.push('…')
  for (let p = from; p <= to; p++) out.push(p)
  if (to < total - 1) out.push('…')
  out.push(total)
  return out
}
import { useCategories } from "@/lib/use-categories"

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'rating' | 'newest'

/** 每页商品数。服务端首屏只渲染这一页的量，剩下的滚动加载 —— 别把全量塞进 HTML */
const PAGE_SIZE = PRODUCTS_PAGE_SIZE

// 分类筛选改为读取后台真实分类（此前硬编码 cultural-gifts/home-decor/creative-gifts，
// 这三个 slug 在数据库里根本不存在，筛选结果恒为 0）
const PRICE_RANGES = [
  { label: 'All Prices', min: '', max: '' },
  { label: 'Under $50', min: '', max: '50' },
  { label: '$50 - $100', min: '50', max: '100' },
  { label: '$100 - $200', min: '100', max: '200' },
  { label: '$200+', min: '200', max: '' },
]

export default function AllProductsClient({
  products: initialProducts,
  initialTag = '',
  totalCount,
}: {
  products: Product[]
  initialTag?: string
  /**
   * 服务端筛完后的**总数**。
   * 服务端只把第一页塞进首屏（全量 160 件会把 HTML 撑到 880KB），
   * 所以总数不能再用 initialProducts.length 推。
   */
  totalCount?: number
}) {
  const { currency } = useCurrency()
  const { categories } = useCategories()
  // 修复 H16: 列表视图也展示促销价 (与网格 ProductCard 一致)
  const promotions = useActivePromotions()
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [sort, setSort] = useState<SortOption>('default')
  const [category, setCategory] = useState('')
  // 题材筛选（?tag=）—— 与分类是两套维度：分类只有一个「龙泉青瓷」，
  // 题材才是茶席套组 / 单杯 / 餐具 / 旅行套组。页头 COLLECTIONS 的卡片指到这里。
  const [tag, setTag] = useState(initialTag)
  const [priceRange, setPriceRange] = useState(0)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  /**
   * 题材筛选条固定列这四项。
   *
   * ⚠️ 不要从 products 反推 —— 那个数组是**已经筛过的**（服务端按 ?tag= 过滤过），
   *    从它推导会导致「点进 Cups 之后，其余题材的按钮全部消失」，没法切回去。
   *    真实存在的题材由 THEME_TAGS 固定给出（四个题材目前都有商品）。
   */
  const themeTags = THEME_TAGS
  const [showFilters, setShowFilters] = useState(false)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(totalCount ?? initialProducts.length)
  const [loading, setLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 总页数 —— 由总数与每页条数算出（不再用「还有没有下一页」的模糊判断） */
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  /** 翻页后要滚回商品区顶部，否则用户会停在页面底部一脸茫然 */
  const gridTopRef = useRef<HTMLDivElement>(null)
  /** 「跳到第几页」输入框 */
  const [jumpTo, setJumpTo] = useState('')

  // 构建查询参数
  const buildParams = useCallback((pageNum: number) => {
    const params = new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      page: String(pageNum),
      sort,
    })
    if (search.trim()) params.set('search', search.trim())
    if (category) params.set('category', category)
    if (tag) params.set('tag', tag)
    const range = PRICE_RANGES[priceRange]
    if (range.min) params.set('minPrice', range.min)
    if (range.max) params.set('maxPrice', range.max)
    if (featuredOnly) params.set('featured', 'true')
    return params
  }, [search, sort, category, priceRange, featuredOnly, tag])

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
          } else {
            setProducts(data)
            setTotal(data.length)
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

  /**
   * 跳到第 n 页。
   *
   * 为什么改成点页码、而不是继续无限下滑：
   *   · 下滑没有进度感 —— 用户不知道一共多少件、还要滑多久（这站有 160 件）
   *   · 想回头找刚刚看过的商品，只能重新往下滑
   * 翻页后把视图滚回商品区顶部；否则停在页尾，看到的位置还是旧的。
   */
  const goToPage = useCallback(async (n: number) => {
    const target = Math.min(Math.max(1, Math.floor(n) || 1), totalPages)
    if (loading || target === page) return
    setLoading(true)
    try {
      const res = await fetch(`/api/products?${buildParams(target)}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items || [])
        setProducts(items)
        if (data?.pagination?.total != null) setTotal(data.pagination.total)
        setPage(target)
        requestAnimationFrame(() => {
          gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    } catch {
      // 失败就保持原样，用户可以再点一次
    } finally {
      setLoading(false)
    }
  }, [loading, page, totalPages, buildParams])

  const clearFilters = () => {
    setSearch('')
    setCategory('')
    setPriceRange(0)
    setFeaturedOnly(false)
    setSort('default')
  }

  const hasActiveFilters = search || category || priceRange > 0 || featuredOnly || tag

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
              {/* Collection（题材）—— 只在商品里确实存在这些标签时才显示 */}
              {themeTags.length > 0 && (
                <div>
                  <h4 className="font-sans text-micro text-ink-soft/60 tracking-[0.24em] uppercase font-medium mb-2">Collection</h4>
                  <div className="flex flex-wrap gap-2">
                    {[{ slug: '', label: 'All' }, ...themeTags.map(t => ({ slug: t, label: t }))].map(cat => (
                      <button
                        key={cat.slug || 'all'}
                        type="button"
                        onClick={() => setTag(cat.slug)}
                        className={`px-3 py-1.5 text-xs font-sans transition-colors ${tag === cat.slug ? 'bg-ink text-white' : 'bg-[#FFFFFF]/80 text-[#4A3E2E] border border-[#EFE7D4] hover:border-[#A07C34]/50'}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

        {/* 翻页后滚回这个锚点 */}
        <div ref={gridTopRef} className="scroll-mt-24" />

        {loading ? (
          <ProductGridSkeleton count={PAGE_SIZE} />
        ) : products.length === 0 ? (
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

        {/* 分页 —— 加载中也保留（按钮置灰），避免翻页时布局跳动 */}
        {totalPages > 1 && (
          <nav className="mt-14 flex flex-col items-center gap-5" aria-label="Pagination">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3.5 py-2 text-[12px] font-sans tracking-[0.12em] uppercase border transition-colors disabled:opacity-35 disabled:cursor-not-allowed border-[#EFE7D4] text-ink hover:border-[#A07C34]/50"
              >
                ← Prev
              </button>

              {pageNumbers(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-1.5 text-ink-soft/40 font-sans text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p as number)}
                    disabled={loading}
                    aria-current={p === page ? 'page' : undefined}
                    className={`min-w-[38px] px-3 py-2 text-[13px] font-sans tabular-nums border transition-colors disabled:cursor-not-allowed ${
                      p === page
                        ? 'bg-ink text-paper-light border-ink'
                        : 'border-[#EFE7D4] text-ink hover:border-[#A07C34]/50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3.5 py-2 text-[12px] font-sans tracking-[0.12em] uppercase border transition-colors disabled:opacity-35 disabled:cursor-not-allowed border-[#EFE7D4] text-ink hover:border-[#A07C34]/50"
              >
                Next →
              </button>
            </div>

            <div className="flex items-center gap-3 font-sans text-micro text-ink-soft/60 flex-wrap justify-center">
              <span>Page {page} of {totalPages}</span>
              <span className="hidden sm:inline opacity-40">·</span>
              <span className="hidden sm:inline">{total} pieces</span>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const n = parseInt(jumpTo, 10)
                  if (!Number.isNaN(n)) goToPage(n)
                  setJumpTo('')
                }}
                className="flex items-center gap-1.5"
              >
                <label htmlFor="jump-page" className="hidden sm:inline">Jump to</label>
                <input
                  id="jump-page"
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpTo}
                  onChange={(e) => setJumpTo(e.target.value)}
                  placeholder="#"
                  className="w-14 px-2 py-1.5 text-center border border-[#EFE7D4] bg-[#FFFFFF]/80 text-ink text-[13px] focus:outline-none focus:border-[#A07C34]/50"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-2.5 py-1.5 border border-[#EFE7D4] hover:border-[#A07C34]/50 transition-colors text-[12px] disabled:opacity-40"
                >
                  Go
                </button>
              </form>
            </div>
          </nav>
        )}

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
