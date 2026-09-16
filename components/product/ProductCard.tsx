'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, Heart, Star, Eye, ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { useToast } from '@/context/ToastContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import type { Product } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useProductPrice } from '@/lib/promotion-client'
import { PromoImageBadge, PromoSaleTag, promoPriceClass } from '@/components/product/PromoBadge'
import { useCategories } from '@/lib/use-categories'
import { useWishlist } from '@/context/WishlistContext'
import QuickViewModal from '@/components/product/QuickViewModal'

interface ProductCardProps { product: Product; index?: number }

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem } = useCart()
  const { currency } = useCurrency()
  const { addToast } = useToast()
  const eff = useProductPrice(product)
  const { labelFor } = useCategories()
  const { toggle: toggleWishlist, has: isWishlisted } = useWishlist()
  const videoRef = useRef<HTMLVideoElement>(null)
  // Quick view 弹窗开关（点卡片上的「Quick view」打开，不跳转页面）
  const [quickView, setQuickView] = useState(false)

  const handleVideoEnter = () => {
    videoRef.current?.play().catch(() => {})
  }
  const handleVideoLeave = () => {
    const v = videoRef.current
    if (v) { v.pause(); v.currentTime = 0 }
  }

  // 收藏走共享 context，不再自己裸调接口 —— 否则页头角标和详情页的心形
  // 都不会跟着这张卡片变（此前就是各发各的请求，状态互不相通）。
  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const r = await toggleWishlist(product.id)
    if (r.ok) {
      addToast(r.added ? 'Saved to wishlist' : 'Removed from wishlist', 'success')
    } else if (r.reason === 'not-logged-in') {
      addToast('Please sign in to save items', 'error')
    } else {
      addToast('Could not update wishlist', 'error')
    }
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

  /**
   * 打开快速查看弹窗。不跳转页面，直接在卡片上弹出缩略图 + 可加购/可支付。
   * 和加购按钮一样要阻止冒泡，否则会触发外层 <Link> 跳到详情页。
   */
  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setQuickView(true)
  }

  const hoverImage = product.detailImages?.[0] || product.image

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Link href={`/products/${product.id}`} className="block group" onMouseEnter={handleVideoEnter} onMouseLeave={handleVideoLeave}>
        {/* 4:5 Image —— 只渲染主图。
            ⚠️ 已移除「悬停切换第二张图」动效：它和新增的两个操作按钮抢同一块视觉焦点，
            一起出现画面很乱，而且切图会让客户以为商品变了。 */}
        <div className="relative aspect-[4/5] overflow-hidden bg-[#F8F2E2]">
          <OptimizedImage
            src={product.image}
            alt={product.nameEn || product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="absolute inset-0"
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
          {/* Collection tag */}
          <div className="absolute top-3 left-3">
            <span className="font-sans text-[8px] text-white/70 bg-black/15 backdrop-blur-sm px-2 py-0.5 tracking-[0.2em] uppercase rounded-sm">
              {labelFor(product.category)}
            </span>
          </div>
          {/* Wishlist —— 已收藏时实心 + 陶土色，未收藏是描边 */}
          <button
            onClick={handleToggleWishlist}
            type="button"
            className="absolute top-3 right-3 w-9 h-9 bg-[#FFFFFF]/85 hover:bg-[#FFFFFF] text-[#2A2118] flex items-center justify-center transition-all duration-300 translate-y-0 opacity-100 pointer-events-auto md:translate-y-1 md:opacity-0 md:pointer-events-none md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-hover:pointer-events-auto shadow-soft z-10"
            aria-label={isWishlisted(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted(product.id)}
          >
            <Heart
              size={15}
              strokeWidth={1.5}
              style={isWishlisted(product.id) ? { fill: '#A8472E', color: '#A8472E' } : undefined}
            />
          </button>
          {/* 促销角标: 商品图左下角显示促销价格字样 */}
          <PromoImageBadge eff={eff} currency={currency} />

          {/*
            悬停浮出的两个操作按钮 —— 对齐参考站：
              上面「Quick view」白底深字（打开快速查看弹窗，不跳页面）
              下面「Add to cart」深墨绿底白字（直接加购）
            桌面端悬停出现；移动端（没有 hover）常驻显示，否则手机上根本点不到。
            整张卡片外面套着 <Link>，所以两个按钮都要 preventDefault + stopPropagation，
            否则会连带触发跳转。
          */}
          <div
            data-card-actions="1"
            className="absolute left-3 right-3 bottom-3 flex flex-col gap-2 transition-all duration-300
                       opacity-100 translate-y-0
                       md:opacity-0 md:translate-y-2 md:pointer-events-none
                       md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto"
          >
            <button
              onClick={handleQuickView}
              type="button"
              data-quick-view={product.id}
              className="w-full py-3 font-sans text-[11px] font-bold tracking-[0.24em] uppercase transition-all duration-200 hover:-translate-y-px"
              style={{ backgroundColor: '#FFFFFF', color: '#2A2118', borderRadius: 4 }}
            >
              Quick view
            </button>
            <button
              onClick={handleAddToCart}
              type="button"
              data-card-add={product.id}
              className="w-full py-3 font-sans text-[11px] font-bold tracking-[0.24em] uppercase transition-all duration-200 hover:-translate-y-px flex items-center justify-center gap-2"
              style={{ backgroundColor: '#4C5546', color: '#FFFFFF', borderRadius: 4 }}
            >
              <ShoppingBag size={13} strokeWidth={2} /> Add to cart
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-3 md:mt-4 space-y-1">
          <p className="font-sans text-[8px] text-[#5F7D72]/50 tracking-[0.22em] uppercase">
            {labelFor(product.category)}
          </p>
          <h3 className="font-en text-sm md:text-base text-[#2A2118] font-medium leading-tight group-hover:text-[#5F7D72] transition-colors duration-300">
            {product.nameEn || product.name}
          </h3>
          <p className="font-sans text-[11px] text-[#5A4A36]/45 leading-relaxed line-clamp-1">{product.subtitleEn || product.subtitle}</p>
          {/* 评分/评论数: 有真实评价才显示 (列表页决策依据) */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1 pt-0.5">
              <Star size={10} className="fill-[#A07C34] text-[#A07C34]" />
              <span className="font-sans text-[10px] text-[#5A4A36]/60">{product.rating}</span>
              <span className="font-sans text-[10px] text-[#5A4A36]/35">({product.reviewCount})</span>
            </div>
          )}
          <div className="flex items-baseline gap-2 pt-0.5">
            {/* 促销价重点标注: 强调色 + SALE 标签 */}
            <span className={`font-en text-sm font-medium ${eff.discount > 0 ? 'text-[#A83420] font-semibold' : 'text-[#2A2118]'}`}>{formatPrice(convertPrice(eff.price, currency), currency)}</span>
            {eff.discount > 0 && <PromoSaleTag />}
            {(eff.originalPrice || product.originalPrice) && (
              <span className="font-sans text-[12px] text-[#5A4A36]/60 line-through">{formatPrice(convertPrice(eff.originalPrice || product.originalPrice || 0, currency), currency)}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Quick view 弹窗：只在打开时挂载，所以不会给列表增加额外 DOM 开销 */}
      {quickView && (
        <QuickViewModal product={product} onClose={() => setQuickView(false)} />
      )}
    </motion.div>
  )
}
