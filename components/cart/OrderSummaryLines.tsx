'use client'

import Link from 'next/link'
import { Gift, Tag } from 'lucide-react'
import type { CartItem } from '@/lib/cart-types'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import { useActivePromotions } from '@/lib/promotion-client'
import { computePromotionForProduct } from '@/lib/promotion-shared'

/**
 * 订单摘要里的商品行。
 *
 * 对齐参考站右栏的信息密度（原来我们只有「名字 x 数量 …… 金额」一行干巴巴的文字）：
 *   [缩略图] 商品名
 *            🏷 促销标签（有折扣时显示省了多少）
 *            🎁 Free gift（赠品行 / 赠品所属行）
 *            ……                          金额（有折扣时原价划线）
 *
 * 购物车页与结算页共用这一个组件，保证两处口径一致。
 * 价格用与结算页同一个纯函数 computePromotionForProduct 计算，不会分叉。
 */
interface Props {
  items: CartItem[]
  currency: 'USD' | 'CNY'
  /** 紧凑模式：结算页右栏位置紧张时用 */
  compact?: boolean
}

export default function OrderSummaryLines({ items, currency, compact = false }: Props) {
  const promotions = useActivePromotions()

  const lines = items.map(item => {
    const eff = computePromotionForProduct(
      { id: item.id, category: item.category || '', price: item.price },
      promotions
    )
    const base = item.price
    const final = item.isGift ? 0 : eff.price
    return {
      ...item,
      base,
      final,
      saved: item.isGift ? base : Math.max(0, Math.round((base - eff.price) * 100) / 100),
      promoName: eff.promoName,
    }
  })

  if (!lines.length) return null

  return (
    <div className="space-y-0">
      {lines.map((l, idx) => (
        <div
          key={l.id + (l.isGift ? '-gift' : '')}
          className="flex gap-3 py-3"
          style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(74,58,36,0.10)' }}
        >
          {/* 缩略图：参考站每个商品都有，占比很小时也能一眼认出买了什么 */}
          <Link
            href={`/products/${l.id}`}
            className="shrink-0 overflow-hidden"
            style={{ width: compact ? 44 : 52, height: compact ? 55 : 65, borderRadius: 3, backgroundColor: '#F8F2E2' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.image} alt="" className="w-full h-full object-cover" />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/products/${l.id}`}
                className="font-sans text-[13px] leading-snug hover:opacity-70 transition-opacity"
                style={{ color: '#2A2118' }}
              >
                {l.nameEn || l.name}
              </Link>
              <span
                className="font-sans text-[13px] whitespace-nowrap shrink-0"
                style={{ color: l.isGift ? '#4A665D' : '#2A2118', fontWeight: l.isGift ? 600 : 500 }}
              >
                {l.isGift
                  ? 'FREE'
                  : formatPrice(convertPrice(l.final * l.quantity, currency), currency)}
              </span>
            </div>

            <p className="font-sans text-[11px] mt-0.5" style={{ color: 'rgba(74,58,36,0.55)' }}>
              Qty {l.quantity}
              {!l.isGift && l.saved > 0 && (
                <span className="ml-2 line-through">{formatPrice(convertPrice(l.base * l.quantity, currency), currency)}</span>
              )}
            </p>

            {/* 促销标签：告诉你这单省在哪 */}
            {!l.isGift && l.saved > 0 && (
              <p className="font-sans text-[10px] mt-1 inline-flex items-center gap-1 px-1.5 py-0.5"
                style={{ backgroundColor: '#F2F6F4', color: '#4A665D', borderRadius: 2 }}>
                <Tag size={9} strokeWidth={2.2} />
                {l.promoName || 'Promotion'} · save {formatPrice(convertPrice(l.saved * l.quantity, currency), currency)}
              </p>
            )}

            {/* 赠品提示 */}
            {l.isGift && (
              <p className="font-sans text-[10px] mt-1 inline-flex items-center gap-1 px-1.5 py-0.5"
                style={{ backgroundColor: '#FBF3DF', color: '#8A6A2E', borderRadius: 2 }}>
                <Gift size={9} strokeWidth={2.2} /> Free gift — included with your order
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
