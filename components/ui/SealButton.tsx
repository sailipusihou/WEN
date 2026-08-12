'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface SealButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'outline' | 'dark'
  className?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit'
}

export default function SealButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className = '',
  size = 'md',
  disabled = false,
  type = 'button',
}: SealButtonProps) {
  const baseClasses = {
    primary:
      'bg-seal-red text-xuan-white border-seal-red shadow-seal hover:bg-zhu-red-dark hover:border-zhu-red-dark',
    outline:
      'bg-transparent text-seal-red border-seal-red hover:bg-seal-red hover:text-xuan-white',
    dark: 'bg-mo-black text-xuan-white border-mo-black hover:bg-ink-gray',
  }

  const sizeClasses = {
    sm: 'px-5 py-2 text-sm tracking-wide',
    md: 'px-8 py-3 text-base tracking-widest',
    lg: 'px-12 py-4 text-lg tracking-[0.15em]',
  }

  const buttonClasses = `
    relative inline-flex items-center justify-center
    font-serif border-2
    transition-all duration-300 ease-out
    select-none cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
    ${sizeClasses[size]}
    ${baseClasses[variant]}
    ${className}
  `

  const sealClipPath = {
    clipPath:
      'polygon(8px 0%, calc(100% - 8px) 0%, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0% calc(100% - 8px), 0% 8px)',
  }

  const content = (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={sealClipPath}
      className={buttonClasses}
    >
      {children}
    </motion.div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return (
    <button onClick={onClick} disabled={disabled} type={type}>
      {content}
    </button>
  )
}
