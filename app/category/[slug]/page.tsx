import { getRepository } from '@/lib/repository'
import CategoryClient from '@/components/product/CategoryClient'
import { CATEGORY_PAGE_SIZE } from '@/lib/pagination'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteBaseUrl } from '@/lib/site-url'
import { toPublicProducts } from '@/lib/public-product'

// 修复 M11: 与 /products 一致强制动态渲染, 促销/价格变更后分类页即时刷新
export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const repo = getRepository()
  const category = repo.categories.getBySlug(slug)

  if (!category) {
    // 必须在这里（generateMetadata）调 notFound()，而不是只在页面组件里。
    // 本路由有 app/category/loading.tsx —— 它形成 Suspense 边界，Next 会先把
    // loading 壳以 200 流出去，页面组件里再调 notFound() 时状态码已经锁定成 200，
    // 就变成"内容是对的 404 页、状态码却是 200"的软 404。
    // generateMetadata 在响应流出前完成，所以只有在这里抛才能真正返回 404。
    notFound()
  }

  const title = `${category.nameEn || category.name} | Low Flame`
  const description = category.descriptionEn || category.description || `Explore our collection of ${category.nameEn || category.name} products`
  const image = category.image

  return {
    title,
    description,
    keywords: [
      category.nameEn || category.name,
      'handcrafted art',
      'handcrafted',
      category.slug,
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${getSiteBaseUrl()}/category/${slug}`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: category.nameEn || category.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
    alternates: {
      canonical: `/category/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  const repo = getRepository()
  const categories = repo.categories.list()
  return categories.map(c => ({ slug: c.slug }))
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const repo = getRepository()
  const category = repo.categories.getBySlug(slug) || null
  // 分类不存在就返回真正的 404 状态码。
  // 此前是渲染 "Collection not found" 但状态码 200（软 404），
  // 结果失效分类 URL 会被搜索引擎当成有效页收录，白白消耗抓取预算。
  if (!category) notFound()
  const categoryProducts = toPublicProducts(repo.products.getByCategory(slug))

  /**
   * 首屏只放一屏（全量会把 HTML 撑到 880KB），其余由「Load more」去接口取。
   *
   * ⚠️ 排序必须和 /api/products 的默认排序**完全一致**（精选优先，同档保持原序），
   *    否则首屏与接口返回的第 1 页对不上 —— 表现为「Load more 加载 24 件、
   *    实际只多出 16 件」，因为重复的会被按 id 去重掉，越点越对不上。
   *    JS 的 sort 是稳定的，所以同 featured 值内部仍保持数据库顺序。
   */
  const ordered = [...categoryProducts].sort((a, b) => Number(b.featured) - Number(a.featured))

  return (
    <CategoryClient
      category={category}
      products={ordered.slice(0, CATEGORY_PAGE_SIZE)}
      totalCount={ordered.length}
    />
  )
}
