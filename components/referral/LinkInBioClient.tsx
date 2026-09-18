'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowUpRight, CheckCircle2, ExternalLink, Link2 } from 'lucide-react'
import type { Product } from '@/lib/products'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { buildReferralProductUrl } from '@/lib/referral-links'
import { trackReferralVisit } from '@/lib/referral-client'

interface LinkInBioReferralLink {
  code: string
  platform: string
  platformUsername?: string
  productId?: string
  productName?: string
  contentTitle?: string
  contentBody?: string
}

export default function LinkInBioClient({
  referralCode,
  referralLink,
  heroProduct,
  featuredProducts,
}: {
  referralCode: string
  referralLink: LinkInBioReferralLink | null
  heroProduct: Product | null
  featuredProducts: Product[]
}) {
  const searchParams = useSearchParams()
  const sourceChannel = searchParams.get('channel') || 'bio'

  useEffect(() => {
    if (!referralCode) return
    trackReferralVisit({
      refCode: referralCode,
      page: window.location.pathname,
      query: window.location.search,
      sourceChannel,
    })
  }, [referralCode, sourceChannel])

  const heroTitle = referralLink?.contentTitle || heroProduct?.nameEn || heroProduct?.name || 'Curated picks from our collection'
  const heroBody =
    referralLink?.contentBody ||
    heroProduct?.subtitleEn ||
    heroProduct?.subtitle ||
    'Discover the handcrafted piece highlighted in our latest social post and continue into the full collection.'

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-ink">
      <section className="border-b border-[#E7E1D7] bg-[#FFFFFF]/70">
        <div className="mx-auto max-w-6xl px-6 py-4 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-sans text-micro uppercase tracking-[0.26em] text-[#8A6A2E]">
                Instagram Link in Bio
              </p>
              <p className="mt-1 font-sans text-sm text-ink-soft">
                {referralLink
                  ? `Tracking active: ${referralLink.platform}${referralLink.platformUsername ? ` · @${referralLink.platformUsername}` : ''}`
                  : 'No valid referral detected — showing default featured content.'}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D8CEBD] bg-[#FFFFFF] px-4 py-2 text-xs text-ink-soft">
              <CheckCircle2 size={14} className="text-[#8A6A2E]" />
              Attribution code: {referralCode || 'none'}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-14">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#E7E1D7] bg-[#FFFFFF] p-6 shadow-sm md:p-8">
            <p className="font-sans text-micro uppercase tracking-[0.26em] text-[#8A6A2E]">
              Featured Drop
            </p>
            <h1 className="mt-3 font-en text-3xl font-medium tracking-[0.005em] md:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-7 text-ink-soft md:text-base">
              {heroBody}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {heroProduct && referralCode ? (
                <Link
                  href={buildReferralProductUrl({ code: referralCode, productId: heroProduct.id, sourceChannel })}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.26em] text-white transition hover:bg-ink-deep"
                >
                  Shop This Piece <ArrowUpRight size={14} />
                </Link>
              ) : (
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.26em] text-white transition hover:bg-ink-deep"
                >
                  Browse Collection <ArrowUpRight size={14} />
                </Link>
              )}
              <Link
                href={referralCode ? `/products?ref=${referralCode}&channel=${sourceChannel}` : '/products'}
                className="inline-flex items-center gap-2 rounded-full border border-[#D8CEBD] px-6 py-3 text-xs font-medium uppercase tracking-[0.26em] text-ink transition hover:border-[#8A6A2E]"
              >
                View All Products <ExternalLink size={14} />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-[#FBFAF7] p-4">
                <p className="font-sans text-micro uppercase tracking-[0.28em] text-[#8A6A2E]">Source</p>
                <p className="mt-2 font-sans text-sm text-ink">
                  {sourceChannel === 'story'
                    ? 'Instagram Story'
                    : referralLink?.platformUsername
                      ? `@${referralLink.platformUsername}`
                      : 'Instagram bio'}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FBFAF7] p-4">
                <p className="font-sans text-micro uppercase tracking-[0.28em] text-[#8A6A2E]">Primary Product</p>
                <p className="mt-2 font-sans text-sm text-ink">
                  {heroProduct?.nameEn || heroProduct?.name || referralLink?.productName || 'Curated collection'}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FBFAF7] p-4">
                <p className="font-sans text-micro uppercase tracking-[0.28em] text-[#8A6A2E]">Link Mode</p>
                <p className="mt-2 font-sans text-sm text-ink">Bio landing + product deep link</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#E7E1D7] bg-[#FFFFFF] p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-[#8A6A2E]" />
              <p className="font-sans text-sm font-medium text-ink">How this flow works</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                'Instagram post guides visitors into this landing page.',
                'Link in Bio highlights the promoted product and keeps the referral code attached.',
                'Product detail and later checkout keep attribution available for conversion tracking.',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-[#FBFAF7] p-4 font-sans text-sm leading-6 text-ink-soft">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {heroProduct && (
            <div className="overflow-hidden rounded-[28px] border border-[#E7E1D7] bg-[#FFFFFF] shadow-sm">
              <div className="relative aspect-[4/5] bg-[#EFE7D4]">
                <OptimizedImage
                  src={heroProduct.image}
                  alt={heroProduct.nameEn || heroProduct.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  objectFit="cover"
                  placeholder="blur"
                />
              </div>
              <div className="p-6">
                <p className="font-sans text-micro uppercase tracking-[0.28em] text-[#8A6A2E]">
                  Recommended First Click
                </p>
                <h2 className="mt-2 font-en text-2xl font-medium text-ink">
                  {heroProduct.nameEn || heroProduct.name}
                </h2>
                <p className="mt-3 font-sans text-sm leading-6 text-ink-soft">
                  {heroProduct.subtitleEn || heroProduct.subtitle}
                </p>
                <Link
                  href={referralCode ? buildReferralProductUrl({ code: referralCode, productId: heroProduct.id, sourceChannel }) : `/products/${heroProduct.id}`}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.26em] text-ink transition hover:text-[#8A6A2E]"
                >
                  Open product detail <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-[#E7E1D7] bg-[#FFFFFF] p-6 shadow-sm md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-sans text-micro uppercase tracking-[0.26em] text-[#8A6A2E]">Curated Picks</p>
                <h3 className="mt-2 font-en text-2xl font-medium tracking-[0.005em]">Continue browsing</h3>
              </div>
              <Link href={referralCode ? `/products?ref=${referralCode}&channel=${sourceChannel}` : '/products'} className="text-xs uppercase tracking-[0.26em] text-ink-soft hover:text-ink">
                Full collection
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  href={referralCode ? buildReferralProductUrl({ code: referralCode, productId: product.id, sourceChannel }) : `/products/${product.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-[#FBFAF7] p-3 transition hover:bg-[#F2EDE4]"
                >
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-[#EFE7D4]">
                    <OptimizedImage
                      src={product.image}
                      alt={product.nameEn || product.name}
                      fill
                      sizes="96px"
                      objectFit="cover"
                      placeholder="blur"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-en text-lg font-medium text-ink">
                      {product.nameEn || product.name}
                    </p>
                    <p className="mt-1 line-clamp-2 font-sans text-sm leading-6 text-ink-soft">
                      {product.subtitleEn || product.subtitle}
                    </p>
                  </div>
                  <ArrowUpRight size={16} className="shrink-0 text-[#8A6A2E]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
