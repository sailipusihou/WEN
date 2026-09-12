'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { useToast } from '@/context/ToastContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import type { Product } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { useProductPrice } from '@/lib/promotion-client'
import { PromoImageBadge, PromoSaleTag } from '@/components/product/PromoBadge'

export default function ShowroomCard({ product, index = 0 }: { product: Product; index?: number }) {
  const tiltRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [tilt, setTilt] = useState<Record<string, string>>({})
  const { addItem } = useCart()
  const { currency } = useCurrency()
  const { addToast } = useToast()
  const eff = useProductPrice(product)

  const handleMove = (e: React.MouseEvent) => {
    const el = tiltRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const rx = (0.5 - py) * 10
    const ry = (px - 0.5) * 12
    setTilt({
      transform: `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`,
      transition: 'transform 0.12s ease-out',
      '--mx': `${(px * 100).toFixed(1)}%`,
      '--my': `${(py * 100).toFixed(1)}%`,
    })
  }

  const handleLeave = () => {
    setTilt({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)',
      transition: 'transform 0.5s ease',
    })
    const v = videoRef.current
    if (v) { v.pause(); v.currentTime = 0 }
  }

  const handleEnter = () => {
    videoRef.current?.play().catch(() => {})
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
      if (res.ok) addToast('Saved to wishlist', 'success')
      else if (res.status === 401) addToast('Please sign in to save items', 'error')
      else addToast('Could not save to wishlist', 'error')
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
          className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[#EDE8E0] bg-white shadow-soft will-change-transform"
        >
          {/* Cursor glow */}
          <div
            className="pointer-events-none absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background:
                'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(216,184,138,0.20), transparent 45%)',
            }}
          />

          {/* Base image + hover second image */}
          <OptimizedImage
            src={product.image}
            alt={product.nameEn || product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0 object-cover"
            objectFit="cover"
            placeholder="blur"
          />
          <OptimizedImage
            src={hoverImage}
            alt={product.nameEn || product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 object-cover"
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
          <span className="absolute top-3 left-3 z-10 font-en text-[10px] tracking-[0.25em] text-[#A0885A]">
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* 促销角标: 商品图显示促销价格字样 (序号右侧) */}
          <PromoImageBadge eff={eff} currency={currency} className="top-3 left-10" />

          {/* Wishlist */}
          <button
            onClick={handleToggleWishlist}
            type="button"
            aria-label="Add to wishlist"
            className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-white/85 backdrop-blur-md border border-white/60 text-ink flex items-center justify-center opacity-100 translate-y-0 pointer-events-auto md:opacity-0 md:translate-y-1 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto transition-all duration-300 hover:bg-white shadow-soft"
          >
            <Heart size={14} strokeWidth={1.5} />
          </button>

          {/* Quick add */}
          <button
            onClick={handleAddToCart}
            type="button"
            aria-label="Add to cart"
            className="absolute bottom-16 right-2.5 z-10 w-9 h-9 rounded-full bg-white/85 backdrop-blur-md border border-white/60 text-ink flex items-center justify-center opacity-100 translate-y-0 pointer-events-auto md:opacity-0 md:translate-y-1 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto transition-all duration-300 hover:bg-white shadow-soft"
          >
            <Plus size={15} strokeWidth={1.5} />
          </button>

          {/* Glass info bar */}
          <div className="absolute bottom-0 inset-x-0 z-10 flex items-end justify-between gap-3 px-4 py-3 bg-white/85 backdrop-blur-md border-t border-[#E5DFD5]">
            <div className="min-w-0">
              <h3 className="font-en text-sm md:text-base text-[#2D2F33] font-medium truncate">
                {product.nameEn || product.name}
              </h3>
              <p className="font-sans text-[10px] text-[#6B6F75]/60 truncate mt-0.5">
                {product.subtitleEn || product.subtitle}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {/* 促销价重点标注: 强调色 + SALE 标签 */}
              <span className={`font-en text-sm block ${eff.discount > 0 ? 'text-[#B8452E] font-semibold' : 'text-[#A0885A]'}`}>
                {formatPrice(convertPrice(eff.price, currency), currency)}
                {eff.discount > 0 && <PromoSaleTag />}
              </span>
              {eff.originalPrice && (
                <span className="font-sans text-[9px] text-[#6B6F75]/45 line-through block">
                  {formatPrice(convertPrice(eff.originalPrice, currency), currency)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
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
