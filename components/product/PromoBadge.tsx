'use client'

// 促销价前端标注组件:
// - PromoImageBadge: 商品图片上的促销价角标 (仅真实促销活动时显示)
// - PromoSaleTag: 价格旁的 SALE 标签
import { convertPrice, formatPrice, type Currency } from '@/lib/cart-types'

export interface PromoEff {
  price: number
  originalPrice?: number
  discount: number
  promoName?: string
}

// 图片角标: 显示促销价格字样 + 折扣百分比 (有促销活动 discount>0 才显示;
// 仅填写商品原价划线的不算促销, 不显示角标)
export function PromoImageBadge({
  eff,
  currency,
  className = 'bottom-3 left-3',
}: {
  eff: PromoEff | null | undefined
  currency: Currency
  className?: string
}) {
  if (!eff || eff.discount <= 0) return null
  const pct =
    eff.originalPrice && eff.originalPrice > 0
      ? Math.round((eff.discount / eff.originalPrice) * 100)
      : 0
  return (
    <div
      className={`absolute ${className} z-10 flex flex-col items-start gap-0.5 rounded-sm bg-[#A83420]/95 px-2 py-1 shadow-md backdrop-blur-sm`}
    >
      <span className="font-sans text-micro font-bold tracking-[0.26em] text-white uppercase">
        Sale
      </span>
      <span className="font-en text-sm font-semibold leading-none text-white">
        {formatPrice(convertPrice(eff.price, currency), currency)}
        {pct > 0 && (
          <span className="ml-1 font-sans text-micro font-medium text-white/90">-{pct}%</span>
        )}
      </span>
    </div>
  )
}

// 价格区 SALE 标签 (仅真实促销时渲染)
export function PromoSaleTag() {
  return (
    <span className="ml-1.5 inline-block align-middle rounded-sm bg-[#A83420] px-1.5 py-0.5 font-sans text-micro font-bold tracking-[0.22em] text-white uppercase">
      Sale
    </span>
  )
}

// 促销价颜色类: 有促销活动时用强调色 (红棕), 否则使用调用方传入的常规色
export function promoPriceClass(eff: PromoEff | null | undefined, normal: string): string {
  return eff && eff.discount > 0 ? 'text-[#A83420] font-semibold' : normal
}
