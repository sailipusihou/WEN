"use client"
import { useState, useEffect } from "react"

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const ballCount = 20

  useEffect(() => {
    const content = document.querySelector('.adm-content .overflow-y-auto') as HTMLDivElement
    if (!content) return

    const updateProgress = () => {
      const scrollTop = content.scrollTop
      const scrollHeight = content.scrollHeight - content.clientHeight
      const percentage = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, percentage)))
    }

    content.addEventListener('scroll', updateProgress)
    updateProgress()

    return () => content.removeEventListener('scroll', updateProgress)
  }, [])

  const handleClick = (index: number) => {
    const content = document.querySelector('.adm-content .overflow-y-auto') as HTMLDivElement
    if (!content) return

    const targetProgress = (index + 0.5) / ballCount * 100
    const scrollHeight = content.scrollHeight - content.clientHeight
    content.scrollTo({
      top: (targetProgress / 100) * scrollHeight,
      behavior: 'smooth'
    })
  }

  const getBallStyle = (index: number) => {
    const ballProgress = (index + 0.5) / ballCount * 100
    const isCurrent = Math.abs(ballProgress - progress) < (100 / ballCount)
    const isPast = ballProgress <= progress
    const isHovered = hoveredIndex === index

    if (isHovered) {
      return {
        backgroundColor: 'var(--adm-accent)',
        boxShadow: '0 0 16px var(--adm-accent)',
        transform: 'scale(1.5)',
        zIndex: 10
      }
    }

    if (isCurrent) {
      return {
        backgroundColor: 'var(--adm-accent)',
        boxShadow: '0 0 8px var(--adm-accent)',
        transform: 'scale(1.3)',
        zIndex: 5
      }
    }

    if (isPast) {
      return {
        backgroundColor: 'var(--adm-border)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        transform: 'scale(1)',
        zIndex: 1
      }
    }

    return {
      backgroundColor: 'transparent',
      border: '1px solid var(--adm-border)',
      opacity: 0.4,
      transform: 'scale(0.8)',
      zIndex: 1
    }
  }

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 select-none flex flex-col gap-2">
      {Array.from({ length: ballCount }).map((_, index) => (
        <div
          key={index}
          className="w-2 h-2 rounded-full transition-all duration-200 cursor-pointer"
          style={getBallStyle(index)}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => handleClick(index)}
        />
      ))}
    </div>
  )
}