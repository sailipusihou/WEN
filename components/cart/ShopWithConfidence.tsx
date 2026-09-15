'use client'

import { ShieldCheck, Truck, RotateCcw, Star, Lock } from 'lucide-react'

/**
 * 「Shop with Confidence」信任区。
 *
 * ⚠️ 设计取舍（重要，改动前先读）：
 * 参考站右栏底部挂了一排媒体背书 logo（yahoo! / USA TODAY / New York Weekly / LUXUO…）。
 * **我们不做这个** —— 那些报道是别家的，凭空挂上去属于虚假背书。
 * 美国 FTC 对虚假代言/背书有明确处罚条款，Google/Meta 广告审核也会直接拒，
 * 而且一旦被客户投诉，损失远大于这点转化的收益。
 *
 * 这里只放**真实可核验**的信任要素：
 *   - 数据来自本站真实订单/评价，不是编的
 *   - 支付渠道、物流、退货政策都是站上实际提供的服务
 * 想加媒体报道的话，等真的有媒体写过我们，把链接给我，我按真实报道接进去。
 */
interface Props {
  /** 真实评价数（从商品数据聚合，没有就传 0 不显示那一行） */
  reviewCount?: number
  /** 真实平均分 */
  rating?: number
}

export default function ShopWithConfidence({ reviewCount = 0, rating = 0 }: Props) {
  return (
    <div
      data-shop-with-confidence="1"
      className="mt-6 pt-5"
      style={{ borderTop: '1px solid rgba(74,58,36,0.14)' }}
    >
      <p
        className="text-center font-sans text-[10px] font-bold tracking-[0.24em] uppercase mb-4"
        style={{ color: 'rgba(74,58,36,0.5)' }}
      >
        — Shop with Confidence —
      </p>

      <div className="space-y-2.5">
        {[
          { icon: ShieldCheck, title: 'Secure 256-bit checkout', sub: 'Payments handled by PayPal' },
          { icon: Truck, title: 'Tracked worldwide shipping', sub: 'Dispatched from the workshop in 1–2 days' },
          { icon: RotateCcw, title: '30-day money back', sub: 'Not right? Send it back, no questions' },
        ].map(t => (
          <div key={t.title} className="flex items-start gap-2.5">
            <t.icon size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" style={{ color: '#8A6A2E' }} />
            <div className="min-w-0">
              <p className="font-sans text-[12px] leading-tight" style={{ color: '#2A2118' }}>{t.title}</p>
              <p className="font-sans text-[10px] leading-tight mt-0.5" style={{ color: 'rgba(74,58,36,0.5)' }}>{t.sub}</p>
            </div>
          </div>
        ))}

        {/* 真实评价：只有真有数据才显示，不编 */}
        {reviewCount > 0 && rating > 0 && (
          <div className="flex items-start gap-2.5">
            <Star size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" style={{ color: '#8A6A2E' }} />
            <div className="min-w-0">
              <p className="font-sans text-[12px] leading-tight" style={{ color: '#2A2118' }}>
                Rated {rating.toFixed(1)} / 5 by {reviewCount} customers
              </p>
              <p className="font-sans text-[10px] leading-tight mt-0.5" style={{ color: 'rgba(74,58,36,0.5)' }}>
                From verified purchases on this store
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 实际接受的支付方式 */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {[
          { label: 'VISA', bg: '#1A1F71', fg: '#fff' },
          { label: 'MC', bg: '#fff', fg: '#EB001B', border: true },
          { label: 'AMEX', bg: '#006FCF', fg: '#fff' },
          { label: 'PayPal', bg: '#fff', fg: '#003087', border: true },
          { label: 'G Pay', bg: '#fff', fg: '#3C4043', border: true },
        ].map(c => (
          <span
            key={c.label}
            title={c.label}
            className="inline-flex items-center justify-center font-sans font-bold"
            style={{
              width: 40, height: 26, borderRadius: 3,
              backgroundColor: c.bg, color: c.fg,
              fontSize: c.label.length > 5 ? 7 : 8,
              letterSpacing: '0.03em',
              border: c.border ? '1px solid rgba(74,58,36,0.22)' : 'none',
            }}
          >
            {c.label}
          </span>
        ))}
      </div>

      <p className="flex items-center justify-center gap-1 mt-3 font-sans text-[10px]" style={{ color: 'rgba(74,58,36,0.45)' }}>
        <Lock size={9} strokeWidth={2} /> Your details are encrypted end to end
      </p>
    </div>
  )
}
