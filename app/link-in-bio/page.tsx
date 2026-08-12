import type { Metadata } from 'next'
import LinkInBioClient from '@/components/referral/LinkInBioClient'
import { getRepository } from '@/lib/repository'
import { getReferralLinkByCode } from '@/lib/referral-tracking'

export const metadata: Metadata = {
  title: 'Link in Bio',
  description: 'Continue from Instagram into curated product landing pages with referral attribution preserved.',
  robots: {
    index: false,
    follow: false,
  },
}

type SearchParamValue = string | string[] | undefined

function getFirstValue(value: SearchParamValue): string {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

export default async function LinkInBioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamValue>>
}) {
  const params = await searchParams
  const referralCode = getFirstValue(params.ref)
  const requestedProductId = getFirstValue(params.product)
  const referralLink = referralCode ? getReferralLinkByCode(referralCode) || null : null

  const repo = getRepository()
  const products = repo.products.listActive()

  const heroProductId = requestedProductId || referralLink?.productId || ''
  const heroProduct =
    (heroProductId ? repo.products.getById(heroProductId) : null) ||
    products[0] ||
    null

  const featuredProducts = products
    .filter(product => product.id !== heroProduct?.id)
    .slice(0, 4)

  return (
    <LinkInBioClient
      referralCode={referralCode}
      referralLink={referralLink}
      heroProduct={heroProduct}
      featuredProducts={featuredProducts}
    />
  )
}
