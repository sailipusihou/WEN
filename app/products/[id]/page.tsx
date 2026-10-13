import { getRepository } from '@/lib/repository'
import ProductDetailClient from '@/components/product/ProductDetailClient'
import { toPublicProduct, toPublicProducts } from '@/lib/public-product'
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

  /**
   * 商品不存在时这里返回"Not Found"标题，由页面本体的 notFound() 渲染 404 页。
   *
   * ⚠️ 实测过：状态码仍是 **200**（软 404）。根因是这一段的 loading.tsx 造成流式渲染，
   *    响应头在 notFound() 抛出之前就发出去了 —— 在 generateMetadata 里抛也一样没用。
   *    要拿到真 404 只能去掉 loading.tsx，但那样每次跳转都没有加载反馈。
   *    **这里选择保留加载提示**：软 404 只影响不存在的商品 id，站内没有任何链接指向
   *    这类地址、sitemap 里也全是有效地址，搜索引擎基本碰不到；而加载反馈影响每一次
   *    真实跳转（客户多在境外，链路慢）。详见交接文档。
   */
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

  // WhatsApp 咨询入口 —— 从后台设置读，没填号码时组件里不会渲染按钮
  const s: any = repo.settings.get() || {}

  // 分享栏的初始地址由服务端给出 —— 这样分享按钮会出现在首屏 HTML 里，
  // 而不是等客户端水合后才冒出来。客户端挂载后会覆盖它，以便带上 ?ref= 推广参数。
  return (
    <ProductDetailClient
      product={toPublicProduct(product)}
      reviews={reviews}
      giftProducts={toPublicProducts(giftProducts)}
      productUrl={`${getSiteBaseUrl()}/products/${id}`}
      whatsappNumber={s.whatsappNumber || ''}
      whatsappGreeting={s.whatsappGreeting || ''}
    />
  )
}
