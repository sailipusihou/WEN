"use client"
import { usePathname } from "next/navigation"
import TopBar from "@/components/layout/TopBar"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import ChatWidget from "@/components/chat/ChatWidget"

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin")
  const isHome = pathname === "/"
  // 商品详情页（/products/xxx）不显示全站页脚：
  // 详情页以「← Back to Collection」收尾，下面再跟一整片页脚会显得冗余，
  // 也避免用户滚到底后被页脚抢走注意力。/products 列表页仍然保留页脚。
  const isProductDetail = /^\/products\/[^/]+$/.test(pathname || "")
  if (isAdmin) return <>{children}</>
  return (
    <div className="flex min-h-screen flex-col bg-paper-light text-ink antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow-soft"
      >
        Skip to content
      </a>
      {!isHome && <TopBar />}
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      {!isProductDetail && <Footer />}
      <ChatWidget />
    </div>
  )
}
