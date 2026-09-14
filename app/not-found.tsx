import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-sans text-xs text-[#5F7D72] tracking-[0.2em] uppercase mb-4">Error 404</p>
        <h1 className="font-en text-5xl md:text-6xl text-[#221E1A] font-medium mb-4">
          Page Not Found
        </h1>
        <p className="font-sans text-sm text-[#57503F]/60 leading-relaxed mb-8">
          The page you are looking for may have been moved, deleted, or never existed.
          Let us guide you back to something beautiful.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#221E1A] text-white text-sm tracking-wide hover:bg-[#5F7D72] transition-colors duration-300"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
