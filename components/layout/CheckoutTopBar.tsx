'use client'

import Link from 'next/link'
import { ArrowUpLeft } from 'lucide-react'

/**
 * 结算流程的极简顶栏。
 *
 * 为什么不用全站导航栏：结算页上任何一个可点的链接都是弃单出口。
 * 参考站（Shopline 模板）的结算页顶部只有一行纯文字站名，这里照做：
 * 只保留站名 + 一个返回入口，不放任何导航、不放安全标识（客户不需要被反复提醒）。
 */
export default function CheckoutTopBar({ isCart = false }: { isCart?: boolean }) {
  return (
    <header
      data-checkout-topbar="1"
      className="w-full border-b"
      style={{ borderColor: 'rgba(74,58,36,0.12)', backgroundColor: '#FBFAF7' }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-en text-[19px] font-medium tracking-[0.01em] transition-opacity hover:opacity-70"
          style={{ color: '#2A2118' }}
        >
          Low Flame
        </Link>

        <Link
          href={isCart ? '/products' : '/cart'}
          className="inline-flex items-center gap-1.5 font-sans text-[11px] tracking-[0.14em] uppercase transition-all hover:-translate-x-0.5"
          style={{ color: 'rgba(74,58,36,0.62)' }}
        >
          <ArrowUpLeft size={12} strokeWidth={1.8} />
          {isCart ? 'Continue shopping' : 'Back to cart'}
        </Link>
      </div>
    </header>
  )
}
