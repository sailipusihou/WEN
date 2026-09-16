import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Low Flame',
    short_name: 'Low Flame',
    description: 'Low Flame — handcrafted objects with quiet character.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#ffffff',
    theme_color: '#2A2118',
    orientation: 'portrait-primary',
    categories: ['shopping', 'lifestyle'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    /**
     * 必须用方形应用图标（米色圆角底 + 金色 logo），不要用竖版 logo 本身 ——
     * logo 是 176×239 的竖版，直接当 PWA 图标在桌面上会被压得看不清。
     */
    icons: [
      { src: '/images/low-flame-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/images/low-flame-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/images/low-flame-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Browse Products',
        short_name: 'Products',
        description: 'View all products',
        url: '/products',
        icons: [{ src: '/images/low-flame-icon.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Search',
        short_name: 'Search',
        description: 'Search products',
        url: '/search',
        icons: [{ src: '/images/low-flame-icon.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Cart',
        short_name: 'Cart',
        description: 'View your shopping cart',
        url: '/cart',
        icons: [{ src: '/images/low-flame-icon.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  }
}
