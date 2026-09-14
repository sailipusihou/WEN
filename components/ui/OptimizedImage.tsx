'use client'

import { useState } from 'react'
import Image from 'next/image'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  style?: React.CSSProperties
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  priority?: boolean
  sizes?: string
  quality?: number
  unoptimized?: boolean
  onLoad?: () => void
  onError?: () => void
  placeholder?: 'blur' | 'empty'
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  style = {},
  objectFit = 'cover',
  priority = false,
  sizes,
  quality = 75,
  unoptimized = false,
  onLoad,
  onError,
  placeholder = 'blur',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const isRemote = src.startsWith('http://') || src.startsWith('https://')
  const isLocal = src.startsWith('/') && !src.startsWith('/api/')

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
    onError?.()
  }

  // ---------------------------------------------------------------------------
  // fill 模式的定位规则（2026-09 修复）
  //
  // 历史 bug：这里无条件拼上 `relative`。Tailwind 生成的 CSS 里 .relative 排在
  // .absolute 之后，所以调用方传进来的 `absolute inset-0` 被 .relative 直接盖掉，
  // 容器退化成「position:relative + 唯一子元素是绝对定位」→ 高度 0，
  // 于是 <Image fill> 被压成 h=0，商品图永远看不见，只露出底下的暖色面板。
  // 站内 20 个 fill 调用点全部中招（商品列表、PDP 主图与缩略图、分类卡、
  // 购物车缩略图、后台、搜索框、link-in-bio 等）。
  //
  // 现在的规则：
  //   1. 调用方自带 absolute/fixed/sticky → 完全尊重，不再强塞 relative；
  //   2. fill 且调用方没给尺寸 → 用 Next.js 官方推荐的 `absolute inset-0` 撑满父容器
  //      （站内所有父容器都是 relative/absolute，已逐个核对）；
  //   3. 其余情况维持原来的 relative。
  // ---------------------------------------------------------------------------
  const callerPositioned = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className)
  const callerSized = /(^|\s)(w-|h-|size-|aspect-|inset-)/.test(className)
  const positionClass = callerPositioned
    ? ''
    : (fill && !callerSized ? 'absolute inset-0' : 'relative')

  if (hasError || !src) {
    return (
      <div
        className={`${positionClass} bg-[#F7F0DE] flex items-center justify-center ${className}`.trim()}
        style={style}
      >
        <svg
          className="w-8 h-8 text-[#5F7D72]/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  const imgStyle: React.CSSProperties = {
    objectFit,
    opacity: isLoading ? 0 : 1,
    transition: 'opacity 0.4s ease',
  }

  return (
    <div className={`${positionClass} overflow-hidden ${className}`.trim()} style={style}>
      {isLoading && placeholder === 'blur' && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#F7F0DE] via-[#EDE3D2] to-[#F7F0DE] bg-[length:200%_100%] animate-pulse" />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        className="w-full h-full"
        style={imgStyle}
        priority={priority}
        sizes={sizes}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        unoptimized={unoptimized || isRemote || (!isRemote && !isLocal)}
      />
    </div>
  )
}
