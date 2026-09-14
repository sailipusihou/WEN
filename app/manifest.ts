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
    theme_color: '#221E1A',
    orientation: 'portrait-primary',
    categories: ['shopping', 'lifestyle'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    shortcuts: [
      {
        name: 'Browse Products',
        short_name: 'Products',
        description: 'View all products',
        url: '/products',
        icons: [{ src: '/images/low-flame-logo.png', sizes: '249x249', type: 'image/png' }],
      },
      {
        name: 'Search',
        short_name: 'Search',
        description: 'Search products',
        url: '/search',
        icons: [{ src: '/images/low-flame-logo.png', sizes: '249x249', type: 'image/png' }],
      },
      {
        name: 'Cart',
        short_name: 'Cart',
        description: 'View your shopping cart',
        url: '/cart',
        icons: [{ src: '/images/low-flame-logo.png', sizes: '249x249', type: 'image/png' }],
      },
    ],
    icons: [
      {
        src: '/images/low-flame-logo.png',
        sizes: '249x249',
        type: 'image/png',
      },
    ],
  }
}
