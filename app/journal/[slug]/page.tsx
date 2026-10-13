import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpLeft } from 'lucide-react'
import { getRepository } from '@/lib/repository'
import { toPublicProducts } from '@/lib/public-product'
import OptimizedImage from '@/components/ui/OptimizedImage'
import ProductCard from '@/components/product/ProductCard'

/**
 * The Journal —— 文章详情页。
 *
 * 内容来自后台「设置 → Visual Editor → Journal」（frontendContent.journal.entries），
 * 每篇五个小节：历史含义 / 当今意义 / 产品象征 / 现代描述 / 使用方式。
 * 文章上的 `tag` 决定这一页底部推荐哪一类商品。
 *
 * ⚠️ 用 slug 定位文章。改了 slug 就等于换了网址 —— 老链接会 404，
 *    要改请同时想好是否保留跳转。
 */
type Entry = {
  slug?: string
  label?: string
  title?: string
  excerpt?: string
  image?: string
  date?: string
  readTime?: string
  tag?: string
  sections?: { heading?: string; body?: string }[]
}

function journalEntries(repo: ReturnType<typeof getRepository>): Entry[] {
  const s: any = repo.settings.get() || {}
  const e = s.frontendContent?.journal?.entries
  return Array.isArray(e) ? e : []
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const repo = getRepository()
  const entry = journalEntries(repo).find(e => e.slug === slug)

  if (!entry) {
    return { title: 'Not Found', description: 'This article does not exist.' }
  }
  return {
    title: `${entry.title} | The Journal`,
    description: entry.excerpt || 'Notes on Longquan celadon.',
    openGraph: {
      title: entry.title || 'The Journal',
      description: entry.excerpt || '',
      type: 'article',
      ...(entry.image ? { images: [entry.image] } : {}),
    },
    alternates: { canonical: `/journal/${slug}` },
  }
}

export default async function JournalArticlePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const repo = getRepository()
  const entries = journalEntries(repo)
  const entry = entries.find(e => e.slug === slug)
  if (!entry) notFound()

  const others = entries.filter(e => e.slug !== slug)

  // 这篇文章相关的商品（按文章上的 tag 匹配题材）
  const products = entry.tag
    ? toPublicProducts(repo.products.listActive())
        .filter((p: any) => (p.tags || []).includes(entry.tag!))
        .slice(0, 3)
    : []

  const sections = (entry.sections || []).filter(s => s?.heading && s?.body)

  return (
    <div className="bg-[#FFFFFF] min-h-screen">
      {/* 头图 */}
      {entry.image && (
        <div className="relative w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden bg-paper">
          <OptimizedImage
            src={entry.image}
            alt={entry.title || 'The Journal'}
            fill
            sizes="100vw"
            className="object-cover"
            objectFit="cover"
            priority
          />
        </div>
      )}

      <article className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
        <Link
          href="/#journal"
          className="inline-flex items-center gap-1.5 text-micro tracking-[0.18em] uppercase font-sans text-ink-soft/60 hover:text-ink transition-colors mb-8"
        >
          <ArrowUpLeft size={12} strokeWidth={1.5} /> The Journal
        </Link>

        <div className="flex items-center gap-2 text-micro text-ink-soft/66 font-sans tracking-[0.2em] uppercase mb-3">
          {entry.label && (
            <>
              <span className="text-coral">{entry.label}</span>
              <span className="w-1 h-1 rounded-full bg-coral/30" />
            </>
          )}
          {entry.date && <span>{entry.date}</span>}
          {entry.date && entry.readTime && <span className="w-1 h-1 rounded-full bg-coral/30" />}
          {entry.readTime && <span>{entry.readTime} min read</span>}
        </div>

        <h1 className="font-en text-3xl md:text-5xl text-ink-deep font-medium tracking-[0.005em] leading-tight">
          {entry.title}
        </h1>

        {entry.excerpt && (
          <p className="font-sans text-base md:text-lg text-ink-soft/85 mt-5 leading-relaxed">
            {entry.excerpt}
          </p>
        )}

        {/* 正文：五个小节 */}
        {sections.length > 0 && (
          <div className="mt-10 space-y-9">
            {sections.map((s, i) => (
              <section key={i}>
                <h2 className="font-en text-lg md:text-xl text-ink-deep font-semibold mb-2.5">
                  {s.heading}
                </h2>
                <p className="font-sans text-sm md:text-[15px] leading-7 text-[#4A4A36]">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        )}

        {/* 相关商品 —— 文章讲的东西，直接给出可以买的那几件 */}
        {products.length > 0 && (
          <div className="mt-14 pt-10" style={{ borderTop: '1px solid rgba(74,58,36,0.12)' }}>
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="font-sans text-micro tracking-[0.2em] uppercase text-ink-soft/55">
                  Featured pieces
                </span>
                <h2 className="font-en text-xl md:text-2xl text-ink-deep font-medium mt-1">
                  From this story
                </h2>
              </div>
              {entry.tag && (
                <Link
                  href={`/products?tag=${encodeURIComponent(entry.tag)}`}
                  className="font-sans text-micro tracking-[0.16em] uppercase text-coral hover:opacity-75 transition-opacity whitespace-nowrap"
                >
                  Shop {entry.tag} →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
              {products.map((p: any, i: number) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* 其它文章 */}
        {others.length > 0 && (
          <div className="mt-14 pt-8" style={{ borderTop: '1px solid rgba(74,58,36,0.12)' }}>
            <span className="font-sans text-micro tracking-[0.2em] uppercase text-ink-soft/55">
              More from the journal
            </span>
            <div className="mt-4 space-y-3">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/journal/${o.slug}`}
                  className="flex items-baseline gap-3 group"
                >
                  <span className="font-en text-base text-ink-deep group-hover:text-coral transition-colors">
                    {o.title}
                  </span>
                  <span className="font-sans text-micro text-ink-soft/55 tracking-[0.14em] uppercase whitespace-nowrap">
                    {o.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
