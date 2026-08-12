import { getRepository } from '@/lib/repository'
import CategoryClient from '@/components/product/CategoryClient'
import type { Metadata } from 'next'
import { getSiteBaseUrl } from '@/lib/site-url'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const repo = getRepository()
  const category = repo.categories.getBySlug(slug)

  if (!category) {
    return {
      title: 'Category Not Found',
      description: 'The category you are looking for does not exist.',
    }
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
  const categoryProducts = repo.products.getByCategory(slug)

  return <CategoryClient category={category} products={categoryProducts} />
}
