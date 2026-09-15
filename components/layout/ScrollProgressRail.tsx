'use client'

import { useEffect, useState } from 'react'

/**
 * 全站右侧滑动进度栏。
 *
 * 需求：无论哪个前台页面，右侧都有一条竖着的阅读进度指示。
 * 做法：固定在视口右侧（position: fixed），高度 = 当前滚动进度百分比。
 *
 * 几个细节：
 *   - 用 requestAnimationFrame 节流，滚动时不掉帧
 *   - 页面高度不足一屏时不显示（没什么可滚的）
 *   - 尊重 prefers-reduced-motion：不做平滑过渡动画
 *   - 结算/购物车页也显示（用户要求"全网页界面"）
 */
export default function ScrollProgressRail() {
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState(false)

  useEffect(() => {
    let raf = 0

    const compute = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      if (scrollable <= 40) {
        setActive(false)
        setProgress(0)
        return
      }
      setActive(true)
      const p = Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100))
      setProgress(p)
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        compute()
      })
    }

    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  if (!active) return null

  return (
    <>
      {/* 轨道 */}
      <div
        aria-hidden="true"
        data-scroll-rail="1"
        className="fixed right-0 top-0 bottom-0 z-[60] pointer-events-none hidden sm:block"
        style={{ width: 3, backgroundColor: 'rgba(74,58,36,0.07)' }}
      />
      {/* 进度 */}
      <div
        aria-hidden="true"
        data-scroll-rail-progress="1"
        className="fixed right-0 top-0 z-[61] pointer-events-none hidden sm:block"
        style={{
          width: 3,
          height: `${progress}%`,
          backgroundColor: '#8A6A2E',
          transition: 'height 0.08s linear',
        }}
      />
      {/* 右下角百分比：滚动时才出现，给一个明确的"读到哪了"锚点 */}
      <div
        aria-hidden="true"
        data-scroll-percent="1"
        className="fixed z-[61] pointer-events-none hidden lg:flex items-center justify-center font-sans text-[10px] font-semibold"
        style={{
          right: 12,
          bottom: 18,
          width: 34,
          height: 34,
          borderRadius: '50%',
          color: '#8A6A2E',
          backgroundColor: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(138,106,46,0.35)',
          boxShadow: '0 2px 10px -4px rgba(74,58,36,0.35)',
        }}
      >
        {Math.round(progress)}%
      </div>
    </>
  )
}
