import type { MetadataRoute } from 'next'
import { getRepository } from '@/lib/repository'
import { getAllCategories } from '@/lib/categories'
import { getSiteBaseUrl } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteBaseUrl()
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    // 修复 L7: 移除 robots 禁爬的 /cart 与登录/注册/消息页 (与 robots.ts 保持一致)
  ]

  let productPages: MetadataRoute.Sitemap = []
  let categoryPages: MetadataRoute.Sitemap = []

  try {
    // 统一从当前后端 (SQLite) 读取, 与商品管理同源
    const repo = getRepository()
    const products = repo.products.list().filter(p => p.active)
    productPages = products.map(p => ({
      url: `${baseUrl}/products/${p.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {}

  try {
    const categories = getAllCategories()
    categoryPages = categories.map(c => ({
      url: `${baseUrl}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {}

  return [...staticPages, ...productPages, ...categoryPages]
}
