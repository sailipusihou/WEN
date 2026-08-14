import { headers } from 'next/headers'
import { getRepository } from '@/lib/repository'
import HomeClient from '@/components/layout/HomeClient'
import { getSiteBaseUrl } from '@/lib/site-url'

export const metadata = {
  title: 'Low Flame | Contemporary Craftsmanship',
  description: 'Discover handcrafted ceramics, silk, bamboo, incense, and artisan objects that honor Chinese tradition and elevate everyday life.',
}

// 首页禁用静态缓存 / 客户端 router cache — 商品价格变更后立刻反映
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  await headers()
  const repo = getRepository()
  const settings = repo.settings.get()
  const allActive = repo.products.listActive()
  let featuredProducts = allActive.filter(p => p.featured)

  if (settings.featuredProductIds?.length > 0) {
    const selected = allActive.filter(p => settings.featuredProductIds.includes(p.id))
    if (selected.length > 0) featuredProducts = selected
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName || 'Low Flame',
    description: 'Low Flame — handcrafted objects with quiet character.',
    url: getSiteBaseUrl(),
    logo: '/images/low-flame-logo.png',
    email: settings.footerEmail || 'hello@lowflame.com',
    telephone: settings.footerPhone,
    address: settings.footerAddress ? {
      '@type': 'PostalAddress',
      streetAddress: settings.footerAddress,
    } : undefined,
    sameAs: [
      settings.socialFacebook,
      settings.socialInstagram,
      settings.socialX,
      settings.socialYoutube,
    ].filter(Boolean),
  }

  const productLd = featuredProducts.slice(0, 6).map(p => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nameEn || p.name,
    description: p.subtitleEn || p.subtitle,
    image: p.image,
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: settings.currency || 'USD',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: p.rating || 4.8,
      reviewCount: p.reviewCount || 0,
    },
  }))

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {productLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      <HomeClient featuredProducts={featuredProducts} heroBgImage={settings.heroBackgroundImage} />
    </>
  )
}
