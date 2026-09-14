"use client"
import { usePathname } from "next/navigation"
import TopBar from "@/components/layout/TopBar"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import ChatWidget from "@/components/chat/ChatWidget"
import GlobalCartBar from "@/components/layout/GlobalCartBar"

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin")
  const isHome = pathname === "/"
  if (isAdmin) return <>{children}</>
  return (
    <div className="flex min-h-screen flex-col bg-paper-light text-ink antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:bg-[#FFFFFF] focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow-soft"
      >
        Skip to content
      </a>
      {!isHome && <TopBar />}
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
      {/* 全站底部购物车条：购物车非空时在所有前台页面常驻（可手动关闭） */}
      <GlobalCartBar />
      <ChatWidget />
    </div>
  )
}
