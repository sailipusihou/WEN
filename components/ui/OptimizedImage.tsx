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

  if (hasError || !src) {
    return (
      <div
        className={`bg-[#F7F0DE] flex items-center justify-center ${className}`}
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
    <div className={`relative overflow-hidden ${className}`} style={style}>
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
