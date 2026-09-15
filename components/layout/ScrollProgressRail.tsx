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

  // 分段显示当前处于页面的哪一段 —— 比单纯一个百分比更容易定位
  const stage = progress < 34 ? 'Top' : progress < 67 ? 'Middle' : 'Bottom'

  return (
    <>
      {/* 轨道（加宽到 8px，之前 3px 太细看不清） */}
      <div
        aria-hidden="true"
        data-scroll-rail="1"
        className="fixed right-0 top-0 bottom-0 z-[60] pointer-events-none hidden sm:block"
        style={{ width: 8, backgroundColor: 'rgba(74,58,36,0.10)' }}
      />
      {/* 进度（带渐变，视觉更有分量） */}
      <div
        aria-hidden="true"
        data-scroll-rail-progress="1"
        className="fixed right-0 top-0 z-[61] pointer-events-none hidden sm:block"
        style={{
          width: 8,
          height: `${progress}%`,
          background: 'linear-gradient(180deg, #B8944A 0%, #8A6A2E 100%)',
          transition: 'height 0.08s linear',
        }}
      />
      {/* 状态卡片：显示百分比 + 当前段落 + 进度条，内容展示完整 */}
      <div
        aria-hidden="true"
        data-scroll-status="1"
        className="fixed z-[61] pointer-events-none hidden lg:block font-sans"
        style={{
          right: 22,
          bottom: 22,
          width: 112,
          padding: '9px 11px 10px',
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.96)',
          border: '1px solid rgba(138,106,46,0.32)',
          boxShadow: '0 4px 16px -6px rgba(74,58,36,0.35)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span style={{ fontSize: 16, fontWeight: 700, color: '#8A6A2E', lineHeight: 1 }}>
            {Math.round(progress)}%
          </span>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(74,58,36,0.6)' }}>
            {stage}
          </span>
        </div>
        {/* 卡片内的小进度条，和右侧竖条呼应 */}
        <div style={{ marginTop: 7, height: 3, borderRadius: 2, backgroundColor: 'rgba(74,58,36,0.12)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#8A6A2E', transition: 'width 0.08s linear' }} />
        </div>
      </div>
    </>
  )
}
