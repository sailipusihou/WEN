'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpLeft } from 'lucide-react'
import ProductCard from '@/components/product/ProductCard'
import type { Product, Category } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { CATEGORY_PAGE_SIZE } from '@/lib/pagination'

/** 每次显示的商品数。首屏只渲染这么多，其余点「Load more」——别把全量塞进 HTML */
const PAGE = CATEGORY_PAGE_SIZE

export default function CategoryClient({
  category,
  products,
  totalCount,
}: {
  category: Category | null
  products: Product[]
  /** 该分类的商品总数（服务端全量数；products 只是第一屏） */
  totalCount?: number
}) {
  const total = totalCount ?? products.length
  /**
   * 可见的商品。
   *
   * 服务端首屏只给一屏（全量会把 HTML 撑到 880KB），所以「加载更多」必须**去接口取**——
   * 客户端手里只有这一屏，光靠 slice 是放不出后面的商品的。
   * 取回来的按 id 去重，避免排序口径差异导致同一件出现两次。
   */
  const [items, setItems] = useState<Product[]>(products)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    if (!category || loading) return
    setLoading(true)
    try {
      const page = Math.floor(items.length / PAGE) + 1
      const res = await fetch(
        `/api/products?category=${encodeURIComponent(category.slug)}&pageSize=${PAGE}&page=${page}`
      )
      if (res.ok) {
        const d = await res.json()
        const more: Product[] = Array.isArray(d) ? d : (d.items || [])
        setItems(prev => {
          const seen = new Set(prev.map(p => p.id))
          return [...prev, ...more.filter(p => !seen.has(p.id))]
        })
      }
    } catch {
      // 取不到就保持原样，按钮还在，用户可再点
    } finally {
      setLoading(false)
    }
  }

  if (!category) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FBFAF7]">
        <p className="font-en text-2xl text-ink-soft">Collection not found</p>
      </div>
    )
  }

  return (
    <div className="bg-[#FBFAF7]">
      {/* Hero Banner */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-ink">
        {category.image && (
          <OptimizedImage
            src={category.image}
            alt={category.nameEn || category.name}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-35"
            objectFit="cover"
            placeholder="blur"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-deep/70 via-ink-deep/40 to-ink-deep/80" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-en text-4xl md:text-6xl text-white font-medium tracking-[0.005em]">
              {category.nameEn || category.name}
            </h1>
            <p className="mt-4 text-white/50 font-sans text-sm md:text-base max-w-lg mx-auto leading-relaxed">
              {category.descriptionEn || category.description}
            </p>
            <p className="mt-2 text-white/30 font-sans text-micro tracking-[0.18em] uppercase">
              {total} pieces
            </p>
          </motion.div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 font-sans text-micro text-ink-soft/50 tracking-[0.18em] uppercase mb-10">
            <Link href="/" className="hover:text-ink transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#8A6A2E]">{category.nameEn || category.name}</span>
          </nav>

          {items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                {items.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
              {items.length < total && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-8 py-3.5 text-[12px] tracking-[0.2em] uppercase font-sans font-medium transition-colors disabled:opacity-50"
                    style={{ border: '1px solid rgba(74,58,36,0.28)', color: 'var(--ink)' }}
                  >
                    {loading ? 'Loading…' : 'Load more'}
                    <span className="text-[11px] opacity-60">
                      {total - items.length} left
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <p className="font-sans text-sm text-ink-soft/50">This collection is being curated. Check back soon.</p>
            </div>
          )}

          <div className="mt-16 text-center">
            <Link href="/products"
              className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors tracking-[0.18em] uppercase font-sans font-medium">
              <ArrowUpLeft size={12} strokeWidth={1.5} /> Back to All Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
