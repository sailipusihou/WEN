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
import FrontendLayout from "@/components/layout/FrontendLayout"
import { WebVitals } from "@/components/WebVitals"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "Low Flame | Contemporary Craftsmanship", template: "%s | Low Flame" },
  description: "Discover handcrafted ceramics, silk, bamboo, incense, and artisan objects that honor Chinese tradition and elevate everyday life. Worldwide shipping.",
  keywords: ["contemporary craftsmanship", "modern Chinese design", "artisan objects", "celadon porcelain", "silk embroidery", "bamboo craft", "tea ceremony", "home decor", "cultural heritage", "Chinese aesthetics", "Asian aesthetics", "luxury homeware"],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Low Flame | Contemporary Craftsmanship",
    description: "Ceramics, silk, bamboo, incense and artisan objects that carry stories, culture and emotional value.",
    type: "website", locale: "en_US", siteName: "Low Flame",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#2D2F33" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/low-flame-logo.png" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("admin_theme");if(t==="light")document.documentElement.setAttribute("data-admin-theme","light");else if(t==="dark")document.documentElement.setAttribute("data-admin-theme","dark");}catch(e){}})()`
        }} />
      </head>
      <body className="antialiased">
        <WebVitals />
        <CurrencyProvider>
          <CartProvider>
            <ToastProvider>
              <FrontendLayout>{children}</FrontendLayout>
            </ToastProvider>
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  )
}
