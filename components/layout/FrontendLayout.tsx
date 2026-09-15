"use client"
import { usePathname } from "next/navigation"
import TopBar from "@/components/layout/TopBar"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import ChatWidget from "@/components/chat/ChatWidget"
import GlobalCartBar from "@/components/layout/GlobalCartBar"
import CheckoutTopBar from "@/components/layout/CheckoutTopBar"
import ScrollProgressRail from "@/components/layout/ScrollProgressRail"

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin")
  const isHome = pathname === "/"
  /**
   * 无干扰结算：结算页与购物车页去掉顶部导航（TopBar + Header）和页脚。
   *
   * 参考站（Shopline 模板）结算页顶部只有一行纯文字站名，没有任何导航 —— 这是
   * 独立站的标准做法：任何可点的链接都是弃单出口。实测参考站结算页
   * nginx/DOM 里确实没有导航栏，只有 back to store 之类的弱入口。
   * 同时保留「返回购物车」这类页内返回，避免客户被困住。
   */
  const isCheckoutFlow = pathname === "/checkout" || pathname === "/cart"
  if (isAdmin) return <>{children}</>
  return (
    <div className="flex min-h-screen flex-col bg-paper-light text-ink antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:bg-[#FFFFFF] focus:px-4 focus:py-2 focus:text-sm focus:text-ink focus:shadow-soft"
      >
        Skip to content
      </a>
      {!isHome && !isCheckoutFlow && <TopBar />}
      {!isCheckoutFlow && <Header />}
      {isCheckoutFlow && (
        // 结算流程专用的极简顶栏：只有站名 + 返回购物车/安全标识，不放任何导航
        <CheckoutTopBar isCart={pathname === "/cart"} />
      )}
      <main id="main-content" className="flex-1">{children}</main>
      {!isCheckoutFlow && <Footer />}
      {/* 全站底部购物车条：购物车非空时在所有前台页面常驻（可手动关闭） */}
      <GlobalCartBar />
      <ChatWidget />
      {/* 右侧滑动进度栏：所有前台页面都有 */}
      <ScrollProgressRail />
    </div>
  )
}
