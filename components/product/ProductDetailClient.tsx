'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowUpLeft, Star, ShoppingBag, Plus, Minus, Check, ShieldCheck, Truck, RotateCcw,
  MessageCircle, Heart, X, ChevronDown, Package, Clock, ChevronRight, ZoomIn, Zap, Gift,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import type { Product, Review } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import ProductCard from '@/components/product/ProductCard'
import StickyBuyBar from '@/components/product/StickyBuyBar'
import { useProductPrice, useDiscountedCartSubtotal } from '@/lib/promotion-client'
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

/**
 * 设计令牌（对标参考站后统一收紧）
 *   PANEL  干净暖白面板底 —— 参考站用 #FAFAF6，不再到处套白色卡片
 *   INK    主文字：一个强色用到底（参考站的做法），替代此前大量 40%~60% 透明灰
 *   SOFT   次级文字：仍然清晰可读，不是灰到看不清
 *   LINE   5%~10% 发丝分隔线，替代此前偏重的实线
 *   BTN    实心深色按钮（参考站是实心深橄榄 + 白字 + 700 字重）
 */
const PANEL = '#FBFAF7'
const INK = '#241C12'
const SOFT = '#5F5A54'
const GOLD = '#8A6A2E'
const LINE = 'rgba(74,58,36,0.24)'

