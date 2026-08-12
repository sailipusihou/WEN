'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 开发环境输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`)
    }

    // 生产 + 开发都上报到 API, 便于聚合分析
    if (typeof window !== 'undefined') {
      const payload = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        page: window.location.pathname,
        timestamp: Date.now(),
      }
      const body = JSON.stringify(payload)
      try {
        // 优先使用 sendBeacon, 保证页面卸载时不丢数据
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' })
          navigator.sendBeacon('/api/web-vitals', blob)
        } else {
          fetch('/api/web-vitals', {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          }).catch(() => {})
        }
      } catch {}
    }
  })

  return null
}
