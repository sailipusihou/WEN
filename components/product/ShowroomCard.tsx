'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { useToast } from '@/context/ToastContext'
import { useWishlist } from '@/context/WishlistContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import type { Product } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useProductPrice } from '@/lib/promotion-client'
import { PromoImageBadge, PromoSaleTag } from '@/components/product/PromoBadge'
import QuickViewModal from '@/components/product/QuickViewModal'

/**
 * 首页「精选商品」卡片。
 *
 * 与列表页 ProductCard 的区别（有意保留）：
 *   · 首页卡片带玻璃信息条（名称/价格压在图片底部），列表页信息在图片下方
 *   · 首页卡片有光标辉光（跟随鼠标的暖色高光），作为「精选」区的氛围
 *
 * 已移除的两个悬停动效（见下方注释）：
 *   · 悬停切换第二张商品图 —— 与新增的两个操作按钮抢同一块视觉，去掉
 *   · 3D 倾斜（rotateX/rotateY）—— 按钮会跟着鼠标晃动，导致点不准
 */
export default function ShowroomCard({ product, index = 0 }: { product: Product; index?: number }) {
  const tiltRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [tilt, setTilt] = useState<Record<string, string>>({})
  const { addItem } = useCart()
  const { currency } = useCurrency()
  const { toggle: toggleWishlist, has: wishlistHas } = useWishlist()
  const { addToast } = useToast()
  const eff = useProductPrice(product)
  // Quick view 弹窗
  const [quickView, setQuickView] = useState(false)

  /**
   * 只保留「光标辉光」的坐标更新，不再做 3D 倾斜。
   * 原因：卡片里新增了两个可点按钮，若整卡跟随鼠标倾斜，按钮位置一直在动，
   *      用户很难点准（实测 hover 后按钮 box 会随 rotate 变化）。
   */
  const handleMove = (e: React.MouseEvent) => {
    const el = tiltRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setTilt({
      '--mx': `${(px * 100).toFixed(1)}%`,
      '--my': `${(py * 100).toFixed(1)}%`,
    })
  }

  const handleLeave = () => {
    const v = videoRef.current
    if (v) { v.pause(); v.currentTime = 0 }
  }

  const handleEnter = () => {
    videoRef.current?.play().catch(() => {})
  }

  // 收藏走共享 context —— 与商品卡、详情页、页头角标共用一份状态
  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const r = await toggleWishlist(product.id)
    if (r.ok) addToast(r.added ? 'Saved to wishlist' : 'Removed from wishlist', 'success')
    else if (r.reason === 'not-logged-in') addToast('Please sign in to save items', 'error')
    else addToast('Could not update wishlist', 'error')
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id, name: product.name,
      nameEn: product.nameEn || product.name,
      image: product.image, price: product.price,
      category: product.category,
    })
    addToast(`${product.nameEn || product.name} added to cart`, 'success')
  }

  /** 打开快速查看弹窗（不跳转页面） */
  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setQuickView(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.08 }}
    >
      <Link href={`/products/${product.id}`} className="block group">
        <div
          ref={tiltRef}
          onMouseMove={handleMove}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          style={tilt as React.CSSProperties}
          className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[#F7F0DE] bg-[#FFFFFF] shadow-soft will-change-transform"
        >
          {/* Cursor glow */}
          <div
            className="pointer-events-none absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background:
                'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(216,184,138,0.20), transparent 45%)',
            }}
          />

          {/*
            ⚠️ 已移除「悬停切换第二张图」这个动效。
            原来这里渲染两张图，hover 时第一张淡出、第二张淡入。
            去掉的原因：这个动效和新增的两个操作按钮占同一块视觉焦点，
            一起出现画面很乱；而且切换图片会让客户以为商品变了。
            现在只渲染一张主图。
          */}
          <OptimizedImage
            src={product.image}
            alt={product.nameEn || product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="absolute inset-0 object-cover"
            objectFit="cover"
            placeholder="blur"
          />
          {product.videoEnabled && product.video && (
            <video
              ref={videoRef}
              src={product.video}
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            />
          )}

          {/* Number */}
          <span className="absolute top-3 left-3 z-10 font-en text-[10px] tracking-[0.25em] text-[#A07C34]">
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* 促销角标: 商品图显示促销价格字样 (序号右侧) */}
          <PromoImageBadge eff={eff} currency={currency} className="top-3 left-10" />

          {/* Wishlist —— 已收藏时实心 + 陶土色 */}
          <button
            onClick={handleToggleWishlist}
            type="button"
            aria-label={wishlistHas(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={wishlistHas(product.id)}
            className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-[#FFFFFF]/85 backdrop-blur-md border border-white/60 text-ink flex items-center justify-center opacity-100 translate-y-0 pointer-events-auto md:opacity-0 md:translate-y-1 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto transition-all duration-300 hover:bg-[#FFFFFF] shadow-soft"
          >
            <Heart
              size={14}
              strokeWidth={1.5}
              style={wishlistHas(product.id) ? { fill: '#A8472E', color: '#A8472E' } : undefined}
            />
          </button>

          {/*
            悬停浮出的两个操作按钮（与列表页 ProductCard 一致的效果）。

            ⚠️ 位置说明：本卡片的玻璃信息条压在图片底部（absolute bottom-0），
            所以按钮要放在信息条**上方**（bottom-16 起），否则会和信息条重叠。
            列表页的 ProductCard 信息在图片外，按钮可以贴底。

            整卡外面套着 <Link>，两个按钮都要 preventDefault + stopPropagation。
          */}
          <div
            data-card-actions="1"
            className="absolute left-3 right-3 z-10 flex flex-col gap-2 transition-all duration-300
                       opacity-100 translate-y-0
                       md:opacity-0 md:translate-y-2 md:pointer-events-none
                       md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto"
            style={{ bottom: '4.75rem' }}
          >
            <button
              onClick={handleQuickView}
              type="button"
              data-quick-view={product.id}
              className="w-full py-2.5 font-sans text-[10px] font-bold tracking-[0.24em] uppercase transition-all duration-200 hover:-translate-y-px shadow-soft"
              style={{ backgroundColor: '#FFFFFF', color: '#2A2118', borderRadius: 4 }}
            >
              Quick view
            </button>
            <button
              onClick={handleAddToCart}
              type="button"
              data-card-add={product.id}
              className="w-full py-2.5 font-sans text-[10px] font-bold tracking-[0.24em] uppercase transition-all duration-200 hover:-translate-y-px flex items-center justify-center gap-2 shadow-soft"
              style={{ backgroundColor: '#4C5546', color: '#FFFFFF', borderRadius: 4 }}
            >
              <ShoppingBag size={12} strokeWidth={2} /> Add to cart
            </button>
          </div>

          {/* Glass info bar */}
          <div className="absolute bottom-0 inset-x-0 z-10 flex items-end justify-between gap-3 px-4 py-3 bg-[#FFFFFF]/85 backdrop-blur-md border-t border-[#F2EBD8]">
            <div className="min-w-0">
              <h3 className="font-en text-sm md:text-base text-[#2A2118] font-medium truncate">
                {product.nameEn || product.name}
              </h3>
              <p className="font-sans text-[10px] text-[#5A4A36]/60 truncate mt-0.5">
                {product.subtitleEn || product.subtitle}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {/* 促销价重点标注: 强调色 + SALE 标签 */}
              <span className={`font-en text-sm block ${eff.discount > 0 ? 'text-[#A83420] font-semibold' : 'text-[#A07C34]'}`}>
                {formatPrice(convertPrice(eff.price, currency), currency)}
                {eff.discount > 0 && <PromoSaleTag />}
              </span>
              {eff.originalPrice && (
                <span className="font-sans text-[11px] text-[#5A4A36]/70 line-through block">
                  {formatPrice(convertPrice(eff.originalPrice, currency), currency)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Quick view 弹窗：只在打开时挂载 */}
      {quickView && (
        <QuickViewModal product={product} onClose={() => setQuickView(false)} />
      )}
    </motion.div>
  )
}

export function ShowroomGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {products.map((product, i) => (
        <ShowroomCard key={product.id} product={product} index={i} />
      ))}
    </div>
  )
}