/** 可折叠详情区块（右侧栏「下拉详情」） */
function Accordion({
  title, icon: Icon, defaultOpen = false, children,
}: { title: string; icon?: any; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: `1px solid ${LINE}` }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 py-[18px] text-left group"
      >
        <span
          className="flex items-center gap-3 font-sans text-[13px] tracking-[0.3em] uppercase font-bold transition-colors duration-300"
          style={{ color: INK }}
        >
          {Icon && <Icon size={15} strokeWidth={1.5} style={{ color: GOLD }} className="transition-transform duration-300 group-hover:scale-110" />}
          {title}
        </span>
        <span
          className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full transition-all duration-300 group-hover:rotate-180"
          style={{ backgroundColor: open ? INK : 'rgba(74,58,36,0.12)' }}
        >
          <ChevronDown
            size={14}
            strokeWidth={1.8}
            className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            style={{ color: open ? '#fff' : GOLD }}
          />
        </span>
      </button>
      <div
        className="grid transition-all duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className={`pb-6 font-sans text-[14px] leading-[1.75] ${open ? 'pdp-acc-open' : ''}`} style={{ color: SOFT }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductDetailClient({
  product,
  reviews: reviewsProp,
  giftProducts = [],
}: {
  product: Product | null
  reviews: Review[]
  /** 服务端取好的赠品商品（来自 product.giftProductIds） */
  giftProducts?: any[]
}) {
  const { addItem, addGiftItem, items: cartItems } = useCart()
  // 免邮进度/小计一律用「促销后」金额，与购物车页、结算页、服务端 calculateShipping 口径一致
  const cartSubtotal = useDiscountedCartSubtotal(cartItems)
  const { currency } = useCurrency()
  const { addToast } = useToast()
  const eff = useProductPrice(product)
  const { labelFor } = useCategories()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  /** 绑了多个赠品时，客户选中的那个 */
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [visitRecord, setVisitRecord] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const buyBoxRef = useRef<HTMLDivElement | null>(null)
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

  // 相关推荐：优先同分类；同分类不足时用「精选 + 其他商品」补足到 4 个
  // （当前每个分类只有 1–3 件商品，只用同分类会经常整个模块空掉）
  useEffect(() => {
    if (!product) return
    let alive = true
    fetch('/api/products?activeOnly=true')
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then(d => {
        if (!alive) return
        const raw: Product[] = Array.isArray(d) ? d : (d.items || [])
        const all = raw.filter((p: Product) => p.id !== product.id)
        const sameCat = all.filter(p => p.category === product.category)
        const others = all
          .filter(p => p.category !== product.category)
          .sort((a, b) => Number(b.featured) - Number(a.featured))
        setRelated([...sameCat, ...others].slice(0, 4))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [product?.id, product?.category])

  // 配送时效 + 免邮门槛
  // 免邮门槛取「分区」的 freeThreshold（lib/settings.ts calculateShipping 真正用它判定），
  // 而不是全局 shippingFreeThreshold —— 两者只在美加相同，其它地区差异很大。
  useEffect(() => {
    fetch('/api/shipping?country=United%20States&subtotal=0')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        const nums = String(d.estimatedDays || '').match(/\d+/g) || []
        setShipping({
          days: nums.length ? Number(nums[0]) : 12,
          freeThreshold: Number(d.zone?.freeThreshold) || 0,
          cost: Number(d.cost) || 0,
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

  // 吸底加购栏的出现时机：主购买区整块滚出视口顶部之后才出现
  // 对标站也是这样——不是一进页面就顶出来，避免和主按钮重复。
  //
  // 注意：这里不能用 IntersectionObserver。主购买区初始位置在首屏之下（y≈930），
  // 往下滚时它直接从"视口下方"跑到"视口上方"，全程 isIntersecting 恒为 false，
  // 观察器只在状态"变化"时回调 —— 于是永远等不到触发。用滚动监听才可靠。
  useEffect(() => {
    const HEADER = 96
    let raf = 0
    const measure = () => {
      raf = 0
      const el = buyBoxRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setShowStickyBar(rect.bottom < HEADER)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [product?.id])

  // 主区改了数量 → 同步给吸底栏
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pdp:qty', { detail: { qty } }))
  }, [qty])

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
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: PANEL }}>
        <p className="font-en text-2xl" style={{ color: SOFT }}>Piece not found</p>
      </div>
    )
  }

  const images = [product.image, ...(product.detailImages || [])].filter(Boolean)
  // 库存说明：这个站的 stock 字段目前从未维护（全部为 0），所以
  // **不能**把 0 当成「售罄」去拦截加购，否则整店无法下单。
  // 只在后台明确填了正数（1–10）时才提示库存紧张。
  const stock = typeof product.stock === 'number' ? product.stock : undefined
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

  /**
   * 赠品相关。
   *
   * 一个商品绑了赠品时（product.giftProductIds），加购/立即购买要把它一起带进购物车：
   *   - 只绑 1 个 → 自动带上，不用客户操作
   *   - 绑多个    → 客户在下方「Choose your free gift」里挑一个
   *
   * ⚠️ 购物车里赠品行的价格写 0 只是显示；真正的免费由服务端按 product_gifts
   * 表核销额度（app/api/orders/route.ts），前端改价格没有意义。
   */
  const giftList = useMemo(
    () => (Array.isArray(giftProducts) ? giftProducts : []),
    [giftProducts]
  )

  /** 当前选中的赠品 id；只有一个赠品时直接就是它 */
  const effectiveGiftId = giftList.length === 0
    ? null
    : giftList.length === 1
      ? giftList[0].id
      : selectedGiftId || giftList[0].id

  /** 把赠品加进购物车（幂等，已在车里就不重复加） */
  const attachGift = () => {
    if (!effectiveGiftId) return
    const gp = giftList.find(g => g.id === effectiveGiftId)
    if (!gp) return
    addGiftItem({
      id: gp.id,
      name: gp.name,
      nameEn: gp.nameEn || gp.name,
      image: gp.image,
      price: 0,
      category: gp.category,
    }, product.id)
  }

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id, name: product.name,
        nameEn: product.nameEn || product.name,
        image: product.image, price: product.price,
        category: product.category,
      })
    }
    attachGift()
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  /** 立即购买：加购后直接进结算页（跳过购物车） */
  const handleBuyNow = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id, name: product.name,
        nameEn: product.nameEn || product.name,
        image: product.image, price: product.price,
        category: product.category,
      })
    }
    attachGift()
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PANEL }}>
      <div className="max-w-[1560px] mx-auto px-6 sm:px-8 lg:px-12 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 font-sans text-[10px] tracking-[0.26em] uppercase mb-8 md:mb-10" style={{ color: 'rgba(74,58,36,0.56)' }}>
          <Link href="/" className="transition-colors hover:opacity-100" style={{ color: 'rgba(74,58,36,0.65)' }}>Home</Link>
          <span>/</span>
          <Link href="/products" className="transition-colors hover:opacity-100" style={{ color: 'rgba(74,58,36,0.65)' }}>All Objects</Link>
          <span>/</span>
          <Link href={`/category/${product.category}`} className="transition-colors hover:opacity-100" style={{ color: 'rgba(74,58,36,0.65)' }}>
            {labelFor(product.category)}
          </Link>
          <span>/</span>
          <span className="font-semibold" style={{ color: GOLD }}>{product.nameEn || product.name}</span>
        </nav>

        {referralCode && (
          <div className="mb-8 rounded-2xl border border-[#A07C34]/20 bg-[#FFFFFF]/70 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-[#8A6A2E]">
                  Social Attribution Active
                </p>
                <p className="mt-1 font-sans text-sm text-[#2A2118]">
                  This page is carrying social tracking parameters — your next order can be attributed back to the campaign.
                </p>
              </div>
              <Link
                href={buildReferralBioLandingUrl({ code: referralCode, productId: product.id, sourceChannel })}
                className="pdp-btn inline-flex items-center justify-center px-4 py-2 text-[11px] tracking-[0.22em] uppercase font-sans font-semibold transition-all duration-300"
                style={{ border: `1px solid rgba(74,58,36,0.28)`, color: INK, borderRadius: 2 }}
              >
                Back to Link in Bio
              </Link>
            </div>
          </div>
        )}

        {/* ============ 主图为主 + 右侧详情 ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)] gap-8 lg:gap-14 xl:gap-16">
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
                <div className="hidden md:flex flex-col gap-2.5 w-[64px] shrink-0">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      aria-label={`View image ${i + 1}`}
                      className="relative aspect-[4/5] w-full overflow-hidden transition-all duration-300 hover:opacity-80"
                      style={{
                        backgroundColor: '#F8F2E2',
                        border: `1px solid ${i === selectedImage ? INK : 'transparent'}`,
                        borderRadius: 2,
                        opacity: i === selectedImage ? 1 : 0.72,
                      }}
                    >
                      <OptimizedImage src={img} alt={`${product.nameEn || product.name} ${i + 1}`} fill sizes="76px" objectFit="cover" placeholder="blur" />
                    </button>
                  ))}
                </div>
              )}

              {/* 主图：桌面端高度贴合视口，滚到顶就钉住不再走 */}
              <div className="flex-1 min-w-0">
                <div
                  className="pdp-media relative aspect-[4/5] lg:aspect-auto lg:h-[calc(100dvh-9rem)] overflow-hidden group cursor-zoom-in"
                  style={{ backgroundColor: '#F8F2E2', borderRadius: 3 }}
                  onClick={() => setLightbox(true)}
                >
                  <PromoImageBadge eff={eff} currency={currency} className="top-4 left-4 z-10" />
                  <OptimizedImage
                    src={images[selectedImage]}
                    alt={product.nameEn || product.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
                    objectFit="cover"
                    placeholder="blur"
                  />
                  <span
                    className="absolute bottom-4 right-4 flex items-center gap-1.5 backdrop-blur-sm px-3 py-2 font-sans text-[9px] font-semibold tracking-[0.26em] uppercase opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                    style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: INK, borderRadius: 2 }}
                  >
                    <ZoomIn size={11} strokeWidth={1.8} /> Click to enlarge
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
                        className="relative w-16 h-16 overflow-hidden transition-opacity duration-300"
                        style={{
                          backgroundColor: '#F8F2E2',
                          border: `1px solid ${i === selectedImage ? INK : 'transparent'}`,
                          borderRadius: 2,
                          opacity: i === selectedImage ? 1 : 0.72,
                        }}
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
            <span className="font-sans text-[10px] tracking-[0.24em] uppercase font-semibold" style={{ color: GOLD }}>
              {labelFor(product.category)}
            </span>

            <h1
              className="font-en text-[30px] md:text-[42px] md:leading-[1.12] font-medium mt-3 tracking-[-0.01em]"
              style={{ color: INK }}
            >
              {product.nameEn || product.name}
            </h1>
            <p className="font-sans text-[15px] mt-3.5 leading-[1.65]" style={{ color: SOFT }}>
              {product.subtitleEn || product.subtitle}
            </p>

            {/* 评分 —— 有真实评价才显示 */}
            {product.reviewCount > 0 && (
              <a href="#reviews" className="inline-flex items-center gap-2 mt-4 group">
                <span className="flex items-center gap-[3px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={i < Math.round(product.rating) ? 'fill-[#A07C34] text-[#A07C34]' : 'text-[#A07C34]/25'}
                    />
                  ))}
                </span>
                <span
                  className="font-sans text-[12px] font-medium transition-colors duration-200 group-hover:opacity-70"
                  style={{ color: INK }}
                >
                  {product.rating} · {product.reviewCount} review{product.reviewCount > 1 ? 's' : ''}
                </span>
                <ChevronRight size={13} strokeWidth={1.8} className="transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: GOLD }} />
              </a>
            )}

            {/* 价格 */}
            <div className="flex items-baseline gap-3 mt-7">
              <span
                className="font-en text-[34px] md:text-[40px] font-medium tracking-[-0.01em]"
                style={{ color: eff.discount > 0 ? '#A83420' : INK }}
              >
                {formatPrice(convertPrice(eff.price, currency), currency)}
              </span>
              {eff.discount > 0 && <PromoSaleTag />}
              {(eff.originalPrice || product.originalPrice) && (
                <span className="font-sans text-[15px] line-through" style={{ color: 'rgba(74,58,36,0.58)' }}>
                  {formatPrice(convertPrice(eff.originalPrice || product.originalPrice || 0, currency), currency)}
                </span>
              )}
            </div>

            {/* 免邮目标：在挑商品的阶段就把门槛立起来（购物车/结算页也有，这里更早）
                门槛来自分区值（zone.freeThreshold），与真实免邮判定完全一致 */}
            {(() => {
              const th = shipping?.freeThreshold || 0
              if (!th) return null
              const sub = cartSubtotal || 0
              const remain = Math.max(0, th - sub)
              const pct = Math.min(100, Math.round((sub / th) * 100))
              const unlocked = remain <= 0 && sub > 0
              return (
                <div className="mt-5">
                  {unlocked ? (
                    <p className="flex items-center gap-2 font-sans text-[13px] font-medium" style={{ color: '#2E7D5B' }}>
                      <Check size={14} strokeWidth={2.2} /> You&apos;ve unlocked free shipping
                    </p>
                  ) : (
                    <>
                      <p className="flex items-center gap-2 font-sans text-[13px]" style={{ color: SOFT }}>
                        <Truck size={14} strokeWidth={1.6} style={{ color: GOLD }} />
                        {/* 整句包在 span 里：父级是 flex，若 strong 直接当子元素会变成独立
                            flex 项，导致 innerText/读屏把句子拆成两行 */}
                        <span>
                          {sub > 0 ? (
                            <>Add <strong style={{ color: INK, fontWeight: 600 }}>{formatPrice(convertPrice(remain, currency), currency)}</strong> more for free shipping</>
                          ) : (
                            <>Free shipping on orders over <strong style={{ color: INK, fontWeight: 600 }}>{formatPrice(convertPrice(th, currency), currency)}</strong></>
                          )}
                        </span>
                      </p>
                      {sub > 0 && (
                        <div data-free-ship-bar="1" className="h-1.5 rounded-full overflow-hidden mt-2.5" style={{ backgroundColor: 'rgba(74,58,36,0.20)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: '#5F7D72' }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}

            {/* 库存 / 时效 */}
            <div className="mt-5 space-y-2.5">
              {lowStock ? (
                <p className="flex items-center gap-2.5 font-sans text-[13px] font-medium" style={{ color: '#A83420' }}>
                  <Package size={14} strokeWidth={1.6} /> Only {stock} left in stock
                </p>
              ) : (
                <p className="flex items-center gap-2.5 font-sans text-[13px]" style={{ color: SOFT }}>
                  <Package size={14} strokeWidth={1.6} style={{ color: GOLD }} /> In stock — ready to ship from the workshop
                </p>
              )}
              {deliveryText && (
                <p className="flex items-center gap-2.5 font-sans text-[13px]" style={{ color: SOFT }}>
                  <Clock size={14} strokeWidth={1.6} style={{ color: GOLD }} /> Order today, estimated arrival <strong style={{ color: INK, fontWeight: 600 }}>{deliveryText}</strong>
                </p>
              )}
            </div>

            {/* 规格表 */}
            {specRows.length > 0 && (
              <div className="grid grid-cols-3 gap-5 mt-7 py-6" style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
                {specRows.map(([label, value]) => (
                  <div key={label}>
                    <span className="font-sans text-[9px] tracking-[0.26em] uppercase font-semibold" style={{ color: 'rgba(74,58,36,0.56)' }}>{label}</span>
                    <p className="font-sans text-[14px] mt-1.5 leading-snug font-medium" style={{ color: INK }}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 数量 + 加购 */}
            <div ref={buyBoxRef} className="flex items-stretch gap-3 mt-7">
              <div className="flex items-center" style={{ border: `1px solid rgba(74,58,36,0.28)` }}>
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 transition-colors duration-200 hover:opacity-60" style={{ color: SOFT }} aria-label="Decrease quantity">
                  <Minus size={14} strokeWidth={1.8} />
                </button>
                <span className="px-2 font-sans text-[15px] font-medium min-w-[2.2rem] text-center" style={{ color: INK }}>{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)} className="px-4 py-3 transition-colors duration-200 hover:opacity-60" style={{ color: SOFT }} aria-label="Increase quantity">
                  <Plus size={14} strokeWidth={1.8} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                className="pdp-btn flex-1 flex items-center justify-center gap-2.5 px-8 py-3.5 font-sans text-[12px] font-bold tracking-[0.28em] uppercase text-white transition-all duration-300"
                style={{ backgroundColor: added ? GOLD : INK, borderRadius: 2 }}
              >
                {added ? <><Check size={15} strokeWidth={2} /> Added to Cart</> : <><ShoppingBag size={15} strokeWidth={2} /> Add to Cart</>}
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className="px-4 transition-all duration-300 hover:-translate-y-px"
                style={{
                  border: `1px solid ${isWishlisted ? '#A83E33' : 'rgba(74,58,36,0.28)'}`,
                  backgroundColor: isWishlisted ? 'rgba(184,84,80,0.06)' : 'transparent',
                  color: isWishlisted ? '#A83E33' : SOFT,
                  borderRadius: 2,
                }}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={17} strokeWidth={1.6} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* ===== 赠品区（买一送一 / 免费搭配） =====
                绑 1 个 → 直接展示"随货赠送"，不用客户操作
                绑多个 → 客户自己挑一个，选中项实时高亮 */}
            {giftList.length > 0 && (
              <div
                data-gift-section="1"
                className="mt-5 p-4"
                style={{ backgroundColor: '#FBF3DF', border: '1px solid #EBD9AE', borderRadius: 3 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={14} strokeWidth={2} style={{ color: '#8A6A2E' }} />
                  <span className="font-sans text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: '#6B5220' }}>
                    {giftList.length > 1 ? 'Choose your free gift' : 'Free gift with this piece'}
                  </span>
                </div>

                {giftList.length === 1 ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={giftList[0].image} alt="" className="w-12 h-12 object-cover shrink-0"
                      style={{ borderRadius: 2, backgroundColor: '#F8F2E2' }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[13px] font-medium truncate" style={{ color: INK }}>
                        {giftList[0].nameEn || giftList[0].name}
                      </p>
                      <p className="font-sans text-[11px]" style={{ color: '#4A665D' }}>
                        <span className="line-through opacity-50 mr-1.5">{formatPrice(convertPrice(giftList[0].price, currency), currency)}</span>
                        FREE
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {giftList.map((g: any) => {
                      const active = g.id === effectiveGiftId
                      return (
                        <button
                          key={g.id}
                          type="button"
                          data-gift-option={g.id}
                          onClick={() => setSelectedGiftId(g.id)}
                          className="w-full flex items-center gap-3 p-2 text-left transition-all duration-200"
                          style={{
                            backgroundColor: active ? '#FFFFFF' : 'transparent',
                            border: `1px solid ${active ? '#8A6A2E' : 'transparent'}`,
                            borderRadius: 3,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={g.image} alt="" className="w-11 h-11 object-cover shrink-0"
                            style={{ borderRadius: 2, backgroundColor: '#F8F2E2' }} />
                          <div className="min-w-0 flex-1">
                            <p className="font-sans text-[13px] font-medium truncate" style={{ color: INK }}>
                              {g.nameEn || g.name}
                            </p>
                            <p className="font-sans text-[11px]" style={{ color: '#4A665D' }}>
                              <span className="line-through opacity-50 mr-1.5">{formatPrice(convertPrice(g.price, currency), currency)}</span>
                              FREE
                            </p>
                          </div>
                          <span
                            className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ border: `1.5px solid ${active ? '#8A6A2E' : 'rgba(74,58,36,0.3)'}` }}
                          >
                            {active && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8A6A2E' }} />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <p className="mt-3 font-sans text-[10px] leading-relaxed" style={{ color: 'rgba(107,82,32,0.75)' }}>
                  Added automatically at checkout — you pay nothing for it.
                </p>
              </div>
            )}

            {/* 立即购买：直接进结算，跳过购物车这一步 */}
            <button
              type="button"
              onClick={handleBuyNow}
              className="pdp-btn mt-3 w-full flex items-center justify-center gap-2 px-8 py-3.5 font-sans text-[12px] font-bold tracking-[0.28em] uppercase transition-all duration-300 hover:-translate-y-px"
              style={{ backgroundColor: '#fff', color: INK, border: `1px solid ${INK}`, borderRadius: 2 }}
            >
              <Zap size={15} strokeWidth={2.2} /> Buy Now
            </button>

            {/* 咨询 */}
            <Link
              href={'/messages?product=' + product.id}
              className="pdp-btn inline-flex items-center gap-2 mt-3 px-5 py-3 font-sans text-[12px] font-semibold tracking-[0.06em] transition-all duration-300 w-full justify-center hover:-translate-y-px"
              style={{ border: `1px solid rgba(74,58,36,0.28)`, color: INK, borderRadius: 2 }}
            >
              <MessageCircle size={15} strokeWidth={1.7} style={{ color: GOLD }} />
              <span>Ask about this piece</span>
              <span className="text-[12px]" style={{ color: GOLD }}>→</span>
            </Link>

            {/* 信任条 */}
            <div className="flex flex-wrap gap-x-6 gap-y-2.5 mt-7 pt-6" style={{ borderTop: `1px solid ${LINE}` }}>
              {[
                { icon: ShieldCheck, text: 'Authenticity Guaranteed' },
                { icon: Truck, text: 'Free Damaged Replacement' },
                { icon: RotateCcw, text: '30-Day Money Back' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 font-sans text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(74,58,36,0.65)' }}>
                  <item.icon size={13} strokeWidth={1.7} style={{ color: GOLD }} /> {item.text}
                </div>
              ))}
            </div>

            {/* ---------- 下拉详情 ---------- */}
            <div className="mt-9" style={{ borderTop: `1px solid ${LINE}` }}>
              <Accordion title="Description" icon={Package} defaultOpen>
                <p>{product.descriptionEn || product.description}</p>
                {(product.tagsEn || product.tags)?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-5">
                    {(product.tagsEn || product.tags).map((tag, i) => (
                      <span key={i} className="font-sans text-[10px] tracking-[0.08em] uppercase px-3 py-1.5" style={{ color: GOLD, backgroundColor: 'rgba(139,125,92,0.07)', border: '1px solid rgba(184,160,108,0.22)', borderRadius: 2 }}>
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
                        <dt className="w-24 shrink-0 text-[9px] tracking-[0.26em] uppercase font-semibold pt-1" style={{ color: 'rgba(74,58,36,0.56)' }}>{label}</dt>
                        <dd className="text-[14px] font-medium" style={{ color: INK }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {(product.storyEn || product.story) && (
                    <p className="mt-5 text-[14px] leading-[1.75]">{product.storyEn || product.story}</p>
                  )}
                </Accordion>
              )}

              <Accordion title="Shipping & Returns" icon={Truck}>
                <ul className="space-y-3">
                  <li>
                    Dispatched from the workshop within 1–2 business days.
                    {shipping && shipping.days > 0 && <> Estimated delivery <strong style={{ color: INK, fontWeight: 600 }}>{shipping.days}–{shipping.days + 7} days</strong>{deliveryText && <> ({deliveryText})</>}.</>}
                  </li>
                  {shipping && shipping.freeThreshold > 0 && (
                    <li>
                      Free shipping on orders over <strong style={{ color: INK, fontWeight: 600 }}>${shipping.freeThreshold.toFixed(2)}</strong>
                      {shipping.cost > 0 && <> · flat rate ${shipping.cost.toFixed(2)} below that</>}.
                    </li>
                  )}
                  <li>Every piece is packed in protective, gift-ready packaging. Damaged in transit? We replace it free.</li>
                  <li>30-day money-back guarantee — return it unused in original packaging.</li>
                </ul>
              </Accordion>

              <Accordion title="Questions & Answers" icon={MessageCircle}>
                <dl className="space-y-5">
                  <div>
                    <dt className="font-semibold text-[14px]" style={{ color: INK }}>Is this piece genuinely handmade?</dt>
                    <dd className="mt-1.5 text-[14px] leading-[1.75]">Yes. Each piece is made by hand in the workshop named above — small variations in glaze and finish are the signature of handmade work, not defects.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[14px]" style={{ color: INK }}>Will it arrive safely?</dt>
                    <dd className="mt-1.5 text-[14px] leading-[1.75]">Every order ships double-boxed with padding. If anything arrives damaged, send us a photo and we will replace it at no cost.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[14px]" style={{ color: INK }}>Can I ask before ordering?</dt>
                    <dd className="mt-1.5 text-[14px] leading-[1.75]">
                      Of course — use <strong style={{ color: INK, fontWeight: 600 }}>Ask about this piece</strong> above and we will reply within 24 hours.
                    </dd>
                  </div>
                </dl>
              </Accordion>
            </div>

            {/* ===== 以下是右栏延长区：左主图钉住时，这里持续下滑 ===== */}

            {/* 工艺故事 */}
            {(product.storyEn || product.story) && (
              <div className="mt-12 pt-10" style={{ borderTop: `1px solid ${LINE}` }}>
                <h2 className="font-en text-[22px] font-medium tracking-[0.005em]" style={{ color: INK }}>The Story Behind This Piece</h2>
                <p className="mt-4 font-sans text-[14px] leading-[1.85]" style={{ color: SOFT }}>{product.storyEn || product.story}</p>
              </div>
            )}

            {/* 评价 */}
            <div id="reviews" className="mt-12 pt-10 scroll-mt-24" style={{ borderTop: `1px solid ${LINE}` }}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-en text-[22px] font-medium tracking-[0.005em]" style={{ color: INK }}>
                  Reviews{product.reviewCount > 0 ? ` (${reviews.length || product.reviewCount})` : ''}
                </h2>
                {product.reviewCount > 0 && (
                  <span className="flex items-center gap-1.5 font-sans text-[12px] font-medium" style={{ color: SOFT }}>
                    <Star size={12} className="fill-[#A07C34] text-[#A07C34]" /> {product.rating}
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {reviews.length === 0 ? (
                  <p className="font-sans text-[14px] py-6" style={{ color: SOFT }}>
                    No reviews yet. Reviews from customers who completed an order will appear here.
                  </p>
                ) : (
                  reviews.map((review, i) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                      className="p-5 transition-shadow duration-300 hover:shadow-[0_8px_30px_-18px_rgba(35,31,28,0.35)]"
                      style={{ backgroundColor: '#FFFFFF', border: `1px solid ${LINE}`, borderRadius: 3 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-sm overflow-hidden shrink-0" style={{ backgroundColor: 'rgba(139,125,92,0.10)', color: GOLD }}>
                            {review.avatar && (review.avatar.startsWith('http') || review.avatar.startsWith('/api/uploads') || review.avatar.startsWith('/images/')) ? (
                              <img src={review.avatar} alt={review.author} className="w-full h-full object-cover" />
                            ) : (review.avatar)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-sans text-[13px] font-semibold truncate" style={{ color: INK }}>{review.author}</p>
                            <p className="font-sans text-[11px] truncate" style={{ color: 'rgba(74,58,36,0.56)' }}>{review.location} · {review.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-[2px] shrink-0">
                          {Array(review.rating).fill(0).map((_, j) => (
                            <Star key={j} size={11} className="fill-[#A07C34] text-[#A07C34]" />
                          ))}
                        </div>
                      </div>
                      <p className="mt-3 font-sans text-[14px] leading-[1.75]" style={{ color: SOFT }}>{review.content}</p>
                    </motion.div>
                  ))
                )}
              </div>
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
              <h2 className="font-en text-2xl md:text-3xl font-medium tracking-[0.005em]" style={{ color: INK }}>You May Also Like</h2>
              <Link href={`/category/${product.category}`} className="font-sans text-[10px] tracking-[0.26em] uppercase font-semibold transition-opacity hover:opacity-60" style={{ color: GOLD }}>
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </motion.div>
        )}

        <div className="mt-16 text-center">
          <Link href="/#products" className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-60 tracking-[0.26em] uppercase font-sans font-semibold" style={{ color: SOFT }}>
            <ArrowUpLeft size={12} strokeWidth={1.8} /> Back to Collection
          </Link>
        </div>
      </div>

      {/* ============ 吸底加购栏（主购买区滚出视口后出现） ============ */}
      <StickyBuyBar
        product={product}
        effPrice={eff.price}
        originalPrice={eff.originalPrice || product.originalPrice}
        discount={eff.discount}
        visible={showStickyBar && !lightbox}
        freeThreshold={shipping?.freeThreshold}
      />

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
