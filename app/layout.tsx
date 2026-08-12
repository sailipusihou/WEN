import type { Metadata, Viewport } from "next"
import { Playfair_Display, Inter, Noto_Serif_SC, Noto_Sans_SC } from 'next/font/google'
import { CartProvider } from "@/context/CartContext"
import { CurrencyProvider } from "@/context/CurrencyContext"
import { ToastProvider } from "@/context/ToastContext"
import FrontendLayout from "@/components/layout/FrontendLayout"
import { WebVitals } from "@/components/WebVitals"
import "./globals.css"

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
})

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
})

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
    <html lang="en" suppressHydrationWarning className={`${playfair.variable} ${inter.variable} ${notoSerifSC.variable} ${notoSansSC.variable}`}>
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
