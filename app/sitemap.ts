import type { MetadataRoute } from 'next'
import { getRepository } from '@/lib/repository'
import { getSiteBaseUrl } from '@/lib/site-url'

/**
 * ⚠️ 必须动态生成。sitemap 的内容来自数据库（商品、分类、Journal 文章），
 *    而 Next 默认会在构建时把它**静态生成并冻结** —— 上架新品或改文章后
 *    sitemap 不会跟着变，搜索引擎看到的还是构建那一刻的快照（2026-10-13 踩到：
 *    新写的三篇 Journal 文章一条都没进 sitemap，因为它们是构建之后才写进设置里的）。
 */
export const dynamic = 'force-dynamic'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteBaseUrl()
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    // 修复 L7: 移除 robots 禁爬的 /cart 与登录/注册/消息页 (与 robots.ts 保持一致)
  ]

  let productPages: MetadataRoute.Sitemap = []
  let categoryPages: MetadataRoute.Sitemap = []
  let journalPages: MetadataRoute.Sitemap = []

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

    // 分类也必须走 repository —— 此前这里直接调 lib/categories 的 getAllCategories(),
    // 那是读 data/categories.json 的遗留 JSON 层, 与 SQLite 早已分叉,
    // 结果是 sitemap 一直在收录不存在的分类 URL (含带空格的坏 slug)。
    const categories = repo.categories.list().filter((c: any) => c.active !== false)
    categoryPages = categories.map(c => ({
      url: `${baseUrl}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // The Journal 的文章 —— 内容是商品来源与工艺，对搜索是有效内容页
    const entries: any[] = (repo.settings.get() as any)?.frontendContent?.journal?.entries || []
    journalPages = entries
      .filter(e => e?.slug)
      .map(e => ({
        url: `${baseUrl}/journal/${e.slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
  } catch {}

  return [...staticPages, ...productPages, ...categoryPages, ...journalPages]
}
