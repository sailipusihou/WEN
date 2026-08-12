import { getRepository } from '@/lib/repository'
import ProductDetailClient from '@/components/product/ProductDetailClient'
import type { Metadata } from 'next'
import { formatPrice } from '@/lib/cart-types'
import { getSiteBaseUrl } from '@/lib/site-url'

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
  const description = product.subtitleEn || product.subtitle || product.descriptionEn || product.description || 'Handcrafted handcrafted artwork'
  const image = product.image
  const price = product.price ? `$${product.price.toFixed(2)}` : ''

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
      'product:price:amount': String(product.price || ''),
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
  const reviews = repo.reviews.getByProduct(id).filter(r => r.approved && !r.hidden && !r.deleted)

  return <ProductDetailClient product={product} reviews={reviews} />
}
