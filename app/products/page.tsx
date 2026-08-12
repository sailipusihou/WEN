import { getRepository } from '@/lib/repository'
import AllProductsClient from './AllProductsClient'
import type { Metadata } from 'next'

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

export default async function AllProductsPage() {
  const repo = getRepository()
  const products = repo.products.listActive()
  return <AllProductsClient products={products} />
}
