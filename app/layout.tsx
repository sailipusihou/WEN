import type { Metadata, Viewport } from "next"
// 自托管字体（避免构建时依赖 fonts.gstatic.com，服务器在部分网络环境下无法访问 Google Fonts）
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/500.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/400-italic.css'
import '@fontsource/playfair-display/600-italic.css'
import { CartProvider } from "@/context/CartContext"
import { CurrencyProvider } from "@/context/CurrencyContext"
import { ToastProvider } from "@/context/ToastContext"
import { WishlistProvider } from "@/context/WishlistContext"
import FrontendLayout from "@/components/layout/FrontendLayout"
import { WebVitals } from "@/components/WebVitals"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "Low Flame | Longquan Celadon", template: "%s | Low Flame" },
  description: "Hand-thrown Longquan celadon — tea sets, cups and dinnerware, made in the hills where the tradition began. Listed by UNESCO as Intangible Cultural Heritage. Worldwide shipping.",
  keywords: ["longquan celadon", "celadon tea set", "celadon cups", "celadon dinnerware", "handmade ceramics", "Chinese ceramics", "tea ceremony", "gift set", "cultural heritage", "handcrafted tableware"],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Low Flame | Longquan Celadon",
    description: "Hand-thrown Longquan celadon, fired in the tradition's home — tea sets, cups and dinnerware.",
    type: "website", locale: "en_US", siteName: "Low Flame",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#2A2118" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* favicon 用方形应用图标（米色圆角底 + 金色 logo），不要用竖版 logo ——
            176×239 的竖版图在 16×16 的标签页里细线条会糊成一团 */}
        <link rel="icon" type="image/png" sizes="512x512" href="/images/low-flame-icon.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/images/low-flame-icon.png" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("admin_theme");if(t==="light")document.documentElement.setAttribute("data-admin-theme","light");else if(t==="dark")document.documentElement.setAttribute("data-admin-theme","dark");}catch(e){}})()`
        }} />
      </head>
      <body className="antialiased">
        <WebVitals />
        <CurrencyProvider>
          <CartProvider>
            {/* 收藏状态必须嵌在 CartProvider 内 —— 它复用 CartContext 已经探过的登录态，
                不重复请求 /api/auth/user */}
            <WishlistProvider>
              <ToastProvider>
                <FrontendLayout>{children}</FrontendLayout>
              </ToastProvider>
            </WishlistProvider>
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  )
}
