'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import OptimizedImage from '@/components/ui/OptimizedImage'
import ProductCard from '@/components/product/ProductCard'
import type { Product } from '@/lib/products'
import { useActivePromotions } from '@/lib/promotion-client'
import { computePromotionForProduct } from '@/lib/promotion-shared'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart()
  const { currency } = useCurrency()

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
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F1E9DC]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#DDCEB4]/50 flex items-center justify-center">
            <ShoppingBag size={32} strokeWidth={1} className="text-[#57503F]/30" />
          </div>
          <h1 className="font-en text-2xl md:text-3xl text-[#221E1A] font-semibold tracking-tight mb-2">Your cart is empty</h1>
          <p className="font-sans text-sm text-[#57503F]/60 mb-8">Discover our collection of handcrafted objects.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-[#221E1A] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors">
            <ArrowLeft size={14} strokeWidth={1.5} /> Browse Collection
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F1E9DC] min-h-screen">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-en text-3xl md:text-4xl text-[#221E1A] font-semibold tracking-tight">Cart</h1>
            <p className="font-sans text-sm text-[#57503F]/60 mt-1">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</p>
          </div>
          <button onClick={clearCart} className="font-sans text-[10px] text-[#57503F]/40 hover:text-[#221E1A] transition-colors tracking-wider uppercase">
            Clear
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            {discountedItems.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white/80 border border-[#DDCEB4]/50 p-4 md:p-6 flex gap-4 md:gap-6">
                <Link href={`/products/${item.id}`} className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#DDCEB4]/30 overflow-hidden relative">
                  <OptimizedImage src={item.image} alt={item.nameEn || item.name} fill sizes="(max-width: 768px) 80px, 96px" objectFit="cover" placeholder="blur" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/products/${item.id}`} className="font-en text-sm md:text-base text-[#221E1A] hover:text-[#8A6A2E] transition-colors font-medium">
                        {item.nameEn || item.name}
                      </Link>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-1 text-[#57503F]/30 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-[#DDCEB4]">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-[#57503F]/50 hover:text-[#221E1A] transition-colors">
                        <Minus size={12} strokeWidth={1.5} />
                      </button>
                      <span className="w-8 text-center font-sans text-sm text-[#221E1A]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-[#57503F]/50 hover:text-[#221E1A] transition-colors">
                        <Plus size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                    <span className="font-en text-base font-medium text-[#221E1A]">
                      {formatPrice(convertPrice(item.price * item.quantity, currency), currency)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/80 border border-[#DDCEB4]/50 p-6 sticky top-24">
              <h2 className="font-sans text-[10px] text-[#A07C34] tracking-[0.15em] uppercase font-medium mb-6">Order Summary</h2>
              <div className="space-y-3 font-sans text-sm">
                <div className="flex justify-between text-[#57503F]/70">
                  <span>Subtotal</span>
                  <span className="text-[#221E1A]">{formatPrice(subtotalConverted, currency)}</span>
                </div>
                <div className="flex justify-between text-[#57503F]/70">
                  <span>Shipping</span>
                  <span className="text-[#221E1A]">{shipping === 0 ? <span className="text-green-600">Free</span> : formatPrice(shippingConverted, currency)}</span>
                </div>
                {shipping > 0 ? (
                  <div className="pt-1">
                    <p className="font-sans text-[11px] text-[#57503F]/70 mb-2">
                      Add <strong className="text-[#221E1A]">{formatPrice(convertPrice(Math.max(0, freeThreshold - subtotal), currency), currency)}</strong> more for free shipping
                    </p>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(58,44,26,0.18)' }}>
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
                <div className="border-t border-[#DDCEB4]/60 pt-3 flex justify-between font-medium text-[#221E1A]">
                  <span className="font-sans text-sm">Total</span>
                  <span className="font-en text-lg font-semibold">{formatPrice(totalConverted, currency)}</span>
                </div>
              </div>
              <Link href="/checkout"
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#221E1A] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors">
                Proceed to Checkout <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
              <Link href="/" className="mt-3 w-full flex items-center justify-center gap-1 font-sans text-xs text-[#57503F]/50 hover:text-[#221E1A] transition-colors">
                <ArrowLeft size={12} strokeWidth={1.5} /> Continue Shopping
              </Link>
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
              <h2 className="font-en text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: '#1C1814' }}>You May Also Like</h2>
              <Link href="/products" className="font-sans text-[10px] tracking-[0.14em] uppercase font-semibold transition-opacity hover:opacity-60" style={{ color: '#8A6A2E' }}>
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
        style={{ backgroundColor: '#FBF7EF', borderTop: '1px solid rgba(58,44,26,0.22)', boxShadow: 'rgba(58,44,26,0.22) 0 0 14px' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-3 flex items-center gap-4">
          <div className="flex items-center shrink-0">
            {discountedItems.slice(0, 3).map((it, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={it.id + i} src={it.image} alt="" className="w-11 h-11 object-cover"
                style={{ border: '2px solid #FBF7EF', borderRadius: 2, marginLeft: i === 0 ? 0 : -12, backgroundColor: '#E6D8C2', zIndex: 10 - i }} />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[13px] font-semibold leading-tight" style={{ color: '#1C1814' }}>
              {items.length} {items.length === 1 ? 'piece' : 'pieces'} · {formatPrice(totalConverted, currency)}
            </p>
            <p className="font-sans text-[12px] leading-tight mt-0.5 hidden sm:block" style={{ color: 'rgba(58,44,26,0.62)' }}>
              Total includes {shipping === 0 ? 'free shipping' : `shipping ${formatPrice(shippingConverted, currency)}`}
            </p>
          </div>
          <Link
            href="/checkout"
            className="pdp-btn shrink-0 inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-white transition-all duration-300 hover:-translate-y-px"
            style={{ backgroundColor: '#1C1814', borderRadius: 2 }}
          >
            Checkout <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </div>
      </div>
    </div>
  )
}
