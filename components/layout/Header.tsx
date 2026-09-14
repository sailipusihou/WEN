'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, Search, User, MessageCircle, Heart, ChevronDown } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import SearchBox from '@/components/ui/SearchBox'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { fetchCategories } from '@/lib/use-categories'
import type { Category } from '@/lib/products'

// 修复：此前 6 个入口是写死的旧分类（cultural-gifts / home-decor / creative-gifts），
// 点进去一律 "Collection not found"。现在改为读取后台真实分类，
// 下面这份仅作为接口未就绪时的兜底占位。
const FALLBACK_COLLECTIONS = [
  { label: 'Tea Ceremony', href: '/category/tea-ceremony', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80', desc: 'Celadon, Yixing ware, and the art of tea' },
  { label: 'Ceramic Living', href: '/category/ceramic-art', image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&q=80', desc: 'Hand-thrown vessels for daily rituals' },
  { label: 'Silk & Embroidery', href: '/products', image: 'https://images.unsplash.com/photo-1607532941432-5e0d3cba768b?w=400&q=80', desc: 'Suzhou double-sided embroidery' },
  { label: 'Bamboo Craft', href: '/products', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&q=80', desc: 'Sustainable bamboo weaving' },
  { label: 'Natural Incense', href: '/category/incense-rituals', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80', desc: 'Agarwood, sandalwood, ritual scents' },
  { label: "Scholar's Desk", href: '/products', image: 'https://images.unsplash.com/photo-1496096265110-f83ad7f96608?w=400&q=80', desc: 'Brush pots, ink stones, writing sets' },
]

const CATEGORY_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80',
  'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&q=80',
  'https://images.unsplash.com/photo-1607532941432-5e0d3cba768b?w=400&q=80',
  'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&q=80',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80',
  'https://images.unsplash.com/photo-1496096265110-f83ad7f96608?w=400&q=80',
]

// 分类数量可变，列数跟着分类数走（静态写全，Tailwind 才能扫到）
const MEGA_COLS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
}

const navItems = [
  { label: 'Collections', href: '/products', hasMega: true },
  { label: 'Journal', href: '/#journal' },
  { label: 'About', href: '/#philosophy' },
  { label: 'Contact', href: '/contact' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [unreadReplies, setUnreadReplies] = useState(0)
  const [megaOpen, setMegaOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [siteSettings, setSiteSettings] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const megaRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLButtonElement>(null)

  // 分类导航由后台真实分类驱动（在后台新增分类，这里自动出现）
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
  }, [])

  const collections = categories.length > 0
    ? categories.map((c, i) => ({
        label: c.nameEn || c.name,
        href: `/category/${c.slug}`,
        image: c.image || CATEGORY_FALLBACK_IMAGES[i % CATEGORY_FALLBACK_IMAGES.length],
        desc: c.descriptionEn || c.description || '',
      }))
    : FALLBACK_COLLECTIONS

  useEffect(() => {
    fetch('/api/settings').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setSiteSettings(d)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("otm_user")
    if (stored) { setLoggedIn(true) }
    else {
      // user_token 是 httpOnly cookie，document.cookie 读不到；
      // 只能由服务端 /api/auth/user 判定（200 = 已登录）。
      fetch('/api/auth/user').then(r => setLoggedIn(r.ok)).catch(() => setLoggedIn(false))
    }
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    const check = () => {
      const email = localStorage.getItem("otm_chat_email")
      if (!email) return
      fetch("/api/messages?email=" + encodeURIComponent(email))
        .then(r => r.ok ? r.json() : [])
        .then(d => {
          const arr = Array.isArray(d) ? d : []
          setUnreadReplies(arr.filter((m: any) => m.adminReply && !m.replyRead).length)
        }).catch(() => {})
    }
    check()
    const iv = setInterval(check, 30000)
    return () => clearInterval(iv)
  }, [loggedIn])

  const { totalItems } = useCart()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node) &&
          navRef.current && !navRef.current.contains(e.target as Node)) {
        setMegaOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // On the homepage the hero fills the full screen behind a transparent
  // header, so text flips to white until the user scrolls (glass appears).
  const pathname = usePathname()
  const overlayTop = pathname === '/' && !scrolled
  const navText = overlayTop ? 'text-white/90 hover:text-white' : 'text-[#403A31] hover:text-[#5F7D72]'
  const navChip = overlayTop
    ? 'hover:bg-black/25 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
    : 'hover:bg-[#FFFCF7]/45 hover:backdrop-blur-md hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
  const iconText = overlayTop ? 'text-white/85 hover:text-white' : 'text-[#57503F] hover:text-[#221E1A]'
  const iconChip = overlayTop ? 'hover:bg-black/25 hover:backdrop-blur-md' : 'hover:bg-[#FFFCF7]/45 hover:backdrop-blur-md'

  return (
    <>
      <header className={`sticky top-0 z-50 ${scrolled ? 'glass-header--scrolled' : 'glass-header'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo - refined symbol */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="h-9 md:h-11 w-9 md:w-11 rounded-full bg-[#EDE3D2]/95 shadow-soft overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={siteSettings?.siteLogo || "/images/low-flame-logo.png"}
                  alt="Low Flame"
                  className="h-[72%] w-auto object-contain"
                />
              </div>
              <div className={`flex flex-col leading-tight border-l pl-2.5 ${overlayTop ? 'border-white/30' : 'border-[#D8C9AE]'}`}>
                <span className={`font-en text-sm md:text-base tracking-[0.12em] font-semibold group-hover:text-[#5F7D72] transition-colors duration-300 ${overlayTop ? 'text-white' : 'text-[#221E1A]'}`}>
                  {siteSettings?.siteName ? siteSettings.siteName.toUpperCase() : "LOW FLAME"}
                </span>
                {siteSettings?.siteTagline && (
                  <span className={`font-sans text-[11px] tracking-wider ${overlayTop ? 'text-white/80' : 'text-[#57503F]/80'}`}>
                    {siteSettings.siteTagline}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-7">
              {navItems.map((item) => (
                <div key={item.href} className="relative">
                  {item.hasMega ? (
                    <button
                      ref={navRef}
                      onMouseEnter={() => setMegaOpen(true)}
                      onClick={() => setMegaOpen(!megaOpen)}
                      aria-expanded={megaOpen}
                      aria-haspopup="true"
                      className={`flex items-center gap-1 rounded-full border border-transparent px-3 py-2 text-[10px] tracking-[0.12em] uppercase font-sans font-medium transition-all duration-300 ${navText} ${navChip} ${megaOpen ? (overlayTop ? 'bg-black/25 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' : 'bg-[#FFFCF7]/45 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]') : ''}`}
                    >
                      {item.label}
                      <ChevronDown size={10} strokeWidth={1.5} className={`transition-transform duration-300 ${megaOpen ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <Link href={item.href}
                      className={`rounded-full border border-transparent px-3 py-2 text-[10px] tracking-[0.12em] uppercase font-sans font-medium transition-all duration-300 ${navText} ${navChip}`}>
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-2 rounded-full transition-all duration-300 ${iconText} ${iconChip}`}
                aria-label="Search"
              >
                <Search size={15} strokeWidth={1.5} />
              </button>
              <Link href={loggedIn ? "/account/wishlist" : "/login"} className={`p-2 rounded-full transition-all duration-300 ${iconText} ${iconChip}`} aria-label="Wishlist">
                <Heart size={15} strokeWidth={1.5} />
              </Link>
              <Link href={loggedIn ? "/account" : "/login"} className={`p-2 rounded-full transition-all duration-300 ${iconText} ${iconChip}`} aria-label="Account">
                <User size={15} strokeWidth={1.5} />
              </Link>
              <Link href="/messages" className={`p-2 rounded-full transition-all duration-300 relative ${iconText} ${iconChip}`} aria-label="Messages">
                <MessageCircle size={15} strokeWidth={1.5} />
                {unreadReplies > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#5F7D72] text-white text-[10px] font-sans font-bold rounded-full flex items-center justify-center">
                    {unreadReplies > 9 ? '9+' : unreadReplies}
                  </span>
                )}
              </Link>
              <Link href="/cart" className={`p-2 rounded-full transition-all duration-300 relative ${iconText} ${iconChip}`} aria-label="Cart">
                <ShoppingBag size={15} strokeWidth={1.5} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#221E1A] text-white text-[10px] font-sans font-bold rounded-full flex items-center justify-center">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>
              <Link href="/products" className={`ml-2 rounded-full px-4 py-2 text-[10px] tracking-[0.12em] uppercase font-sans font-medium border transition-all duration-300 ${overlayTop ? 'border-white/50 text-white hover:bg-black/25 hover:backdrop-blur-md hover:border-white/70' : 'border-[#D8C9AE] text-[#221E1A] hover:bg-[#FFFCF7]/45 hover:backdrop-blur-md hover:border-[#5F7D72] hover:text-[#5F7D72]'}`}>
                Explore
              </Link>
            </div>

            {/* Mobile Toggle */}
            <button className={`md:hidden p-2 ${overlayTop ? 'text-white' : 'text-[#221E1A]'}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

      {/* Search Dropdown */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 z-[60] glass-surface"
          >
            <div className="max-w-3xl mx-auto px-4 py-4">
              <SearchBox onClose={() => setSearchOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mega Menu */}
      <AnimatePresence>
        {megaOpen && (
          <motion.div
            ref={megaRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onMouseLeave={() => setMegaOpen(false)}
            className="absolute top-full left-0 right-0 z-[60] glass-surface"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="flex items-center gap-2 mb-8">
                <span className="text-[#5F7D72] text-[10px]">◈</span>
                <h3 className="font-sans text-[11px] text-[#57503F] tracking-[0.15em] uppercase font-medium">Curated Collections</h3>
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${MEGA_COLS[Math.min(Math.max(collections.length, 2), 6)]}`}>
                {collections.map((col) => (
                  <Link key={col.label} href={col.href} onClick={() => setMegaOpen(false)} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#E2D5C0] mb-3">
                      <OptimizedImage
                        src={col.image}
                        alt={col.label}
                        fill
                        sizes="(max-width: 768px) 50vw, 16vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        objectFit="cover"
                        placeholder="blur"
                      />
                    </div>
                    <h4 className="font-sans text-[10px] font-medium text-[#221E1A] tracking-wider uppercase group-hover:text-[#5F7D72] transition-colors">{col.label}</h4>
                    <p className="font-sans text-[11px] text-[#57503F]/72 mt-0.5">{col.desc}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-8 pt-5 border-t border-[#D8C9AE]/40 flex items-center justify-between">
                <Link href="/products" onClick={() => setMegaOpen(false)}
                  className="text-[10px] text-[#57503F] hover:text-[#5F7D72] transition-colors tracking-[0.12em] uppercase font-sans font-medium">
                  View All Objects →
                </Link>
                <Link href="/#journal" onClick={() => setMegaOpen(false)}
                  className="text-[10px] text-[#57503F] hover:text-[#5F7D72] transition-colors tracking-[0.12em] uppercase font-sans font-medium">
                  Read the Journal →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-[70] bg-[#221E1A]/40 backdrop-blur-[2px] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer - right-side glass sidebar for small screens */}
      <AnimatePresence>
        {menuOpen && (
          <motion.aside
            key="mobile-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            aria-label="Mobile navigation"
            className="fixed top-0 right-0 bottom-0 z-[80] w-[85%] max-w-sm md:hidden glass-drawer overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#D8C9AE]/40 shrink-0">
              <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-full bg-[#EDE3D2] shadow-soft overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src={siteSettings?.siteLogo || "/images/low-flame-logo.png"}
                    alt="Low Flame"
                    className="h-[70%] w-auto object-contain"
                  />
                </div>
                <span className="font-en text-xs md:text-sm tracking-[0.12em] text-[#221E1A] font-semibold group-hover:text-[#5F7D72] transition-colors">
                  {siteSettings?.siteName ? siteSettings.siteName.toUpperCase() : "LOW FLAME"}
                </span>
              </Link>
              <button className="p-2 text-[#221E1A]" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex flex-col px-4 py-4 gap-0.5">
              <p className="font-sans text-[11px] text-[#5F7D72] tracking-[0.15em] uppercase px-4 pt-2 pb-1 font-medium">Collections</p>
              {collections.map((col) => (
                <Link key={col.label} href={col.href}
                  className="font-sans text-sm text-[#403A31] py-2.5 px-4 hover:bg-[#E2D5C0]/30 transition-colors flex items-center justify-between"
                  onClick={() => setMenuOpen(false)}>
                  <span>{col.label}</span>
                  <span className="text-[11px] text-[#57503F]/65">→</span>
                </Link>
              ))}
              <div className="divider-refined my-3" />
              {navItems.filter(n => !n.hasMega).map((item) => (
                <Link key={item.href} href={item.href}
                  className="font-sans text-sm text-[#403A31] py-2.5 px-4 hover:bg-[#E2D5C0]/30 transition-colors"
                  onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <div className="flex items-center gap-2 px-4 pt-4 border-t border-[#D8C9AE]/30 mt-3">
                <Link href="/search" className="flex-1 text-center py-3 border border-[#221E1A] text-[#221E1A] text-[10px] tracking-[0.12em] uppercase font-sans" onClick={() => setMenuOpen(false)}>Search</Link>
                <Link href="/cart" className="flex-1 text-center py-3 bg-[#221E1A] text-white text-[10px] tracking-[0.12em] uppercase font-sans flex items-center justify-center gap-1" onClick={() => setMenuOpen(false)}>
                  Cart {totalItems > 0 && `(${totalItems})`}
                </Link>
              </div>
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
