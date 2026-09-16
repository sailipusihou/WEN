'use client'

/**
 * 首页评价区。
 *
 * 数据由 app/page.tsx 在服务端注入（app/page.tsx 是 async server component，
 * 直接读 repository 即可，不需要为首页新开一个公开评价接口 —— 全量评价列表
 * 是管理端权限，不应该为了首页展示而放开）。
 *
 * 真实评价优先；一条都没有时才会拿到开发模式的示例评价，此时每条都会
 * 显示一个可见的 **SAMPLE** 角标。生产构建下示例数据恒为空数组
 * （见 lib/sample-reviews.ts 的门禁说明），所以线上要么是真实评价，
 * 要么整段不渲染 —— 不会出现"看起来像真实客户的编造评价"。
 */

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

export interface HomeReview {
  id: string
  productId: string
  author: string
  avatar: string
  rating: number
  date: string
  content: string
  location: string
  /** true = 开发模式示例数据，必须显示 SAMPLE 角标 */
  isSample: boolean
}

const INK = '#241C12'
const SOFT = 'rgba(74,58,36,0.72)'
const GOLD = '#8A6A2E'
const LINE = 'rgba(74,58,36,0.12)'

export default function HomeReviews({ reviews }: { reviews: HomeReview[] }) {
  if (!reviews || reviews.length === 0) return null

  const anySample = reviews.some(r => r.isSample)

  return (
    <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
      <div className="flex items-end justify-between mb-10 md:mb-14">
        <div>
          <p className="font-sans text-[11px] tracking-[0.28em] uppercase mb-3" style={{ color: GOLD }}>
            From Our Customers
          </p>
          <h2 className="font-en text-3xl md:text-4xl font-medium tracking-[0.005em]" style={{ color: INK }}>
            Reviews from Verified Customers
          </h2>
        </div>
        {/* 开发模式专用提示 —— 生产中示例数据为空，这一行不会出现 */}
        {anySample && (
          <span
            className="font-sans text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm"
            style={{ color: '#8A6522', backgroundColor: 'rgba(168,124,46,0.12)', border: '1px solid rgba(168,124,46,0.28)' }}
          >
            Sample data — dev only
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {reviews.map((r, i) => (
          <motion.figure
            key={r.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="relative flex flex-col rounded-sm p-6 md:p-7"
            style={{ backgroundColor: '#FBFAF7', border: `1px solid ${LINE}` }}
          >
            {/* 每条示例评价都必须自带 SAMPLE 标记，不能只靠区块顶部的提示 */}
            {r.isSample && (
              <span
                className="absolute top-3 right-3 font-sans text-[9px] tracking-[0.16em] uppercase px-1.5 py-0.5 rounded-sm"
                style={{ color: '#8A6522', backgroundColor: 'rgba(168,124,46,0.14)' }}
              >
                Sample
              </span>
            )}

            <Quote size={16} strokeWidth={1.4} style={{ color: 'rgba(138,106,46,0.35)' }} />

            <blockquote className="mt-4 flex-1 font-sans text-[14px] leading-[1.75]" style={{ color: SOFT }}>
              {r.content}
            </blockquote>

            <div className="mt-4 flex items-center gap-[2px]">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star
                  key={j}
                  size={12}
                  className={j < r.rating ? 'fill-[#A07C34] text-[#A07C34]' : 'text-[#A07C34]/25'}
                />
              ))}
            </div>

            <figcaption className="mt-4 pt-4 flex items-center gap-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-sm overflow-hidden shrink-0"
                style={{ backgroundColor: 'rgba(139,125,92,0.10)', color: GOLD }}
              >
                {r.avatar && (r.avatar.startsWith('http') || r.avatar.startsWith('/api/uploads') || r.avatar.startsWith('/images/'))
                  ? <img src={r.avatar} alt={r.author} className="w-full h-full object-cover" />
                  : r.avatar}
              </div>
              <div className="min-w-0">
                <p className="font-sans text-[13px] font-semibold truncate" style={{ color: INK }}>{r.author}</p>
                <p className="font-sans text-[11px] truncate" style={{ color: 'rgba(74,58,36,0.56)' }}>
                  {r.location} · {r.date}
                </p>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  )
}
