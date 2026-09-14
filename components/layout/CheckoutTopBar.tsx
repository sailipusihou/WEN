'use client'

import Link from 'next/link'
import { Lock, ArrowUpLeft } from 'lucide-react'

/**
 * 结算流程的极简顶栏。
 *
 * 为什么不用全站导航栏：结算页上任何一个可点的链接都是弃单出口。
 * 参考站（Shopline 模板）的结算页顶部只有一行纯文字站名，
 * 这里照做，只保留三样东西：
 *   - 站名（弱化的文字，不是可点的大 logo）
 *   - 安全标识（锁图标 + Secure checkout），跨境客户最关心这个
 *   - 返回购物车 / 返回商店 的弱入口（避免客户被困住，比"没有出口"体验更好）
 */
export default function CheckoutTopBar({ isCart = false }: { isCart?: boolean }) {
  return (
    <header
      data-checkout-topbar="1"
      className="w-full border-b"
      style={{ borderColor: 'rgba(74,58,36,0.14)', backgroundColor: '#FBFAF7' }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-en text-[17px] font-medium tracking-[0.01em] transition-opacity hover:opacity-70"
          style={{ color: '#2A2118' }}
        >
          Low Flame
        </Link>

        <div className="flex items-center gap-5">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 font-sans text-[10px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: 'rgba(74,58,36,0.55)' }}
          >
            <Lock size={11} strokeWidth={2} /> Secure checkout
          </span>
          <Link
            href={isCart ? '/products' : '/cart'}
            className="inline-flex items-center gap-1.5 font-sans text-[11px] tracking-[0.14em] uppercase transition-opacity hover:opacity-70"
            style={{ color: 'rgba(74,58,36,0.7)' }}
          >
            <ArrowUpLeft size={12} strokeWidth={1.8} />
            {isCart ? 'Continue shopping' : 'Back to cart'}
          </Link>
        </div>
      </div>
    </header>
  )
}
