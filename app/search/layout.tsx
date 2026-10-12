import { Suspense } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search our Longquan celadon collection — tea sets, cups, dinnerware and travel sets.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/search' },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[#FBFAF7]" />}>{children}</Suspense>
}
