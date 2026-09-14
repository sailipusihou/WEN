'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function TopBar() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const d = localStorage.getItem('otm_topbar_dismissed')
    if (d) setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div className="relative z-40 bg-[#221E1A]/80 backdrop-blur-md text-white/76 text-[11px] py-1.5 px-4 font-sans tracking-[0.12em] uppercase">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p>
          <span className="text-[#5F7D72]">◈</span>
          {' '}Handcrafted in small batches · Shipped worldwide
        </p>
        <button
          onClick={() => { setVisible(false); localStorage.setItem('otm_topbar_dismissed', 'true') }}
          className="text-white/20 hover:text-white/72 transition-colors"
          aria-label="Dismiss"
        >
          <X size={10} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
