'use client'

/**
 * 商品详情页「吸底加购栏」
 *
 * 对标参考站实测规格：
 *   高度 92px / 白底 #FBF7EF / 底部固定 / z-index 102
 *   阴影 rgba(74,52,34,0.08) 0 0 12px
 *   进场 transform 0.4s cubic-bezier(0.165,0.84,0.44,1)（从下往上推入）
 *   内容：[缩略图 68px] [现价 24px/700 红 + 原价 18px 划线 + 标题 18px/700] [数量] [加购按钮]
 *   出现时机：主购买区滚出视口之后（不是一进页面就有）
 *
 * 我们的增强：
 *   1) 加「立即购买」——直接进结算，跳过购物车（参考站没有，转化更高）
 *   2) 移动端压缩为：缩略图 + 价格 + 加购按钮
 *   3) 底部加一条免邮进度提示（购物车金额接近免邮门槛时）
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Minus, Plus, Zap } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import { useDiscountedCartSubtotal } from '@/lib/promotion-client'
import type { Product } from '@/lib/products'

const INK = '#241C12'
const GOLD = '#8A6A2E'

export default function StickyBuyBar({
  product, effPrice, originalPrice, discount, visible, freeThreshold,
}: {
  product: Product
  effPrice: number
  originalPrice?: number
  discount: number
  visible: boolean
  freeThreshold?: number
}) {
  const { addItem, items } = useCart()
  const { currency } = useCurrency()
  const router = useRouter()
  const [qty, setQty] = useState(1)

  // 用户在上面改过数量后，吸底栏跟随（体验一致）
  useEffect(() => {
    const onQty = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d && typeof d.qty === 'number') setQty(d.qty)
    }
    window.addEventListener('pdp:qty', onQty as EventListener)
    return () => window.removeEventListener('pdp:qty', onQty as EventListener)
  }, [])

  const push = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id, name: product.name,
        nameEn: product.nameEn || product.name,
        image: product.image, price: product.price,
        category: product.category,
      })
    }
  }

  const handleAdd = () => {
    push()
    // 需求：加购后直接进入购物车页（不停留、不弹提示）
    router.push('/cart')
  }

  const handleBuyNow = () => {
    push()
    router.push('/checkout')
  }

  // 免邮进度（购物车小计 → 门槛）—— 用促销后小计，与购物车页/结算页一致
  const subtotalUsd = useDiscountedCartSubtotal(items)
  const remain = freeThreshold && freeThreshold > 0 ? Math.max(0, freeThreshold - subtotalUsd) : 0
  const showShip = !!freeThreshold && freeThreshold > 0 && subtotalUsd > 0 && remain > 0

  return (
    <div
      aria-hidden={!visible}
      data-visible={visible ? '1' : '0'}
      className="fixed left-0 right-0 bottom-0 z-[102] transition-all duration-[400ms]"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(105%)',
        transitionTimingFunction: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* 免邮进度提示条 */}
      {showShip && (
        <div className="font-sans text-[11px] text-center py-1.5 tracking-[0.02em]" style={{ backgroundColor: '#EFE4CE', color: INK }}>
          Add <strong>{formatPrice(convertPrice(remain, currency), currency)}</strong> more for <strong>free shipping</strong>
        </div>
      )}

      <div
        className="w-full"
        style={{
          backgroundColor: '#FBF7EF',
          borderTop: '1px solid rgba(74,58,36,0.20)',
          boxShadow: 'rgba(74,58,36,0.20) 0 0 12px',
        }}
      >
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-12 py-3 flex items-center gap-4 lg:gap-6">
          {/* 缩略图 */}
          <div className="shrink-0 w-14 h-14 sm:w-[68px] sm:h-[68px] overflow-hidden" style={{ backgroundColor: '#F8F2E2', borderRadius: 2 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={product.nameEn || product.name} className="w-full h-full object-cover" />
          </div>

          {/* 价格 + 标题 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5">
              <span className="font-en text-[20px] sm:text-[24px] font-medium leading-none" style={{ color: discount > 0 ? '#D22D24' : INK }}>
                {formatPrice(convertPrice(effPrice, currency), currency)}
              </span>
              {(originalPrice || product.originalPrice) && (
                <span className="font-sans text-[14px] sm:text-[16px] line-through leading-none hidden sm:inline" style={{ color: 'rgba(74,58,36,0.54)' }}>
                  {formatPrice(convertPrice(originalPrice || product.originalPrice || 0, currency), currency)}
                </span>
              )}
            </div>
            <p className="font-en text-[13px] sm:text-[15px] font-medium truncate mt-1.5" style={{ color: INK }}>
              {product.nameEn || product.name}
            </p>
          </div>

          {/* 数量 */}
          <div className="hidden md:flex items-center shrink-0" style={{ border: '1px solid rgba(74,58,36,0.28)', borderRadius: 2 }}>
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2.5 transition-opacity hover:opacity-60" style={{ color: '#5F5A54' }} aria-label="Decrease quantity">
              <Minus size={13} strokeWidth={1.8} />
            </button>
            <span className="px-2 font-sans text-[14px] font-medium min-w-[2rem] text-center" style={{ color: INK }}>{qty}</span>
            <button type="button" onClick={() => setQty(qty + 1)} className="px-3 py-2.5 transition-opacity hover:opacity-60" style={{ color: '#5F5A54' }} aria-label="Increase quantity">
              <Plus size={13} strokeWidth={1.8} />
            </button>
          </div>

          {/* 操作区 */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleAdd}
              className="pdp-btn hidden sm:flex items-center justify-center gap-2 px-6 py-3 font-sans text-[11px] font-bold tracking-[0.28em] uppercase transition-all duration-300"
              style={{ backgroundColor: INK, color: '#fff', borderRadius: 2, minWidth: 148 }}
            >
              <ShoppingBag size={14} strokeWidth={2.2} /> Add to cart
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="pdp-btn flex items-center justify-center gap-2 px-5 sm:px-6 py-3 font-sans text-[11px] font-bold tracking-[0.28em] uppercase transition-all duration-300"
              style={{ backgroundColor: '#fff', color: INK, border: `1px solid ${INK}`, borderRadius: 2 }}
            >
              <Zap size={14} strokeWidth={2.2} className="sm:hidden" />
              <span className="hidden sm:inline">Buy now</span>
              <span className="sm:hidden">Buy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
