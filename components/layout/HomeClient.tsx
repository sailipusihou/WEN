'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight, Loader2, Plus } from 'lucide-react'
import { ShowroomGrid } from '@/components/product/ShowroomCard'
import type { Product } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { useToast } from '@/context/ToastContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import { trackReferralVisit } from '@/lib/referral-client'
import HomeReviews from '@/components/layout/HomeReviews'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
}
const stagger = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
}

export default function HomeClient({ featuredProducts, heroBgImage = "", initialContent = null, reviews = [] }: { featuredProducts: Product[], heroBgImage?: string, initialContent?: any, reviews?: any[] }) {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const heroParallax = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.4])
  const featuredRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: featuredScroll } = useScroll({ target: featuredRef, offset: ["start end", "end start"] })
  const featuredHeadY = useTransform(featuredScroll, [0, 1], [24, -24])
  const searchParams = useSearchParams()

  // 首屏内容由服务端注入，避免「先闪默认图再切成后台设置的图」的问题
  const [fc, setFc] = useState<any>(initialContent)
  const [categories, setCategories] = useState<any[]>([])
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [newsletterMessage, setNewsletterMessage] = useState('')

  useEffect(() => {
    fetch("/api/frontend-content")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFc(d) })
      .catch(() => {})
    
    fetch("/api/categories")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCategories(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const refCode = searchParams.get('ref')
    const sourceChannel = searchParams.get('channel') || 'direct'
    if (refCode) {
      trackReferralVisit({
        refCode,
        page: window.location.pathname,
        query: window.location.search,
        sourceChannel,
      })
    }
  }, [searchParams])

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail || newsletterStatus === 'loading') return
    setNewsletterStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, source: 'homepage' }),
      })
      const data = await res.json()
      if (res.ok) {
        setNewsletterStatus('success')
        setNewsletterMessage(data.message || 'Subscribed successfully')
        setNewsletterEmail('')
      } else {
        setNewsletterStatus('error')
        setNewsletterMessage(data.error || 'Subscription failed')
      }
    } catch {
      setNewsletterStatus('error')
      setNewsletterMessage('Connection error')
    }
  }

  const hero = fc?.hero || {}
  const philosophyStrip = fc?.philosophyStrip || []
  const collections = fc?.collections || []
  const featured = fc?.featuredSection || {}
  const artisanStory = fc?.artisanStory || {}
  const philosophySection = fc?.philosophySection || {}
  const journal = fc?.journal || {}
  const seasonal = fc?.seasonal || {}
  const newsletter = fc?.newsletter || {}
  const defaultBg = heroBgImage || "https://images.unsplash.com/photo-1525123996019-3a89eb3aee80?w=1920&q=80"

  // === Hero 轮播逻辑 ===
  // 内容未就绪前不渲染任何背景（避免先闪出兜底图/旧图，再切换到后台真正设置的背景）
  const heroContentReady = fc !== null

  // 合并 backgroundImages 数组, 若为空则退化为单图模式 [backgroundImage || defaultBg]
  const slideshowImages: string[] = useMemo(() => {
    if (!heroContentReady) return []
    const imgs = Array.isArray(hero.backgroundImages) ? hero.backgroundImages.filter(Boolean) : []
    if (imgs.length > 0) return imgs
    return [hero.backgroundImage || defaultBg]
  }, [heroContentReady, hero.backgroundImages, hero.backgroundImage, defaultBg])

  const slideshowEnabled = hero.slideshowEnabled !== false && slideshowImages.length > 1
  const slideshowInterval = Math.max(3, hero.slideshowInterval ?? 6) // 秒
  const slideshowTransition = Math.max(500, hero.slideshowTransition ?? 1500) // ms
  const kenBurnsEnabled = hero.kenBurnsEnabled !== false

  // === 视频背景逻辑 ===
  // 启用视频时, 视频层覆盖图片轮播层
  const videoList: string[] = useMemo(() => {
    if (!heroContentReady) return []
    const vids = Array.isArray(hero.backgroundVideos) ? hero.backgroundVideos.filter(Boolean) : []
    if (vids.length > 0) return vids
    if (hero.backgroundVideo) return [hero.backgroundVideo]
    return []
  }, [heroContentReady, hero.backgroundVideos, hero.backgroundVideo])

  const videoEnabled = !!hero.videoEnabled && videoList.length > 0
  const videoMulti = videoList.length > 1
  const videoSlideshowEnabled = hero.videoSlideshowEnabled !== false && videoMulti
  const videoSlideshowInterval = Math.max(5, hero.videoSlideshowInterval ?? 8)
  const videoLoop = hero.videoLoop !== false
  const videoMuted = hero.videoMuted !== false
  const videoAutoplay = hero.videoAutoplay !== false
  const videoControls = !!hero.videoControls
  const videoFit = hero.videoFit === 'contain' ? 'contain' : 'cover'

  // 主页展示亮度/色温控制
  // 色温 50 与 亮度 100 都表示「原生」：此时必须彻底不套滤镜。
  // 原实现即使在中性值也会输出 sepia(0) hue-rotate(0deg) saturate(1)，
  // 虽然数学上是恒等变换，但仍会强制浏览器多建一层滤镜合成，画面容易发灰发黄。
  const heroBrightness = hero.heroBrightness ?? 100
  const heroTemperature = hero.heroTemperature ?? 50

  const getTemperatureFilter = () => {
    const t = (heroTemperature - 50) / 50
    if (t === 0) return 'none'
    if (t < 0) {
      const coldIntensity = Math.abs(t)
      return `hue-rotate(${coldIntensity * 15}deg) saturate(${1 - coldIntensity * 0.2})`
    }
    const warmIntensity = t
    return `sepia(${warmIntensity * 0.25}) hue-rotate(${-warmIntensity * 12}deg) saturate(${1 + warmIntensity * 0.15})`
  }

  /** 亮度 100% 且色温中性 → 不加任何滤镜，保持素材原色 */
  const heroMediaFilter = (() => {
    const temp = getTemperatureFilter()
    if (Number(heroBrightness) === 100 && temp === 'none') return undefined
    return `brightness(${heroBrightness}%)${temp === 'none' ? '' : ' ' + temp}`
  })()

  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 视频启用时不需要轮播计时器
    if (!slideshowEnabled || isPaused || videoEnabled) return
    slideTimerRef.current = setTimeout(() => {
      setCurrentSlide(prev => (prev + 1) % slideshowImages.length)
    }, slideshowInterval * 1000)
    return () => { if (slideTimerRef.current) clearTimeout(slideTimerRef.current) }
  }, [currentSlide, slideshowEnabled, slideshowInterval, isPaused, slideshowImages.length, videoEnabled])

  // 视频轮播计时器
  useEffect(() => {
    if (!videoSlideshowEnabled || isPaused) return
    videoTimerRef.current = setTimeout(() => {
      setCurrentVideoIdx(prev => (prev + 1) % videoList.length)
    }, videoSlideshowInterval * 1000)
    return () => { if (videoTimerRef.current) clearTimeout(videoTimerRef.current) }
  }, [currentVideoIdx, videoSlideshowEnabled, videoSlideshowInterval, isPaused, videoList.length])

  // 跳到指定 slide
  const goToSlide = (idx: number) => {
    if (slideshowImages.length === 0) return
    if (idx === currentSlide) return
    setCurrentSlide((idx + slideshowImages.length) % slideshowImages.length)
  }
  const nextSlide = () => goToSlide(currentSlide + 1)
  const prevSlide = () => goToSlide(currentSlide - 1)

  // 每张图的 Ken Burns 方向交替, 让动效更丰富
  const kenBurnsVariants = [
    { scale: [1, 1.12], x: [0, "-2%"], y: [0, "-2%"] },
    { scale: [1.08, 1], x: ["2%", 0], y: ["2%", 0] },
    { scale: [1, 1.15], x: ["-2%", "2%"], y: [0, 0] },
    { scale: [1.1, 1], x: [0, 0], y: ["-2%", "2%"] },
  ]

  return (
    <>
      {/* HERO */}
      <section ref={heroRef} className="relative -mt-[var(--header-h)] h-screen flex items-center overflow-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}>
        <motion.div className="absolute inset-0 bg-ink-deep" style={{ y: heroParallax }}>
          {/* 多图轮播层 — 使用 AnimatePresence 做淡入淡出 (视频启用时隐藏) */}
          {!videoEnabled && (
            <div className="absolute inset-0">
              <AnimatePresence mode="sync">
                {slideshowImages.map((img, idx) => (
                  idx === currentSlide && (
                    <motion.div
                      key={idx}
                      className="absolute inset-0 bg-cover bg-center"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: idx === currentSlide ? (hero.overlayOpacity ?? 55) / 100 : 0,
                        ...(kenBurnsEnabled ? kenBurnsVariants[idx % kenBurnsVariants.length] : {}),
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: slideshowTransition / 1000, ease: "easeInOut" },
                        scale: { duration: slideshowInterval + slideshowTransition / 1000, ease: "easeOut" },
                        x: { duration: slideshowInterval + slideshowTransition / 1000, ease: "easeOut" },
                        y: { duration: slideshowInterval + slideshowTransition / 1000, ease: "easeOut" },
                      }}
                      style={{
                        backgroundImage: `url(${img})`,
                        ...(heroMediaFilter ? { filter: heroMediaFilter } : {}),
                      }}
                    />
                  )
                ))}
              </AnimatePresence>
            </div>
          )}
          {/* 视频背景层 — 启用时覆盖图片轮播 */}
          {videoEnabled && (
            <div className="absolute inset-0 overflow-hidden">
              <AnimatePresence mode="sync">
                {videoList.map((src, idx) => (
                  idx === currentVideoIdx && (
                    <motion.div
                      key={idx}
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ opacity: { duration: 1.2, ease: "easeInOut" } }}
                    >
                      <video
                        src={src}
                        muted={videoMuted}
                        loop={!videoMulti ? videoLoop : false}
                        autoPlay={videoAutoplay}
                        controls={videoControls}
                        playsInline
                        className="absolute inset-0 w-full h-full"
                        style={{
                          objectFit: videoFit,
                          ...(heroMediaFilter ? { filter: heroMediaFilter } : {}),
                        }}
                      />
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>
          )}
          {/* 遮罩必须是中性黑：原先用暖棕 ink-deep，等于给视频整体加了一层黄棕滤镜，
              素材被染成"泛黄"。改用中性黑只压亮度、不动色相，保住原生色彩；
              厚度集中在左侧文案区，右半幅视频几乎不动，让画面尽量还原。 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        </motion.div>
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.2\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'0.3\'/%3E%3C/g%3E%3C/svg%3E")' }} />
        <motion.div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12" style={{ opacity: heroOpacity }}>
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <span className="font-en italic text-[15px] tracking-[0.01em] text-coral border-b border-coral/25 pb-1 inline-block">
                {hero.eyebrow || "Low Flame · Contemporary Craftsmanship"}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mt-5 font-en text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-paper-light font-medium leading-[1.05] tracking-[0.005em]"
            >
              {(hero.headline || "Objects That\nCarry Stories").split("\n").map((line: string, i: number) => (
                // 第二行用 Playfair 斜体：编辑式排版，比整段同款字体更有「花样」
                <span key={i} className={i > 0 ? 'italic font-normal' : ''}>{i > 0 && <br />}{line}</span>
              ))}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-5 text-sm md:text-base text-paper-light/76 font-sans font-light leading-relaxed max-w-md">
              {hero.subtitle || "Celadon, silk, bamboo, and incense — each piece hand-selected from master craftspeople."}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href={hero.buttonLink || "/products"}
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-coral text-paper-light text-[12px] tracking-[0.2em] uppercase font-sans font-medium hover:bg-coral-dark transition-all duration-300">
                {hero.buttonText || "Explore the Collection"} <ArrowUpRight size={13} strokeWidth={1.5} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link href={hero.secondaryLink || "/#philosophy"}
                className="text-[12px] text-paper-light/86 hover:text-paper-light/86 transition-colors tracking-[0.22em] uppercase font-sans font-medium">
                {hero.secondaryText || "Our Philosophy"}
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* 轮播控制 — 仅在多图且未启用视频时显示 */}
        {slideshowEnabled && !videoEnabled && (
          <>
            {/* 左右箭头 — 悬停显示 */}
            <button onClick={prevSlide} aria-label="Previous slide"
              className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/86 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button onClick={nextSlide} aria-label="Next slide"
              className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/86 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            {/* 底部指示点 + 进度条 */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {slideshowImages.map((_, idx) => (
                <button key={idx} onClick={() => goToSlide(idx)} aria-label={`Slide ${idx + 1}`}
                  className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
                  style={{
                    width: idx === currentSlide ? 36 : 12,
                    backgroundColor: idx === currentSlide ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)",
                  }}>
                  {idx === currentSlide && (
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-[#FFFFFF]/80"
                      initial={{ width: "0%" }}
                      animate={{ width: isPaused ? "0%" : "100%" }}
                      transition={{ duration: slideshowInterval, ease: "linear" }}
                      key={`${currentSlide}-${isPaused}`}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* 计数器 */}
            <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20 font-en text-[12px] text-white/76 tracking-[0.28em]">
              {String(currentSlide + 1).padStart(2, '0')} <span className="text-white/58">/</span> {String(slideshowImages.length).padStart(2, '0')}
            </div>
          </>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <span className="font-sans text-[12px] text-white/79 tracking-[0.25em] uppercase">Scroll</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-4 h-7 border border-white/10 rounded-full flex justify-center pt-1">
            <div className="w-0.5 h-1.5 bg-[#FFFFFF]/20 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* PHILOSOPHY STRIP */}
      <section className="py-14 md:py-18 border-b border-paper bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {(philosophyStrip.length > 0 ? philosophyStrip : [
              { number: "01", label: "Hand-Selected", desc: "Every object personally curated from master workshops" },
              { number: "02", label: "Authentic Craft", desc: "Direct from artisans" },
              { number: "03", label: "Ethical Sourcing", desc: "Fair partnerships" },
              { number: "04", label: "Timeless Design", desc: "Objects made to last" },
            ]).map((item: any, i: number) => (
              <motion.div key={i} {...stagger} transition={{ delay: i * 0.08 }}>
                <span className="font-en text-[11px] text-coral tracking-[0.18em]">{item.number}</span>
                <h4 className="font-sans text-[11px] font-medium text-ink-deep mt-2 tracking-[0.08em] uppercase">{item.label}</h4>
                <p className="font-sans text-[11px] text-ink-soft/82 mt-1 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COLLECTIONS CAROUSEL */}
      <section className="py-20 md:py-28 bg-[#FFFFFF] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div {...fadeUp} className="mb-12">
            <span className="font-en italic text-[15px] tracking-[0.01em] text-coral">Curated by Heritage</span>
            <h2 className="font-en text-3xl md:text-5xl text-ink-deep font-medium mt-2 tracking-[0.005em]">Our Collections</h2>
          </motion.div>
          {categories.length > 0 && (
            <CollectionLookbook
              items={categories.map(cat => ({
                ...cat,
                title: cat.nameEn,
                subtitle: cat.name,
                description: cat.descriptionEn || cat.description,
              }))} 
              slideshowEnabled={fc?.collectionsSlideshowEnabled}
              slideshowInterval={fc?.collectionsSlideshowInterval}
            />
          )}
        </div>
      </section>

      {/* FEATURED PRODUCTS - 3D Showroom */}
      <section id="products" ref={featuredRef} className="py-20 md:py-28 bg-paper-light">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div {...fadeUp} style={{ y: featuredHeadY }} className="flex items-end justify-between mb-10">
            <div>
              <span className="font-en italic text-[15px] tracking-[0.01em] text-coral">{featured.eyebrow || "Curated Selection"}</span>
              <h2 className="font-en text-3xl md:text-5xl text-ink-deep font-medium mt-2 tracking-[0.005em]">{featured.headline || "Featured Pieces"}</h2>
            </div>
          </motion.div>
          <ShowroomGrid products={featuredProducts} />
          <motion.div {...fadeUp} className="text-center mt-10">
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-ink-deep text-paper-light text-[12px] tracking-[0.2em] uppercase font-sans font-medium hover:bg-ink transition-colors">
              Browse All Products <ArrowUpRight size={12} strokeWidth={1.5} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ARTISAN STORY */}
      <section className="py-20 md:py-28 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div {...fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden bg-paper">
                <OptimizedImage
                  src={artisanStory.image || "https://images.unsplash.com/photo-1525123996019-3a89eb3aee80?w=800&q=80"}
                  alt={artisanStory.headline || "Artisan story"}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  objectFit="cover"
                  placeholder="blur"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-[#FFFFFF] p-5 md:p-6 shadow-soft-lg max-w-[170px]">
                <span className="font-en text-2xl font-medium text-ink-deep">{artisanStory.badgeNumber || "45+"}</span>
                <p className="font-sans text-[11px] text-ink-soft/82 mt-1 leading-relaxed">{artisanStory.badgeText || "Master artisans"}</p>
              </div>
            </div>
            <div>
              <span className="font-en italic text-[15px] tracking-[0.01em] text-coral">{artisanStory.eyebrow || "Behind the Craft"}</span>
              <h2 className="font-en text-3xl md:text-4xl text-ink-deep font-medium mt-3 leading-tight tracking-[0.005em]">
                {(artisanStory.headline || "Every Object Has a\nMaker, Place, Story").split("\n").map((l: string, i: number) => <span key={i}>{i > 0 && <br />}{l}</span>)}
              </h2>
              <div className="divider-refined my-6" />
              {artisanStory.paragraph1 && <p className="font-sans text-sm text-ink-soft/86 leading-relaxed">{artisanStory.paragraph1}</p>}
              {artisanStory.paragraph2 && <p className="font-sans text-sm text-ink-soft/86 leading-relaxed mt-4">{artisanStory.paragraph2}</p>}
              <Link href={artisanStory.buttonLink || "/products"}
                className="inline-flex items-center gap-1.5 mt-8 text-[12px] text-ink-deep tracking-[0.2em] uppercase font-sans font-medium border-b border-ink-deep pb-0.5 hover:text-coral hover:border-coral transition-all duration-300">
                {artisanStory.buttonText || "Meet the Artisans"} <ArrowUpRight size={11} strokeWidth={1.5} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section id="philosophy" className="py-20 md:py-28 bg-ink-deep text-paper-light">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center">
            <span className="font-en italic text-[15px] tracking-[0.01em] text-coral">{philosophySection.eyebrow || "Our Philosophy"}</span>
            <h2 className="font-en text-3xl md:text-5xl text-paper-light font-medium mt-3 leading-tight tracking-[0.005em]">
                {(philosophySection.headline || "Beauty Lives in the\nDetails We Often Overlook").split("\n").map((l: string, i: number) => <span key={i}>{i > 0 && <br />}{l}</span>)}
              </h2>
            <div className="w-10 h-px bg-coral/30 mx-auto my-8" />
            <p className="font-sans text-sm md:text-base text-paper-light/76 leading-relaxed max-w-xl mx-auto">{philosophySection.body || "We believe everyday objects carry cultural memory."}</p>
          </motion.div>
          {(philosophySection.quotes?.length > 0) && (
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto">
              {philosophySection.quotes.map((q: any, i: number) => (
                <motion.div key={i} {...stagger} transition={{ delay: i * 0.1 }} className="text-center">
                  <p className="font-en text-sm md:text-base text-paper-light/79 leading-relaxed italic">&ldquo;{q.quote}&rdquo;</p>
                  <p className="font-sans text-[12px] text-paper-light/62 mt-3">{q.author}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* JOURNAL */}
      <section id="journal" className="py-20 md:py-28 bg-paper-light">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <motion.div {...fadeUp} className="mb-12">
            <span className="font-en italic text-[15px] tracking-[0.01em] text-coral">{journal.eyebrow || "Stories & Essays"}</span>
            <h2 className="font-en text-3xl md:text-5xl text-ink-deep font-medium mt-2 tracking-[0.005em]">{journal.headline || "The Journal"}</h2>
            {journal.body && <p className="font-sans text-sm text-ink-soft/82 mt-3 max-w-lg leading-relaxed">{journal.body}</p>}
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {(journal.entries || []).map((entry: any, i: number) => {
              // 修复 M10: 有链接的文章可点击跳转, 无链接不再显示假 cursor-pointer
              const cardInner = (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden bg-paper mb-4">
                    {entry.image && (
                      <OptimizedImage
                        src={entry.image}
                        alt={entry.title || "Journal entry"}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        objectFit="cover"
                        placeholder="blur"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-ink-soft/66 font-sans tracking-[0.2em] uppercase mb-2">
                    <span>{entry.date}</span>
                    <span className="w-1 h-1 rounded-full bg-coral/30" />
                    <span>{entry.readTime} min</span>
                  </div>
                  <h3 className="font-en text-base text-ink-deep font-semibold group-hover:text-coral transition-colors leading-snug">{entry.title}</h3>
                  <p className="font-sans text-[11px] text-ink-soft/79 mt-2 leading-relaxed line-clamp-2">{entry.excerpt}</p>
                </>
              )
              return (
                <motion.div key={i} {...stagger} transition={{ delay: i * 0.08 }} className={`group ${entry.link ? 'cursor-pointer' : ''}`}>
                  {entry.link ? (
                    <Link href={entry.link} className="block">{cardInner}</Link>
                  ) : cardInner}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 客户评价（真实评价优先；无真实评价且处于开发模式时显示带 SAMPLE 角标的示例数据） */}
      <div className="bg-[#FFFFFF]">
        <HomeReviews reviews={reviews} />
      </div>

      {/* SEASONAL */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-ink-deep">
        <div className="absolute inset-0 opacity-30">
          <OptimizedImage
            src={seasonal.backgroundImage || "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1920&q=80"}
            alt={seasonal.headline || "Seasonal collection"}
            fill
            sizes="100vw"
            objectFit="cover"
            placeholder="blur"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-deep via-ink-deep/60 to-ink-deep/80" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div {...fadeUp}>
            <span className="font-en italic text-[15px] tracking-[0.01em] text-coral">{seasonal.eyebrow || "Seasonal Edition"}</span>
            <h2 className="font-en text-3xl md:text-5xl text-paper-light font-medium mt-3 leading-tight tracking-[0.005em]">{seasonal.headline || "Summer Collection"}</h2>
            {seasonal.body && <p className="font-sans text-sm text-paper-light/76 mt-4 max-w-md mx-auto leading-relaxed">{seasonal.body}</p>}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={seasonal.buttonLink || "/products"}
                className="px-8 py-3.5 bg-coral text-paper-light text-[12px] tracking-[0.2em] uppercase font-sans font-medium hover:bg-coral-dark transition-all duration-300">
                {seasonal.buttonText || "Explore Collection"}
              </Link>
              <Link href={seasonal.secondaryLink || "/contact"}
                className="text-[12px] text-paper-light/86 hover:text-paper-light/86 transition-colors tracking-[0.22em] uppercase font-sans font-medium">
                {seasonal.secondaryText || "Request a Lookbook"}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="py-16 md:py-20 bg-[#FFFFFF] border-b border-paper">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <motion.div {...fadeUp}>
            <span className="font-en italic text-[15px] tracking-[0.01em] text-coral">{newsletter.eyebrow || "Stay Connected"}</span>
            <h3 className="font-en text-2xl md:text-3xl text-ink-deep font-medium mt-2">{newsletter.headline || "Receive Stories from the Studio"}</h3>
            {newsletter.body && <p className="font-sans text-sm text-ink-soft/82 mt-2 leading-relaxed">{newsletter.body}</p>}
            <form onSubmit={handleNewsletterSubmit} className="mt-8 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="Your email address"
                required
                disabled={newsletterStatus === 'loading'}
                className="input-refined flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-6 py-2.5 bg-ink-deep text-paper-light text-[12px] tracking-[0.2em] uppercase font-sans font-medium hover:bg-ink disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {newsletterStatus === 'loading' ? <Loader2 size={12} className="animate-spin" /> : null}
                {newsletter.buttonText || "Subscribe"}
              </button>
            </form>
            {newsletterStatus !== 'idle' && newsletterStatus !== 'loading' && (
              <p className={`font-sans text-[11px] mt-3 ${newsletterStatus === 'success' ? 'text-jade-dark' : 'text-red-500'}`}>
                {newsletterMessage}
              </p>
            )}
            <p className="font-sans text-[11px] text-ink-soft/66 mt-3">{newsletter.disclaimer || "No spam. Unsubscribe anytime."}</p>
          </motion.div>
        </div>
      </section>
    </>
  )
}

function CollectionLookbook({ items, slideshowEnabled, slideshowInterval }: { items: any[]; slideshowEnabled?: boolean; slideshowInterval?: number }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (slideshowEnabled === false || paused || items.length <= 1) return
    timerRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % items.length)
    }, Math.max(3000, slideshowInterval ?? 6000))
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [slideshowEnabled, slideshowInterval, paused, items.length])

  if (items.length === 0) return null
  const current = items[active]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
      {/* Left: large image + glass info card */}
      <div
        className="relative lg:col-span-7 overflow-hidden rounded-xl bg-[#F7F0DE] min-h-[420px] md:min-h-[560px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.slug || active}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {current.image && (
                <OptimizedImage
                  src={current.image}
                  alt={current.title || "Collection"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover"
                  objectFit="cover"
                  placeholder="blur"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-deep/30 via-transparent to-transparent" />
        <span className="absolute top-4 left-4 font-en text-[12px] text-white tracking-[0.25em] bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>

        {/* Glass info card */}
        <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-[360px] rounded-xl bg-[#FFFFFF]/75 backdrop-blur-md border border-white/60 shadow-soft-lg p-5 md:p-6">
          <span className="font-sans text-[11px] text-coral tracking-[0.24em] uppercase">{current.subtitle}</span>
          <h3 className="font-en text-xl md:text-2xl text-ink-deep font-semibold mt-1.5">{current.title}</h3>
          <p className="font-sans text-[11px] text-ink-soft/86 mt-2 leading-relaxed line-clamp-3">{current.description}</p>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F2EBD8]/60">
            <span className="font-sans text-[12px] text-ink-soft/76">{current.productCount ?? 0} items</span>
            {/* 没有 slug 就不渲染链接 —— 此前会兜底成早已废弃的 'cultural-gifts'，点了必然 404 */}
            {current.slug ? (
              <Link href={`/category/${current.slug}`} className="inline-flex items-center gap-1 text-[12px] text-ink-deep tracking-[0.2em] uppercase font-sans font-medium hover:text-coral transition-colors">
                View Collection <ArrowUpRight size={11} strokeWidth={1.5} />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right: category list */}
      <div className="lg:col-span-5 flex flex-col justify-center">
        <div className="divide-y divide-[#F7F0DE] border-y border-[#F7F0DE]">
          {items.map((item, i) => {
            const isActive = i === active
            return (
              <button
                key={item.slug || i}
                type="button"
                onMouseEnter={() => { setActive(i); setPaused(true) }}
                onMouseLeave={() => setPaused(false)}
                onClick={() => setActive(i)}
                className={`group w-full text-left transition-colors duration-300 ${isActive ? 'bg-[#FFFFFF] px-3' : 'px-1 hover:bg-[#FFFFFF]/60'}`}
              >
                <div className="py-4 md:py-5 flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-2.5 min-w-0">
                    <span className={`font-en text-[12px] tracking-widest ${isActive ? 'text-coral' : 'text-ink-soft/86'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h4 className={`font-en text-lg md:text-xl truncate transition-colors ${isActive ? 'text-ink-deep' : 'text-ink-soft group-hover:text-ink-deep'}`}>{item.title}</h4>
                    <span className="font-sans text-[11px] text-ink-soft/76 truncate">{item.subtitle}</span>
                  </div>
                  <ArrowUpRight size={13} strokeWidth={1.5} className={`shrink-0 transition-all duration-300 ${isActive ? 'text-coral' : 'text-ink-soft/62 group-hover:text-coral'}`} />
                </div>
                {isActive && item.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-sans text-[11px] text-ink-soft/82 pb-4 pl-6 leading-relaxed line-clamp-2"
                  >
                    {item.description}
                  </motion.p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

