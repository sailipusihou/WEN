'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'

/**
 * 结算页顶部的「预留倒计时」提示条。
 *
 * 参考站（Shopline 模板）在结算页最上方放了一条倒计时，用来制造紧迫感、降低弃单。
 * 这里照做，但措辞保持诚实：说的是「为你预留」，不是「再不买就没了」。
 *
 * 计时起点存在 sessionStorage 里，同一会话内刷新不会重置（不然刷新一次就重置，
 * 反而显得假）；换会话重新开始。
 */
const STORAGE_KEY = 'otm_checkout_deadline'
const WINDOW_MS = 15 * 60 * 1000 // 15 分钟

function getDeadline(): number {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const t = Number(raw)
      // 没到期就继续用；已过期则重新给一个窗口
      if (Number.isFinite(t) && t > Date.now()) return t
    }
    const next = Date.now() + WINDOW_MS
    sessionStorage.setItem(STORAGE_KEY, String(next))
    return next
  } catch {
    return Date.now() + WINDOW_MS
  }
}

export default function CheckoutUrgency() {
  const deadlineRef = useRef<number>(0)
  const [left, setLeft] = useState<number>(WINDOW_MS)

  useEffect(() => {
    deadlineRef.current = getDeadline()
    const tick = () => setLeft(Math.max(0, deadlineRef.current - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const total = Math.floor(left / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')

  if (left <= 0) return null

  return (
    /**
     * 参考站的那条紧迫提示是**贴左边的一小条**，不是整行铺满。
     * 用 inline-flex + w-fit 让它按内容宽度收紧（原来 justify-center 会撑满整行，
     * 在宽屏上显示成一条很长的横条，很突兀）。
     */
    <div
      data-checkout-urgency="1"
      className="mb-5 inline-flex w-fit max-w-full items-center gap-2.5 px-4 py-2.5"
      style={{ backgroundColor: '#FBF3DF', border: '1px solid #EBD9AE', borderRadius: 3 }}
    >
      <Clock size={15} strokeWidth={2} className="shrink-0" style={{ color: '#8A6A2E' }} />
      <p className="font-sans text-[13px] leading-none" style={{ color: '#6B5220' }}>
        Your order is reserved for the next{' '}
        <span className="font-semibold tabular-nums tracking-[0.04em]">{mm}:{ss}</span>
      </p>
    </div>
  )
}
