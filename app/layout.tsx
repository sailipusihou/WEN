import type { Metadata, Viewport } from "next"
import Script from "next/script"
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
import { getRepository } from "@/lib/repository"
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /**
   * 站长验证与统计 ID 都存在后台设置里 —— 用户拿到值直接粘到后台即可，不用改代码。
   *
   * ⚠️ 两个值都要**先校验格式再输出**：它们会被拼进 HTML，
   *    不校验就等于给「设置被写坏」留了一条注入路径。
   */
  let siteVerification = ''
  let gaId = ''
  try {
    const s: any = getRepository().settings.get() || {}
    // GSC 的验证码是 base64url 风格的一长串
    const v = String(s.googleSiteVerification || '').trim()
    if (/^[A-Za-z0-9_-]{10,120}$/.test(v)) siteVerification = v
    // GA4 衡量 ID 形如 G-XXXXXXXXXX
    const g = String(s.gaMeasurementId || '').trim().toUpperCase()
    if (/^G-[A-Z0-9]{6,20}$/.test(g)) gaId = g
  } catch {
    // 设置读不到不影响页面渲染
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* favicon 用方形应用图标（米色圆角底 + 金色 logo），不要用竖版 logo ——
            176×239 的竖版图在 16×16 的标签页里细线条会糊成一团 */}
        <link rel="icon" type="image/png" sizes="512x512" href="/images/low-flame-icon.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/images/low-flame-icon.png" />
        {/* Google Search Console 验证 —— 填了才能在 GSC 后台看到展示/点击/关键词 */}
        {siteVerification && <meta name="google-site-verification" content={siteVerification} />}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("admin_theme");if(t==="light")document.documentElement.setAttribute("data-admin-theme","light");else if(t==="dark")document.documentElement.setAttribute("data-admin-theme","dark");}catch(e){}})()`
        }} />
      </head>
      <body className="antialiased">
        {/* GA4：后台没填衡量 ID 就完全不加载任何第三方脚本 */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga4-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
              }}
            />
          </>
        )}
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
