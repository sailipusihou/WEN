import { getRepository } from '@/lib/repository'
import ProductDetailClient from '@/components/product/ProductDetailClient'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { convertPrice, formatPrice } from '@/lib/cart-types'
import { getSiteBaseUrl } from '@/lib/site-url'

// 商品详情页禁用静态缓存 / 客户端 router cache — 改价后立刻反映最新数据
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const repo = getRepository()
  const product = repo.products.getById(id)

  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The product you are looking for does not exist.',
    }
  }

  const title = `${product.nameEn || product.name} | Low Flame`
  const description = product.subtitleEn || product.subtitle || product.descriptionEn || product.description || 'Handcrafted artwork'
  const image = product.image
  // 修复 M7: 价格换算为 USD 展示口径 (数据库为 CNY 原值)
  const price = product.price ? formatPrice(convertPrice(product.price, 'USD'), 'USD') : ''

  return {
    title,
    description,
    keywords: [
      product.nameEn || product.name,
      product.category,
      product.craftEn || product.craft || '',
      product.material || '',
      product.origin || '',
      'handcrafted art',
      'handcrafted',
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${getSiteBaseUrl()}/products/${id}`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: product.nameEn || product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
    alternates: {
      canonical: `/products/${id}`,
    },
    other: {
      'product:price:amount': product.price ? String(convertPrice(product.price, 'USD')) : '',
      'product:price:currency': 'USD',
      'product:availability': product.active !== false ? 'instock' : 'outofstock',
      'product:brand': 'Low Flame',
      'product:category': product.category || '',
      'product:condition': 'new',
    },
  }
}

export async function generateStaticParams() {
  const repo = getRepository()
  const products = repo.products.list()
  return products.map(p => ({ id: p.id }))
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const repo = getRepository()
  const product = repo.products.getById(id) || null

  // 修复: 商品不存在返回 404 (原先返回 200 + 客户端 "Piece not found")
  if (!product) notFound()

  const reviews = repo.reviews.getByProduct(id).filter(r => r.approved && !r.hidden && !r.deleted)

  /**
   * 赠品绑定：直接在这里把赠品商品取好传给客户端组件，
   * 避免前台为了渲染赠品区再打一次 /api/products。
   *
   * ⚠️ 只按 active 过滤，**不看 listingVisible**。
   *    赠品商品常常是"只在主商品编辑页里存在、不在商店列表露出"的，
   *    如果这里也要求 listingVisible，那些隐藏赠品就会被过滤掉、前台不显示。
   *    历史上这里写的是 .filter(p => p.active)，用的是 active 判断；
   *    active 依然是唯一门槛（下架商品不能当赠品），listingVisible 与赠品无关。
   */
  const giftProducts = (product.giftProductIds || [])
    .map((gid: string) => repo.products.getById(gid))
    .filter((p: any) => p && p.active !== false)

  return <ProductDetailClient product={product} reviews={reviews} giftProducts={giftProducts} />
}
