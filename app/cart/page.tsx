'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, ArrowRight } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import OptimizedImage from '@/components/ui/OptimizedImage'
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

  const shipping = subtotal >= 3000 ? 0 : 250
  const shippingConverted = convertPrice(shipping, currency)
  const subtotalConverted = convertPrice(subtotal, currency)
  const totalConverted = subtotalConverted + shippingConverted

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F8F5F0]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#EDE8DC]/50 flex items-center justify-center">
            <ShoppingBag size={32} strokeWidth={1} className="text-[#6B6B6B]/30" />
          </div>
          <h1 className="font-en text-2xl md:text-3xl text-[#2C2C2C] font-semibold tracking-tight mb-2">Your cart is empty</h1>
          <p className="font-sans text-sm text-[#6B6B6B]/60 mb-8">Discover our collection of handcrafted objects.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-[#2C2C2C] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors">
            <ArrowLeft size={14} strokeWidth={1.5} /> Browse Collection
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F8F5F0] min-h-screen">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-en text-3xl md:text-4xl text-[#2C2C2C] font-semibold tracking-tight">Cart</h1>
            <p className="font-sans text-sm text-[#6B6B6B]/60 mt-1">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</p>
          </div>
          <button onClick={clearCart} className="font-sans text-[10px] text-[#6B6B6B]/40 hover:text-[#2C2C2C] transition-colors tracking-wider uppercase">
            Clear
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            {discountedItems.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white/80 border border-[#EDE8DC]/50 p-4 md:p-6 flex gap-4 md:gap-6">
                <Link href={`/products/${item.id}`} className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#EDE8DC]/30 overflow-hidden relative">
                  <OptimizedImage src={item.image} alt={item.nameEn || item.name} fill sizes="(max-width: 768px) 80px, 96px" objectFit="cover" placeholder="blur" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/products/${item.id}`} className="font-en text-sm md:text-base text-[#2C2C2C] hover:text-[#8B7D5C] transition-colors font-medium">
                        {item.nameEn || item.name}
                      </Link>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-1 text-[#6B6B6B]/30 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-[#EDE8DC]">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-[#6B6B6B]/50 hover:text-[#2C2C2C] transition-colors">
                        <Minus size={12} strokeWidth={1.5} />
                      </button>
                      <span className="w-8 text-center font-sans text-sm text-[#2C2C2C]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-[#6B6B6B]/50 hover:text-[#2C2C2C] transition-colors">
                        <Plus size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                    <span className="font-en text-base font-medium text-[#2C2C2C]">
                      {formatPrice(convertPrice(item.price * item.quantity, currency), currency)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/80 border border-[#EDE8DC]/50 p-6 sticky top-24">
              <h2 className="font-sans text-[10px] text-[#B8A06C] tracking-[0.15em] uppercase font-medium mb-6">Order Summary</h2>
              <div className="space-y-3 font-sans text-sm">
                <div className="flex justify-between text-[#6B6B6B]/70">
                  <span>Subtotal</span>
                  <span className="text-[#2C2C2C]">{formatPrice(subtotalConverted, currency)}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]/70">
                  <span>Shipping</span>
                  <span className="text-[#2C2C2C]">{shipping === 0 ? <span className="text-green-600">Free</span> : formatPrice(shippingConverted, currency)}</span>
                </div>
                {shipping > 0 && (
                  <p className="font-sans text-[10px] text-[#6B6B6B]/40">Free shipping on orders over {formatPrice(convertPrice(3000, currency), currency)}</p>
                )}
                <div className="border-t border-[#EDE8DC]/60 pt-3 flex justify-between font-medium text-[#2C2C2C]">
                  <span className="font-sans text-sm">Total</span>
                  <span className="font-en text-lg font-semibold">{formatPrice(totalConverted, currency)}</span>
                </div>
              </div>
              <Link href="/checkout"
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#2C2C2C] text-white text-xs tracking-[0.08em] uppercase font-sans font-medium hover:bg-[#1A1A1A] transition-colors">
                Proceed to Checkout <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
              <Link href="/" className="mt-3 w-full flex items-center justify-center gap-1 font-sans text-xs text-[#6B6B6B]/50 hover:text-[#2C2C2C] transition-colors">
                <ArrowLeft size={12} strokeWidth={1.5} /> Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
