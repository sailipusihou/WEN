'use client'

import Link from 'next/link'

/**
 * 结算流程的极简顶栏。
 *
 * 需求（2026-09 调整）：
 *   - 结账页**不放任何返回入口**。客户想退回上一页用浏览器自带的返回按钮就行，
 *     页面上再放一个「Back to cart / Continue shopping」等于多给一个弃单出口。
 *   - 结账页也不放导航（导航栏是最大的弃单出口）。
 *   - 购物车页例外：那一页本来就是「还没开始结账」，留一个继续购物入口是合理的。
 *
 * 所以：结算页只剩一个站名（不可点，纯标识）；购物车页保留「Continue shopping」。
 */
export default function CheckoutTopBar({ isCart = false }: { isCart?: boolean }) {
  return (
    <header
      data-checkout-topbar="1"
      className="w-full border-b"
      style={{ borderColor: 'rgba(74,58,36,0.12)', backgroundColor: '#FBFAF7' }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4">
        <span
          className="font-en text-[19px] font-medium tracking-[0.01em] select-none"
          style={{ color: '#2A2118' }}
        >
          Low Flame
        </span>

        {isCart && (
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 font-sans text-[11px] tracking-[0.14em] uppercase transition-all hover:-translate-x-0.5"
            style={{ color: 'rgba(74,58,36,0.62)' }}
          >
            Continue shopping
          </Link>
        )}
      </div>
    </header>
  )
}
