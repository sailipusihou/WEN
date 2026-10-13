import { headers } from 'next/headers'
import { getRepository } from '@/lib/repository'
import HomeClient from '@/components/layout/HomeClient'
import { toPublicProducts } from '@/lib/public-product'
import { getHomepageSampleReviews } from '@/lib/sample-reviews'
import { getSiteBaseUrl } from '@/lib/site-url'
import { convertPrice } from '@/lib/cart-types'

export const metadata = {
  title: 'Low Flame | Longquan Celadon',
  description: 'Hand-thrown Longquan celadon — tea sets, cups and dinnerware, made in the hills where the tradition began. Listed by UNESCO as Intangible Cultural Heritage.',
}

// 首页禁用静态缓存 / 客户端 router cache — 商品价格变更后立刻反映
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  await headers()
  const repo = getRepository()
  const settings = repo.settings.get()
  const allActive = toPublicProducts(repo.products.listActive())
  let featuredProducts = allActive.filter(p => p.featured)

  if (settings.featuredProductIds?.length > 0) {
    const selected = allActive.filter(p => settings.featuredProductIds.includes(p.id))
    if (selected.length > 0) featuredProducts = selected
  }

  /**
   * Journal 每篇文章挂 3 件相关商品（按文章上标的 `tag` 匹配题材）。
   *
   * 为什么在服务端挑：首页是 SEO 重点页，商品缩略图要**出现在首屏 HTML 里**，
   * 而不是等客户端再拉一次接口。同一个 tag 只算一次，避免重复过滤。
   */
  const journalEntries: any[] = (settings.frontendContent as any)?.journal?.entries || []
  const journalProducts: Record<string, any[]> = {}
  for (const e of journalEntries) {
    const t = typeof e?.tag === 'string' ? e.tag.trim() : ''
    if (t && !journalProducts[t]) {
      journalProducts[t] = allActive.filter((p: any) => (p.tags || []).includes(t)).slice(0, 3)
    }
  }

  /**
   * 首页评价区数据。
   *
   * 真实评价优先 —— 只取已审核、未隐藏、未删除的（与商品详情页同一口径）。
   * 一条都没有时才回退到开发模式的示例评价，且每条都带 isSample 标记，
   * 渲染时会显示可见的 SAMPLE 角标。生产构建下示例数据恒为空（见 lib/sample-reviews.ts
   * 的门禁说明），所以线上要么显示真实评价，要么整段不渲染。
   */
  const realReviews = repo.reviews.list()
    .filter(r => r.approved && !r.hidden && !r.deleted)
    .slice(0, 3)
    .map(r => ({
      id: r.id,
      productId: r.productId,
      author: r.author,
      avatar: r.avatar,
      rating: r.rating,
      date: r.date,
      content: r.content,
      location: r.location,
      isSample: false as const,
    }))
  const homepageReviews = realReviews.length > 0 ? realReviews : getHomepageSampleReviews(3)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName || 'Low Flame',
    description: 'Low Flame — handcrafted objects with quiet character.',
    url: getSiteBaseUrl(),
    logo: '/images/low-flame-logo.png',
    email: settings.footerEmail || 'hello@lowflame.store',
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

  const productLd = featuredProducts.slice(0, 6).map(p => {
    // 修复 M7: 价格用显示币种 (USD 换算值, 与结算/PayPal 口径一致); 无评分时不伪造评分
    const offers: any = {
      '@type': 'Offer',
      price: convertPrice(p.price, 'USD'),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    }
    if (p.originalPrice && p.originalPrice > p.price) {
      offers.priceValidUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    }
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.nameEn || p.name,
      description: p.subtitleEn || p.subtitle,
      image: p.image,
      offers,
      // 只有「确实有评价」且「分数有效」时才输出 aggregateRating。
      // 原来写的是 ratingValue: p.rating || 4.8 —— 那个 4.8 是编造的兜底值，
      // 会把「0 条评价」的商品包装成有评分提交给搜索引擎。加上 rating > 0 的判断，
      // 并去掉默认分，保证提交出去的每一个数字都来自真实评价。
      ...((p.reviewCount > 0 && p.rating > 0) ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: p.rating,
          reviewCount: p.reviewCount,
        },
      } : {}),
    }
  })

  // 安全: JSON-LD 值中含 </script> 时防止提前闭合注入
  const escapeJson = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\\u003c')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJson(jsonLd) }}
      />
      {productLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJson(ld) }}
        />
      ))}
      <HomeClient
        featuredProducts={featuredProducts}
        heroBgImage={settings.heroBackgroundImage}
        initialContent={settings.frontendContent || null}
        journalProducts={journalProducts}
        reviews={homepageReviews}
      />
    </>
  )
}
