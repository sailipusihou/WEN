import { getRepository } from '@/lib/repository'
import AllProductsClient from './AllProductsClient'
import { toPublicProducts } from '@/lib/public-product'
import type { Metadata } from 'next'

// 商品列表页禁用静态缓存 / 客户端 router cache — 保证改价后看到最新数据
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'All Products',
  description: 'Browse our full collection of handcrafted handcrafted objects. Celadon, silk, bamboo, incense, and artisan objects that honor Chinese tradition and elevate everyday life.',
  keywords: ['handcrafted art', 'handcrafted', 'celadon', 'silk', 'bamboo', 'incense', 'tea ceremony', 'home decor', 'cultural gifts'],
  openGraph: {
    title: 'All Products | Low Flame',
    description: 'Browse our full collection of handcrafted handcrafted objects.',
    type: 'website',
    url: 'https://lowflame.com/products',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Products | Low Flame',
    description: 'Browse our full collection of handcrafted handcrafted objects.',
  },
  alternates: { canonical: '/products' },
}

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const sp = await searchParams
  const tag = typeof sp?.tag === 'string' ? sp.tag : ''
  const repo = getRepository()
  let products = toPublicProducts(repo.products.listActive())
  // ?tag=Cups 这类题材筛选 —— 页头 COLLECTIONS 下拉的卡片就指到这里
  if (tag) {
    products = products.filter(
      p => (p.tags || []).includes(tag) || ((p as any).tagsEn || []).includes(tag)
    )
  }
  return <AllProductsClient products={products} initialTag={tag} />
}
