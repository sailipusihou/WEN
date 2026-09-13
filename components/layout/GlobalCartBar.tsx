'use client'

/**
 * 全站底部购物车条
 *
 * 需求：
 *   - 只要购物车非空，就在**所有前台页面**底部常驻（包括回退到首页、刷新页面之后）
 *   - 右侧有「View cart」直接进购物车
 *   - 有关闭 ×，手动关闭后本页会话内不再打扰（刷新后重新出现，因为状态只存内存）
 *   - 购物车页 / 结算页不显示（这两页自己就有主 CTA，避免重复）
 *
 * 视觉沿用详情页吸底栏的规格：白底 #FAFAFA、上边框、柔和阴影、
 * transform .4s cubic-bezier(.165,.84,.44,1) 从底部推入。
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, X, ArrowRight } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { convertPrice, formatPrice } from '@/lib/cart-types'

const INK = '#231F1C'

export default function GlobalCartBar() {
  const { items, totalItems, subtotal } = useCart()
  const { currency } = useCurrency()
  const pathname = usePathname()
  const [closed, setClosed] = useState(false)

  // 换页时把「已关闭」重置为「显示」以外的判断交给 closed 保留：
  // 用户主动关掉就尊重他的选择（同一次会话内不再弹），刷新后才回来。
  const onCartPage = pathname === '/cart' || pathname === '/checkout'
  const visible = !closed && !onCartPage && items.length > 0

  // 给页面底部留出空间，避免遮住页脚最后一行
  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.paddingBottom
    document.body.style.paddingBottom = '96px'
    return () => { document.body.style.paddingBottom = prev }
  }, [visible])

  if (!visible) return null

  const thumbs = items.slice(0, 3)

  return (
    <div
      data-global-cart-bar="1"
      className="fixed left-0 right-0 bottom-0 z-[101] transition-all duration-[400ms]"
      style={{ transitionTimingFunction: 'cubic-bezier(0.165, 0.84, 0.44, 1)' }}
    >
      <div
        style={{
          backgroundColor: '#FAFAFA',
          borderTop: '1px solid rgba(35,31,28,0.10)',
          boxShadow: 'rgba(35,31,28,0.10) 0 0 14px',
        }}
      >
        <div className="max-w-[1560px] mx-auto px-4 sm:px-8 lg:px-12 py-2.5 flex items-center gap-4">
          {/* 叠放的商品缩略图 */}
          <div className="flex items-center shrink-0">
            {thumbs.map((it, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={it.id + i}
                src={it.image}
                alt=""
                className="w-11 h-11 object-cover"
                style={{
                  border: '2px solid #FAFAFA',
                  borderRadius: 2,
                  marginLeft: i === 0 ? 0 : -12,
                  backgroundColor: '#F2EAE0',
                  zIndex: 10 - i,
                }}
              />
            ))}
            {items.length > 3 && (
              <span className="ml-2 font-sans text-[12px] font-semibold" style={{ color: 'rgba(35,31,28,0.55)' }}>
                +{items.length - 3}
              </span>
            )}
          </div>

          {/* 数量 + 小计 */}
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[13px] font-semibold leading-tight" style={{ color: INK }}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
            </p>
            <p className="font-sans text-[12px] leading-tight mt-0.5" style={{ color: 'rgba(35,31,28,0.55)' }}>
              Subtotal {formatPrice(convertPrice(subtotal, currency), currency)}
            </p>
          </div>

          {/* 右侧操作 */}
          <Link
            href="/cart"
            className="pdp-btn shrink-0 inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-white transition-all duration-300 hover:-translate-y-px"
            style={{ backgroundColor: INK, borderRadius: 2 }}
          >
            <ShoppingBag size={14} strokeWidth={2.2} />
            <span className="hidden sm:inline">View cart</span>
            <span className="sm:hidden">Cart</span>
            <ArrowRight size={13} strokeWidth={2.2} />
          </Link>

          {/* 关闭 */}
          <button
            type="button"
            onClick={() => setClosed(true)}
            aria-label="Close cart bar"
            className="shrink-0 w-9 h-9 flex items-center justify-center transition-colors duration-200 hover:bg-black/5"
            style={{ color: 'rgba(35,31,28,0.45)', borderRadius: 2 }}
          >
            <X size={17} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  )
}
