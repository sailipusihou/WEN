'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowUpLeft, Star, ShoppingBag, Plus, Minus, Check, ShieldCheck, Truck, RotateCcw,
  MessageCircle, Heart, X, ChevronDown, Package, Clock, ChevronRight, ZoomIn,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import type { Product, Review } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import ProductCard from '@/components/product/ProductCard'
import { useProductPrice } from '@/lib/promotion-client'
import { PromoImageBadge, PromoSaleTag } from '@/components/product/PromoBadge'
import { buildReferralBioLandingUrl } from '@/lib/referral-links'
import { trackReferralVisit } from '@/lib/referral-client'
import { useCategories } from '@/lib/use-categories'

function getVisitorId() {
  let id = localStorage.getItem('visitor_id')
  if (!id) {
    id = 'VIS-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    localStorage.setItem('visitor_id', id)
  }
  return id
}

function getSessionId() {
  let id = sessionStorage.getItem('session_id')
  if (!id) {
    id = 'SES-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
    sessionStorage.setItem('session_id', id)
  }
  return id
}

/** 可折叠详情区块（右侧栏「下拉详情」） */
function Accordion({
  title, icon: Icon, defaultOpen = false, children,
}: { title: string; icon?: any; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[#E3DACB]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 py-4 text-left group"
      >
        <span className="flex items-center gap-2.5 font-sans text-[11px] tracking-[0.14em] uppercase text-[#2C2C2C] font-medium">
          {Icon && <Icon size={14} strokeWidth={1.5} className="text-[#8B7D5C]" />}
          {title}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={1.5}
          className={`shrink-0 text-[#8B7D5C] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="pb-5 font-sans text-sm leading-relaxed text-[#6B6B6B]/80">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function ProductDetailClient({
  product,
  reviews: reviewsProp,
}: {
  product: Product | null
  reviews: Review[]
}) {
  const { addItem } = useCart()
  const { currency } = useCurrency()
  const { addToast } = useToast()
  const eff = useProductPrice(product)
  const { labelFor } = useCategories()
  const searchParams = useSearchParams()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [visitRecord, setVisitRecord] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [related, setRelated] = useState<Product[]>([])
  const [shipping, setShipping] = useState<{ days: number; freeThreshold: number; cost: number } | null>(null)
  const pageStartTime = useRef(Date.now())
  const recordedRef = useRef<string | null>(null)
  const referralCode = searchParams.get('ref')
  const sourceChannel = searchParams.get('channel') || 'direct'

  const [reviews, setReviews] = useState<Review[]>(reviewsProp)

  const fetchReviews = async () => {
    if (!product) return
    try {
      const r = await fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`)
      if (r.ok) setReviews(await r.json())
    } catch {}
  }

  useEffect(() => {
    if (!product) return
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  // 同分类相关推荐（排除当前商品）
  useEffect(() => {
    if (!product) return
    let alive = true
    fetch(`/api/products?category=${encodeURIComponent(product.category)}&activeOnly=true`)
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then(d => {
        if (!alive) return
        const items: Product[] = Array.isArray(d) ? d : (d.items || [])
        setRelated(items.filter(p => p.id !== product.id).slice(0, 4))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [product?.id, product?.category])

  // 配送时效（后台系统设置的默认天数 / 免邮门槛）
  useEffect(() => {
    fetch('/api/settings')
      .then(r => (r.ok ? r.json() : null))
      .then(s => {
        if (!s) return
        setShipping({
          days: Number(s.defaultShippingDays) || 12,
          freeThreshold: Number(s.shippingFreeThreshold) || 0,
          cost: Number(s.shippingCost) || 0,
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!referralCode) return
    trackReferralVisit({
      refCode: referralCode,
      page: window.location.pathname,
      query: window.location.search,
      sourceChannel,
    })
  }, [referralCode, sourceChannel])

  useEffect(() => {
    if (!product) return
    if (recordedRef.current === product.id) return
    recordedRef.current = product.id

    const visitorId = getVisitorId()
    const sessionId = getSessionId()

    fetch('/api/browsing-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sessionId,
        visitorId,
        productId: product.id,
        productName: product.nameEn || product.name,
        productImage: product.image,
        productPrice: product.price,
        productCode: product.code || '',
        productCategory: product.category,
        pageType: 'product',
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.id) setVisitRecord(data.id)
      })
      .catch(() => {})
  }, [product])

  useEffect(() => {
    const handleUnload = () => {
      if (visitRecord) {
        const duration = Math.floor((Date.now() - pageStartTime.current) / 1000)
        fetch('/api/browsing-history', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: visitRecord, duration }),
        }).catch(() => {})
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      handleUnload()
    }
  }, [visitRecord])

  const closeLightbox = useCallback(() => setLightbox(false), [])
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [lightbox, closeLightbox])

  const handleToggleWishlist = async () => {
    if (!product || wishlistLoading) return
    setWishlistLoading(true)
    try {
      const res = await fetch('/api/wishlist', {
        method: isWishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      if (res.ok) {
        setIsWishlisted(!isWishlisted)
        addToast(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist', 'success')
      } else if (res.status === 401) {
        addToast('Please sign in to save items', 'error')
      } else {
        addToast('Could not update wishlist', 'error')
      }
    } catch {
      addToast('Connection error', 'error')
    } finally {
      setWishlistLoading(false)
    }
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#F8F5F0]">
        <p className="font-en text-2xl text-[#6B6B6B]">Piece not found</p>
      </div>
    )
  }

  const images = [product.image, ...(product.detailImages || [])].filter(Boolean)
  const stock = typeof product.stock === 'number' ? product.stock : undefined
  const soldOut = stock !== undefined && stock <= 0
  const lowStock = stock !== undefined && stock > 0 && stock <= 10
  const specRows: [string, string][] = [
    ['Craft', product.craftEn || product.craft || ''],
    ['Material', product.material || ''],
    ['Origin', product.origin || ''],
  ].filter(([, v]) => v) as [string, string][]

  // 预计到达区间（区间按后台默认时效推算，展示为「下单后 N–M 个工作日」+ 具体日期）
  let deliveryText = ''
  if (shipping) {
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const from = new Date(Date.now() + shipping.days * 86400000)
    const to = new Date(Date.now() + (shipping.days + 7) * 86400000)
    deliveryText = `${fmt(from)} – ${fmt(to)}`
  }

  const handleAddToCart = () => {
    if (soldOut) return
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id, name: product.name,
        nameEn: product.nameEn || product.name,
        image: product.image, price: product.price,
        category: product.category,
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="bg-[#F8F5F0] min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 font-sans text-[10px] text-[#6B6B6B]/50 tracking-wider uppercase mb-8 md:mb-10">
          <Link href="/" className="hover:text-[#2C2C2C] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#2C2C2C] transition-colors">All Objects</Link>
          <span>/</span>
          <Link href={`/category/${product.category}`} className="hover:text-[#2C2C2C] transition-colors">
            {labelFor(product.category)}
          </Link>
          <span>/</span>
          <span className="text-[#8B7D5C]">{product.nameEn || product.name}</span>
        </nav>

        {referralCode && (
          <div className="mb-8 rounded-2xl border border-[#B8A06C]/20 bg-white/70 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#8B7D5C]">
                  Social Attribution Active
                </p>
                <p className="mt-1 font-sans text-sm text-[#2C2C2C]">
                  This page is carrying social tracking parameters — your next order can be attributed back to the campaign.
                </p>
              </div>
              <Link
                href={buildReferralBioLandingUrl({ code: referralCode, productId: product.id, sourceChannel })}
                className="inline-flex items-center justify-center px-4 py-2 text-xs tracking-[0.08em] uppercase font-sans font-medium border border-[#EDE8DC] hover:border-[#8B7D5C]/40 hover:bg-[#8B7D5C]/5 transition-colors"
              >
                Back to Link in Bio
              </Link>
            </div>
          </div>
        )}

        {/* ============ 主图为主 + 右侧详情 ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,1fr)] gap-8 lg:gap-14 xl:gap-20">
          {/* ---------- 左：放大主图 ---------- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-24 lg:self-start"
          >
            <div className="flex gap-3 md:gap-4">
              {/* 缩略图竖排（桌面） */}
              {images.length > 1 && (
                <div className="hidden md:flex flex-col gap-2.5 w-[76px] shrink-0">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      aria-label={`View image ${i + 1}`}
                      className={`relative aspect-[4/5] w-full overflow-hidden bg-[#F2EAE0] border transition-all ${
                        i === selectedImage ? 'border-[#2C2C2C]' : 'border-transparent hover:border-[#B8A06C]/50'
                      }`}
                    >
                      <OptimizedImage src={img} alt={`${product.nameEn || product.name} ${i + 1}`} fill sizes="76px" objectFit="cover" placeholder="blur" />
                    </button>
                  ))}
                </div>
              )}

              {/* 主图 */}
              <div className="flex-1 min-w-0">
                <div
                  className="relative aspect-[4/5] bg-[#F2EAE0] overflow-hidden group cursor-zoom-in"
                  onClick={() => setLightbox(true)}
                >
                  <PromoImageBadge eff={eff} currency={currency} className="top-4 left-4 z-10" />
                  <OptimizedImage
                    src={images[selectedImage]}
                    alt={product.nameEn || product.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                    objectFit="cover"
                    placeholder="blur"
                  />
                  <span className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/85 backdrop-blur-sm px-2.5 py-1.5 font-sans text-[9px] tracking-[0.12em] uppercase text-[#2C2C2C] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ZoomIn size={11} strokeWidth={1.5} /> Click to enlarge
                  </span>
                </div>

                {/* 缩略图横排（移动端） */}
                {images.length > 1 && (
                  <div className="flex md:hidden gap-2 mt-3">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedImage(i)}
                        aria-label={`View image ${i + 1}`}
                        className={`relative w-16 h-16 overflow-hidden bg-[#F2EAE0] border transition-colors ${
                          i === selectedImage ? 'border-[#2C2C2C]' : 'border-transparent'
                        }`}
                      >
                        <OptimizedImage src={img} alt={`${product.nameEn || product.name} ${i + 1}`} fill sizes="64px" objectFit="cover" placeholder="blur" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ---------- 右：详情栏 ---------- */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:pt-1"
          >
            <span className="font-sans text-[10px] text-[#B8A06C] tracking-[0.15em] uppercase font-medium">
              {labelFor(product.category)}
            </span>

            <h1 className="font-en text-3xl md:text-[40px] md:leading-[1.15] text-[#2C2C2C] font-semibold mt-2 tracking-tight">
              {product.nameEn || product.name}
            </h1>
            <p className="font-sans text-sm text-[#6B6B6B]/60 mt-3 leading-relaxed">{product.subtitleEn || product.subtitle}</p>

            {/* 评分 —— 有真实评价才显示 */}
            {product.reviewCount > 0 && (
              <a href="#reviews" className="inline-flex items-center gap-2 mt-4 group">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={i < Math.round(product.rating) ? 'fill-[#B8A06C] text-[#B8A06C]' : 'text-[#B8A06C]/30'}
                    />
                  ))}
                </span>
                <span className="font-sans text-xs text-[#6B6B6B]/70 group-hover:text-[#2C2C2C] transition-colors">
                  {product.rating} · {product.reviewCount} review{product.reviewCount > 1 ? 's' : ''}
                </span>
                <ChevronRight size={12} strokeWidth={1.5} className="text-[#8B7D5C]/50" />
              </a>
            )}

            {/* 价格 */}
            <div className="flex items-baseline gap-3 mt-6">
              <span className={`font-en text-3xl md:text-4xl font-semibold ${eff.discount > 0 ? 'text-[#B8452E]' : 'text-[#2C2C2C]'}`}>
                {formatPrice(convertPrice(eff.price, currency), currency)}
              </span>
              {eff.discount > 0 && <PromoSaleTag />}
              {(eff.originalPrice || product.originalPrice) && (
                <span className="font-sans text-sm text-[#6B6B6B]/40 line-through">
                  {formatPrice(convertPrice(eff.originalPrice || product.originalPrice || 0, currency), currency)}
                </span>
              )}
            </div>

            {/* 库存 / 时效 */}
            <div className="mt-4 space-y-2">
              {soldOut ? (
                <p className="flex items-center gap-2 font-sans text-xs text-[#B8452E]">
                  <Package size={13} strokeWidth={1.5} /> Sold out — ask us about the next batch
                </p>
              ) : lowStock ? (
                <p className="flex items-center gap-2 font-sans text-xs text-[#B8452E]">
                  <Package size={13} strokeWidth={1.5} /> Only {stock} left in stock
                </p>
              ) : (
                <p className="flex items-center gap-2 font-sans text-xs text-[#6B6B6B]/60">
                  <Package size={13} strokeWidth={1.5} /> In stock — ready to ship from the workshop
                </p>
              )}
              {deliveryText && (
                <p className="flex items-center gap-2 font-sans text-xs text-[#6B6B6B]/60">
                  <Clock size={13} strokeWidth={1.5} /> Order today, estimated arrival {deliveryText}
                </p>
              )}
            </div>

            {/* 规格表 */}
            {specRows.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-7 py-5 border-y border-[#E3DACB]">
                {specRows.map(([label, value]) => (
                  <div key={label}>
                    <span className="font-sans text-[9px] text-[#6B6B6B]/40 tracking-wider uppercase">{label}</span>
                    <p className="font-sans text-[13px] text-[#2C2C2C] mt-1 leading-snug">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 数量 + 加购 */}
            <div className="flex items-stretch gap-3 mt-7">
              <div className="flex items-center border border-[#E3DACB] bg-white/60">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="px-3.5 py-3 text-[#6B6B6B] hover:text-[#2C2C2C] transition-colors" aria-label="Decrease quantity">
                  <Minus size={14} strokeWidth={1.5} />
                </button>
                <span className="px-3 font-sans text-sm text-[#2C2C2C] min-w-[2rem] text-center">{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)} className="px-3.5 py-3 text-[#6B6B6B] hover:text-[#2C2C2C] transition-colors" aria-label="Increase quantity">
                  <Plus size={14} strokeWidth={1.5} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={soldOut}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 text-xs tracking-[0.08em] uppercase font-sans font-medium transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
                  added ? 'bg-[#8B7D5C] text-white' : 'bg-[#2C2C2C] text-white hover:bg-[#1A1A1A]'
                }`}
              >
                {added ? <><Check size={14} strokeWidth={1.5} /> Added to Cart</> : <><ShoppingBag size={14} strokeWidth={1.5} /> Add to Cart</>}
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className={`px-3.5 border transition-all duration-300 ${
                  isWishlisted
                    ? 'border-[#B85450] bg-[#B85450]/5 text-[#B85450]'
                    : 'border-[#E3DACB] text-[#6B6B6B] hover:text-[#2C2C2C] hover:border-[#2C2C2C]'
                } ${wishlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={16} strokeWidth={1.5} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* 咨询 */}
            <Link
              href={'/messages?product=' + product.id}
              className="inline-flex items-center gap-2 mt-3.5 px-4 py-2.5 text-xs border border-[#E3DACB] hover:border-[#8B7D5C]/40 hover:bg-[#8B7D5C]/5 transition-colors font-sans w-full justify-center"
            >
              <MessageCircle size={14} strokeWidth={1.5} className="text-[#8B7D5C]" />
              <span className="text-[#6B6B6B]">Ask about this piece</span>
              <span className="text-[10px] text-[#8B7D5C]/60">→</span>
            </Link>

            {/* 信任条 */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 pt-5 border-t border-[#E3DACB]">
              {[
                { icon: ShieldCheck, text: 'Authenticity Guaranteed' },
                { icon: Truck, text: 'Free Damaged Replacement' },
                { icon: RotateCcw, text: '30-Day Money Back' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-[10px] text-[#6B6B6B]/55 font-sans tracking-wider uppercase">
                  <item.icon size={12} strokeWidth={1.5} /> {item.text}
                </div>
              ))}
            </div>

            {/* ---------- 下拉详情 ---------- */}
            <div className="mt-8 border-t border-[#E3DACB]">
              <Accordion title="Description" icon={Package} defaultOpen>
                <p>{product.descriptionEn || product.description}</p>
                {(product.tagsEn || product.tags)?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {(product.tagsEn || product.tags).map((tag, i) => (
                      <span key={i} className="font-sans text-[10px] text-[#8B7D5C] bg-[#8B7D5C]/5 border border-[#B8A06C]/20 px-2.5 py-1 tracking-wider uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Accordion>

              {specRows.length > 0 && (
                <Accordion title="Craft & Materials" icon={Star}>
                  <dl className="space-y-2.5">
                    {specRows.map(([label, value]) => (
                      <div key={label} className="flex gap-4">
                        <dt className="w-24 shrink-0 text-[10px] tracking-wider uppercase text-[#6B6B6B]/45 pt-0.5">{label}</dt>
                        <dd className="text-[#2C2C2C]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {(product.storyEn || product.story) && (
                    <p className="mt-4 text-[13px] text-[#6B6B6B]/70">{product.storyEn || product.story}</p>
                  )}
                </Accordion>
              )}

              <Accordion title="Shipping & Returns" icon={Truck}>
                <ul className="space-y-2.5">
                  <li>
                    Dispatched from the workshop within 1–2 business days.
                    {shipping && shipping.days > 0 && <> Estimated delivery <strong className="text-[#2C2C2C]">{shipping.days}–{shipping.days + 7} days</strong>{deliveryText && <> ({deliveryText})</>}.</>}
                  </li>
                  {shipping && shipping.freeThreshold > 0 && (
                    <li>
                      Free shipping on orders over <strong className="text-[#2C2C2C]">${shipping.freeThreshold.toFixed(2)}</strong>
                      {shipping.cost > 0 && <> · flat rate ${shipping.cost.toFixed(2)} below that</>}.
                    </li>
                  )}
                  <li>Every piece is packed in protective, gift-ready packaging. Damaged in transit? We replace it free.</li>
                  <li>30-day money-back guarantee — return it unused in original packaging.</li>
                </ul>
              </Accordion>

              <Accordion title="Questions & Answers" icon={MessageCircle}>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-[#2C2C2C] font-medium text-[13px]">Is this piece genuinely handmade?</dt>
                    <dd className="mt-1 text-[13px] text-[#6B6B6B]/70">Yes. Each piece is made by hand in the workshop named above — small variations in glaze and finish are the signature of handmade work, not defects.</dd>
                  </div>
                  <div>
                    <dt className="text-[#2C2C2C] font-medium text-[13px]">Will it arrive safely?</dt>
                    <dd className="mt-1 text-[13px] text-[#6B6B6B]/70">Every order ships double-boxed with padding. If anything arrives damaged, send us a photo and we will replace it at no cost.</dd>
                  </div>
                  <div>
                    <dt className="text-[#2C2C2C] font-medium text-[13px]">Can I ask before ordering?</dt>
                    <dd className="mt-1 text-[13px] text-[#6B6B6B]/70">
                      Of course — use <strong className="text-[#2C2C2C]">Ask about this piece</strong> above and we will reply within 24 hours.
                    </dd>
                  </div>
                </dl>
              </Accordion>
            </div>
          </motion.div>
        </div>

        {/* ============ 相关推荐 ============ */}
        {related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 md:mt-28"
          >
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-en text-2xl md:text-3xl text-[#2C2C2C] font-semibold tracking-tight">You May Also Like</h2>
              <Link href={`/category/${product.category}`} className="font-sans text-[10px] tracking-[0.12em] uppercase text-[#8B7D5C] hover:text-[#2C2C2C] transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </motion.div>
        )}

        {/* ============ 工艺故事 ============ */}
        {(product.storyEn || product.story) && (
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-20 md:mt-28 max-w-3xl mx-auto">
            <div className="divider-premium" />
            <h2 className="font-en text-2xl md:text-3xl text-[#2C2C2C] font-semibold mt-10 text-center tracking-tight">The Story Behind This Piece</h2>
            <div className="mt-8 bg-white/70 border border-[#EDE8DC]/50 p-8 md:p-12">
              <p className="font-sans text-[#6B6B6B]/70 leading-loose text-sm md:text-base">{product.storyEn || product.story}</p>
            </div>
          </motion.div>
        )}

        {/* ============ 评价 ============ */}
        <motion.div id="reviews" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-20 md:mt-28 max-w-3xl mx-auto scroll-mt-24">
          <div className="divider-premium" />
          <h2 className="font-en text-2xl md:text-3xl text-[#2C2C2C] font-semibold mt-10 text-center tracking-tight">
            Reviews{product.reviewCount > 0 ? ` (${reviews.length || product.reviewCount})` : ''}
          </h2>

          <div className="mt-8 space-y-4">
            {reviews.length === 0 ? (
              <p className="text-center font-sans text-sm text-[#6B6B6B]/50 py-8">
                No reviews yet. Reviews from customers who completed an order will appear here.
              </p>
            ) : (
              reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/70 border border-[#EDE8DC]/50 p-6 md:p-8"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EDE8DC]/50 flex items-center justify-center font-sans text-sm text-[#6B6B6B] overflow-hidden">
                        {review.avatar && (review.avatar.startsWith('http') || review.avatar.startsWith('/api/uploads') || review.avatar.startsWith('/images/')) ? (
                          <img src={review.avatar} alt={review.author} className="w-full h-full object-cover" />
                        ) : (review.avatar)}
                      </div>
                      <div>
                        <p className="font-sans text-sm text-[#2C2C2C] font-medium">{review.author}</p>
                        <p className="font-sans text-[10px] text-[#6B6B6B]/40">{review.location} · {review.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array(review.rating).fill(0).map((_, j) => (
                        <Star key={j} size={11} className="fill-[#B8A06C] text-[#B8A06C]" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 font-sans text-sm text-[#6B6B6B]/70 leading-relaxed">{review.content}</p>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <div className="mt-16 text-center">
          <Link href="/#products" className="inline-flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#2C2C2C] transition-colors tracking-wider uppercase font-sans font-medium">
            <ArrowUpLeft size={12} strokeWidth={1.5} /> Back to Collection
          </Link>
        </div>
      </div>

      {/* ============ 主图放大灯箱 ============ */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-[#1A1A1A]/95 flex items-center justify-center p-4 md:p-10"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged product image"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-5 right-5 p-2.5 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
          <img
            src={images[selectedImage]}
            alt={product.nameEn || product.name}
            className="max-h-full max-w-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" onClick={e => e.stopPropagation()}>
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative w-14 h-14 overflow-hidden border transition-colors ${i === selectedImage ? 'border-white' : 'border-white/25 hover:border-white/60'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
