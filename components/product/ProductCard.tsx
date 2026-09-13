'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, Heart, Star } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { useToast } from '@/context/ToastContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import type { Product } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useProductPrice } from '@/lib/promotion-client'
import { PromoImageBadge, PromoSaleTag, promoPriceClass } from '@/components/product/PromoBadge'
import { useCategories } from '@/lib/use-categories'

interface ProductCardProps { product: Product; index?: number }

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem } = useCart()
  const { currency } = useCurrency()
  const { addToast } = useToast()
  const eff = useProductPrice(product)
  const { labelFor } = useCategories()
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleVideoEnter = () => {
    videoRef.current?.play().catch(() => {})
  }
  const handleVideoLeave = () => {
    const v = videoRef.current
    if (v) { v.pause(); v.currentTime = 0 }
  }

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      if (res.ok) {
        addToast('Saved to wishlist', 'success')
      } else if (res.status === 401) {
        addToast('Please sign in to save items', 'error')
      } else {
        addToast('Could not save to wishlist', 'error')
      }
    } catch {
      addToast('Connection error', 'error')
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
        {/* 4:5 Image with hover reveal —— 暖色底衬托商品图 */}
        <div className="relative aspect-[4/5] overflow-hidden bg-[#F2EAE0]">
          <OptimizedImage
            src={product.image}
            alt={product.nameEn || product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0"
            objectFit="cover"
            placeholder="blur"
          />
          <OptimizedImage
            src={hoverImage}
            alt={product.nameEn || product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100"
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
            <span className="font-sans text-[8px] text-white/70 bg-black/15 backdrop-blur-sm px-2 py-0.5 tracking-[0.1em] uppercase rounded-sm">
              {labelFor(product.category)}
            </span>
          </div>
          {/* Wishlist */}
          <button
            onClick={handleToggleWishlist}
            type="button"
            className="absolute top-3 right-3 w-9 h-9 bg-white/85 hover:bg-white text-[#2D2F33] flex items-center justify-center transition-all duration-300 translate-y-0 opacity-100 pointer-events-auto md:translate-y-1 md:opacity-0 md:pointer-events-none md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-hover:pointer-events-auto shadow-soft z-10"
            aria-label="Add to wishlist"
          >
            <Heart size={15} strokeWidth={1.5} />
          </button>
          {/* 促销角标: 商品图左下角显示促销价格字样 */}
          <PromoImageBadge eff={eff} currency={currency} />
          {/* Quick add */}
          <button
            onClick={handleAddToCart}
            type="button"
            className="absolute bottom-3 right-3 w-9 h-9 bg-white/85 hover:bg-white text-[#2D2F33] flex items-center justify-center transition-all duration-300 translate-y-0 opacity-100 pointer-events-auto md:translate-y-1 md:opacity-0 md:pointer-events-none md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-hover:pointer-events-auto shadow-soft z-10"
            aria-label="Add to cart"
          >
            <Plus size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Info */}
        <div className="mt-3 md:mt-4 space-y-1">
          <p className="font-sans text-[8px] text-[#8BA8A0]/50 tracking-[0.12em] uppercase">
            {labelFor(product.category)}
          </p>
          <h3 className="font-en text-sm md:text-base text-[#2D2F33] font-medium leading-tight group-hover:text-[#8BA8A0] transition-colors duration-300">
            {product.nameEn || product.name}
          </h3>
          <p className="font-sans text-[11px] text-[#6B6F75]/45 leading-relaxed line-clamp-1">{product.subtitleEn || product.subtitle}</p>
          {/* 评分/评论数: 有真实评价才显示 (列表页决策依据) */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1 pt-0.5">
              <Star size={10} className="fill-[#B8A06C] text-[#B8A06C]" />
              <span className="font-sans text-[10px] text-[#6B6F75]/60">{product.rating}</span>
              <span className="font-sans text-[10px] text-[#6B6F75]/35">({product.reviewCount})</span>
            </div>
          )}
          <div className="flex items-baseline gap-2 pt-0.5">
            {/* 促销价重点标注: 强调色 + SALE 标签 */}
            <span className={`font-en text-sm font-medium ${eff.discount > 0 ? 'text-[#B8452E] font-semibold' : 'text-[#2D2F33]'}`}>{formatPrice(convertPrice(eff.price, currency), currency)}</span>
            {eff.discount > 0 && <PromoSaleTag />}
            {(eff.originalPrice || product.originalPrice) && (
              <span className="font-sans text-[10px] text-[#6B6F75]/35 line-through">{formatPrice(convertPrice(eff.originalPrice || product.originalPrice || 0, currency), currency)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
