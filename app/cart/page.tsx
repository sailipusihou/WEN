'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, ArrowRight, Check, Gift } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import OptimizedImage from '@/components/ui/OptimizedImage'
import ProductCard from '@/components/product/ProductCard'
import type { Product } from '@/lib/products'
import { useActivePromotions } from '@/lib/promotion-client'
import { computePromotionForProduct } from '@/lib/promotion-shared'
import OrderSummaryLines from '@/components/cart/OrderSummaryLines'
import ShopWithConfidence from '@/components/cart/ShopWithConfidence'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart()
  const { currency } = useCurrency()
  // 信任区用的真实评价数据（服务端聚合，不编造）
  const [reviewStats, setReviewStats] = useState<{ count: number; rating: number }>({ count: 0, rating: 0 })

  useEffect(() => {
    let cancelled = false
    fetch('/api/products/review-stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setReviewStats({ count: d.count || 0, rating: d.rating || 0 }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // 修复 C5: 购物车存基础价, 此处按当前促销统一计算一次 (与结算页/服务端一致, 避免双重折扣)
  const promotions = useActivePromotions()
  const discountedItems = items.map(item => {
    const eff = computePromotionForProduct({ id: item.id, category: item.category || '', price: item.price }, promotions)
    return { ...item, price: eff.price }
  })
  const subtotal = Math.round(discountedItems.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100

  // 修复 L11: 运费与结算页一致, 走 /api/shipping 分区计费 (原硬编码 3000/250 与结算页口径不同)
  const [shippingCost, setShippingCost] = useState(250)
  // 免邮门槛必须取「该国家所属分区」的值 —— 真正决定免邮的是 zone.freeThreshold
  // (lib/settings.ts calculateShipping: subtotal >= zone.freeThreshold ? 0 : zone.baseCost),
  // 而不是全局 shippingFreeThreshold。两者对美加恰好相同(416.67), 但欧洲是 555.56、
  // 亚太 486.11、其他 694.44 —— 用全局值会对这些地区的客户承诺出并不存在的免邮。
  const [freeThreshold, setFreeThreshold] = useState(416.67)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/shipping?country=United%20States&subtotal=${subtotal}`)
      .then(r => r.ok ? r.json() : { cost: 250, zone: null })
      .then(d => {
        if (cancelled) return
        setShippingCost(Number(d.cost) || 250)
        const t = Number(d.zone?.freeThreshold)
        if (t > 0) setFreeThreshold(t)
      })
      .catch(() => { if (!cancelled) setShippingCost(250) })
    return () => { cancelled = true }
  }, [subtotal])

  const shipping = shippingCost
  const shippingConverted = convertPrice(shipping, currency)
  const subtotalConverted = convertPrice(subtotal, currency)
  const totalConverted = subtotalConverted + shippingConverted

  // 底部商品推荐（与详情页同款逻辑）：排除已在购物车里的商品
  const [related, setRelated] = useState<Product[]>([])
  useEffect(() => {
    let alive = true
    fetch('/api/products?activeOnly=true')
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then(d => {
        if (!alive) return
        const all: Product[] = Array.isArray(d) ? d : (d.items || [])
        const inCart = new Set(items.map(i => i.id))
        const pool = all.filter(p => !inCart.has(p.id))
        const featured = [...pool].sort((a, b) => Number(b.featured) - Number(a.featured))
        setRelated(featured.slice(0, 4))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [items])

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FBFAF7]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#EFE7D4]/50 flex items-center justify-center">
            <ShoppingBag size={32} strokeWidth={1} className="text-[#5A4A36]/30" />
          </div>
          <h1 className="font-en text-2xl md:text-3xl text-[#2A2118] font-medium tracking-[0.005em] mb-2">Your cart is empty</h1>
          <p className="font-sans text-sm text-[#5A4A36]/60 mb-8">Discover our collection of handcrafted objects.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-[#2A2118] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors">
            <ArrowLeft size={14} strokeWidth={1.5} /> Browse Collection
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#FBFAF7] min-h-screen">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-en text-3xl md:text-4xl text-[#2A2118] font-medium tracking-[0.005em]">Cart</h1>
            <p className="font-sans text-sm text-[#5A4A36]/60 mt-1">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</p>
          </div>
          <button onClick={clearCart} className="font-sans text-[10px] text-[#5A4A36]/40 hover:text-[#2A2118] transition-colors tracking-[0.18em] uppercase">
            Clear
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            {discountedItems.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-[#FFFFFF]/80 border border-[#EFE7D4]/50 p-4 md:p-6 flex gap-4 md:gap-6">
                <Link href={`/products/${item.id}`} className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#EFE7D4]/30 overflow-hidden relative">
                  <OptimizedImage src={item.image} alt={item.nameEn || item.name} fill sizes="(max-width: 768px) 80px, 96px" objectFit="cover" placeholder="blur" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/products/${item.id}`} className="font-en text-sm md:text-base text-[#2A2118] hover:text-[#8A6A2E] transition-colors font-medium">
                        {item.nameEn || item.name}
                      </Link>
                      {/* 赠品行：明确标出来，避免客户以为被多收了钱 */}
                      {item.isGift && (
                        <span
                          className="inline-flex items-center gap-1 ml-2 align-middle px-2 py-0.5 font-sans text-[9px] font-bold tracking-[0.16em] uppercase"
                          style={{ backgroundColor: '#FBF3DF', border: '1px solid #EBD9AE', color: '#8A6A2E', borderRadius: 2 }}
                        >
                          <Gift size={9} strokeWidth={2.2} /> Free gift
                        </span>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-1 text-[#5A4A36]/30 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    {item.isGift ? (
                      <span className="font-sans text-[11px] tracking-[0.14em] uppercase" style={{ color: '#4A665D' }}>
                        Included with your order
                      </span>
                    ) : (
                      <div className="flex items-center border border-[#EFE7D4]">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-[#5A4A36]/50 hover:text-[#2A2118] transition-colors">
                          <Minus size={12} strokeWidth={1.5} />
                        </button>
                        <span className="w-8 text-center font-sans text-sm text-[#2A2118]">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-[#5A4A36]/50 hover:text-[#2A2118] transition-colors">
                          <Plus size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                    <span className="font-en text-base font-medium" style={{ color: item.isGift ? '#4A665D' : '#2A2118' }}>
                      {item.isGift ? 'FREE' : formatPrice(convertPrice(item.price * item.quantity, currency), currency)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-[#FFFFFF] border border-[#EFE7D4] rounded-xl shadow-[0_1px_2px_rgba(74,58,36,0.04),0_10px_30px_-22px_rgba(74,58,36,0.4)] p-6 sticky top-24">
              <h2 className="checkout-section-title mb-4">Order Summary</h2>

              {/* 商品明细：缩略图 + 促销标签 + 赠品提示（对齐参考站右栏的信息密度） */}
              <OrderSummaryLines items={items} currency={currency} compact />

              <div className="space-y-3 font-sans text-sm mt-4 pt-4" style={{ borderTop: '1px solid rgba(74,58,36,0.14)' }}>
                <div className="flex justify-between text-[#5A4A36]/70">
                  <span>Subtotal</span>
                  <span className="text-[#2A2118]">{formatPrice(subtotalConverted, currency)}</span>
                </div>
                <div className="flex justify-between text-[#5A4A36]/70">
                  <span>Shipping</span>
                  <span className="text-[#2A2118]">{shipping === 0 ? <span className="text-green-600">Free</span> : formatPrice(shippingConverted, currency)}</span>
                </div>
                {shipping > 0 ? (
                  <div className="pt-1">
                    <p className="font-sans text-[11px] text-[#5A4A36]/70 mb-2">
                      Add <strong className="text-[#2A2118]">{formatPrice(convertPrice(Math.max(0, freeThreshold - subtotal), currency), currency)}</strong> more for free shipping
                    </p>
                    <div data-free-ship-bar="1" className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(74,58,36,0.20)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((subtotal / freeThreshold) * 100))}%`,
                          backgroundColor: '#5F7D72',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="font-sans text-[11px] font-medium text-green-600 flex items-center gap-1.5">
                    <Check size={12} strokeWidth={2} /> You&apos;ve unlocked free shipping
                  </p>
                )}
                <div className="border-t border-[#EFE7D4]/60 pt-3 flex justify-between font-medium text-[#2A2118]">
                  <span className="font-sans text-sm">Total</span>
                  <span className="font-en text-lg font-semibold">{formatPrice(totalConverted, currency)}</span>
                </div>
              </div>
              <Link href="/checkout"
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#2A2118] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors">
                Proceed to Checkout <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
              <Link href="/" className="mt-3 w-full flex items-center justify-center gap-1 font-sans text-xs text-[#5A4A36]/50 hover:text-[#2A2118] transition-colors">
                <ArrowLeft size={12} strokeWidth={1.5} /> Continue Shopping
              </Link>

              {/* 信任区：全部为真实可核验的要素（付款渠道/物流/退货/站内真实评价） */}
              <ShopWithConfidence reviewCount={reviewStats.count} rating={reviewStats.rating} />
            </div>
          </div>
        </div>

        {/* ============ 商品推荐（与详情页同款） ============ */}
        {related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 md:mt-28"
          >
            <div className="flex items-end justify-between mb-8">
              <h2 className="font-en text-2xl md:text-3xl font-medium tracking-[0.005em]" style={{ color: '#241C12' }}>You May Also Like</h2>
              <Link href="/products" className="font-sans text-[10px] tracking-[0.26em] uppercase font-semibold transition-opacity hover:opacity-60" style={{ color: '#8A6A2E' }}>
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </motion.div>
        )}
      </div>

      {/* ============ 吸底：商品 + 右侧去结算 ============
          需求：购物车里也要有「商品与右侧点击可购买」这样一条详情栏，
          不用滚回订单摘要才能结算。 */}
      <div
        data-cart-bottom-bar="1"
        className="fixed left-0 right-0 bottom-0 z-[101]"
        style={{ backgroundColor: '#FBF7EF', borderTop: '1px solid rgba(74,58,36,0.24)', boxShadow: 'rgba(74,58,36,0.24) 0 0 14px' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-3 flex items-center gap-4">
          <div className="flex items-center shrink-0">
            {discountedItems.slice(0, 3).map((it, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={it.id + i} src={it.image} alt="" className="w-11 h-11 object-cover"
                style={{ border: '2px solid #FBF7EF', borderRadius: 2, marginLeft: i === 0 ? 0 : -12, backgroundColor: '#F8F2E2', zIndex: 10 - i }} />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[13px] font-semibold leading-tight" style={{ color: '#241C12' }}>
              {items.length} {items.length === 1 ? 'piece' : 'pieces'} · {formatPrice(totalConverted, currency)}
            </p>
            <p className="font-sans text-[12px] leading-tight mt-0.5 hidden sm:block" style={{ color: 'rgba(74,58,36,0.65)' }}>
              Total includes {shipping === 0 ? 'free shipping' : `shipping ${formatPrice(shippingConverted, currency)}`}
            </p>
          </div>
          <Link
            href="/checkout"
            className="pdp-btn shrink-0 inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 font-sans text-[11px] font-bold tracking-[0.28em] uppercase text-white transition-all duration-300 hover:-translate-y-px"
            style={{ backgroundColor: '#241C12', borderRadius: 2 }}
          >
            Checkout <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </div>
  )
}
