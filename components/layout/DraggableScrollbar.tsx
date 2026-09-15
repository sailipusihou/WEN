'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 可拖拽的自定义滚动条（全站右侧）。
 *
 * 需求：不是"进度指示"，是能**拖动**的条 —— 拖着它就能滚页面。
 *
 * 行为：
 *   - 轨道常驻视口右侧；滑块高度按「视口高 / 内容高」比例算，最短 44px
 *   - 拖滑块 → 页面跟着滚（pointer 事件，鼠标和触屏都支持）
 *   - 点轨道空白处 → 跳到那个位置
 *   - 页面滚不动（内容不足一屏）时整块不渲染
 *   - 拖动时给滑块加高亮，并禁止选中文本
 *   - 尊重 prefers-reduced-motion
 *
 * 为什么不直接用浏览器原生滚动条：
 *   原生滚动条样式在各浏览器差异极大（Chrome 能用 ::-webkit-scrollbar 定制，
 *   Firefox 只能 scrollbar-color），做不出统一观感，也没法加拖拽高亮等反馈。
 */
export default function DraggableScrollbar() {
  const [visible, setVisible] = useState(false)
  const [thumb, setThumb] = useState({ top: 0, height: 44 })
  const trackRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef<{ startY: number; startScroll: number } | null>(null)

  /** 重新计算滑块位置与高度 */
  const measure = useCallback(() => {
    const doc = document.documentElement
    const viewportH = window.innerHeight
    const contentH = doc.scrollHeight
    const scrollable = contentH - viewportH

    if (scrollable <= 40) {
      setVisible(false)
      return
    }
    setVisible(true)

    const trackH = viewportH - 32 // 上下各留 16px
    const thumbH = Math.max(44, Math.round(trackH * (viewportH / contentH)))
    const maxTop = trackH - thumbH
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollable))

    setThumb({ top: Math.round(progress * maxTop), height: thumbH })
  }, [])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (draggingRef.current) return // 拖动中由 pointermove 驱动，避免互相打架
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; measure() })
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    /**
     * ⚠️ 只监听 scroll/resize 不够。
     * 组件挂载时页面内容往往还没加载完（图片、支付按钮、优惠码区都是异步出来的），
     * 这时 scrollHeight ≈ 视口高 → 判定"不足一屏" → 不渲染；
     * 之后内容变长并不会触发 scroll 或 resize，滚动条就永远不出现。
     * 实测：结算页就是这个情况（商品列表页内容多所以正常）。
     * 用 ResizeObserver 盯住 body 高度，内容一变就重新测量。
     */
    let ro: ResizeObserver | null = null
    try {
      ro = new ResizeObserver(() => measure())
      ro.observe(document.body)
      if (document.documentElement) ro.observe(document.documentElement)
    } catch { /* 老浏览器没有 ResizeObserver 就退化成下面的定时补测 */ }

    // 兜底：前 6 秒内每秒补测一次，覆盖异步内容渲染
    let ticks = 0
    const timer = setInterval(() => {
      ticks++
      measure()
      if (ticks >= 6) clearInterval(timer)
    }, 1000)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
      clearInterval(timer)
      try { ro?.disconnect() } catch { /* ignore */ }
    }
  }, [measure])

  /** 用「滑块位置」反推页面该滚到哪 */
  const scrollToThumbTop = (top: number) => {
    const doc = document.documentElement
    const viewportH = window.innerHeight
    const trackH = viewportH - 32
    const maxTop = Math.max(1, trackH - thumb.height)
    const ratio = Math.min(1, Math.max(0, top / maxTop))
    window.scrollTo({ top: ratio * (doc.scrollHeight - viewportH) })
  }

  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    draggingRef.current = { startY: e.clientY, startScroll: window.scrollY }
    document.body.style.userSelect = 'none'
  }

  const onThumbPointerMove = (e: React.PointerEvent) => {
    const d = draggingRef.current
    if (!d) return
    e.preventDefault()
    const doc = document.documentElement
    const viewportH = window.innerHeight
    const trackH = viewportH - 32
    const maxTop = Math.max(1, trackH - thumb.height)
    // 滑块位移 → 页面位移（按比例放大）
    const pageDelta = ((e.clientY - d.startY) / maxTop) * (doc.scrollHeight - viewportH)
    window.scrollTo({ top: d.startScroll + pageDelta })
  }

  const onThumbPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    draggingRef.current = null
    document.body.style.userSelect = ''
    measure()
  }

  /** 点轨道空白：直接跳到该位置 */
  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (e.target !== trackRef.current) return
    const rect = (trackRef.current as HTMLDivElement).getBoundingClientRect()
    scrollToThumbTop(e.clientY - rect.top - thumb.height / 2)
    measure()
  }

  if (!visible) return null

  return (
    <div
      ref={trackRef}
      data-drag-scrollbar="1"
      onPointerDown={onTrackPointerDown}
      className="fixed right-0 top-4 z-[70] hidden sm:block"
      style={{
        width: 14,
        height: 'calc(100vh - 2rem)',
        backgroundColor: 'rgba(74,58,36,0.06)',
        borderRadius: 7,
        touchAction: 'none',
      }}
      aria-hidden="true"
    >
      <div
        data-drag-scrollbar-thumb="1"
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={onThumbPointerUp}
        onPointerCancel={onThumbPointerUp}
        style={{
          position: 'absolute',
          right: 2,
          width: 10,
          top: thumb.top,
          height: thumb.height,
          borderRadius: 5,
          background: 'linear-gradient(180deg, #C4A059 0%, #8A6A2E 100%)',
          boxShadow: '0 1px 4px rgba(74,58,36,0.35)',
          cursor: 'grab',
          touchAction: 'none',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg, #D4B068 0%, #9A7838 100%)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg, #C4A059 0%, #8A6A2E 100%)' }}
        title="拖动滚动"
      />
    </div>
  )
}
