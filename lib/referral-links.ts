export function resolveReferralOrigin(fallbackUrl?: string): string {
  if (fallbackUrl) {
    try {
      return new URL(fallbackUrl).origin
    } catch {}
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configuredSiteUrl) {
    try {
      return new URL(configuredSiteUrl).origin
    } catch {}
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return 'http://localhost:3000'
}

interface ReferralUrlOptions {
  code?: string | null
  productId?: string | null
  fallbackUrl?: string
  sourceChannel?: string | null
}

function appendReferralChannel(url: URL, sourceChannel?: string | null) {
  if (sourceChannel) {
    url.searchParams.set('channel', sourceChannel)
  }
}

export function buildReferralHomeUrl({ code, fallbackUrl, sourceChannel }: ReferralUrlOptions): string {
  if (!code) return ''
  const url = new URL('/', resolveReferralOrigin(fallbackUrl))
  url.searchParams.set('ref', code)
  appendReferralChannel(url, sourceChannel)
  return url.toString()
}

export function buildReferralBioLandingUrl({
  code,
  productId,
  fallbackUrl,
  sourceChannel,
}: ReferralUrlOptions): string {
  if (!code) return ''
  const url = new URL('/link-in-bio', resolveReferralOrigin(fallbackUrl))
  url.searchParams.set('ref', code)
  if (productId) {
    url.searchParams.set('product', productId)
  }
  appendReferralChannel(url, sourceChannel)
  return url.toString()
}

export function buildReferralProductUrl({
  code,
  productId,
  fallbackUrl,
  sourceChannel,
}: ReferralUrlOptions): string {
  if (!code || !productId) return ''
  const url = new URL(`/products/${productId}`, resolveReferralOrigin(fallbackUrl))
  url.searchParams.set('ref', code)
  appendReferralChannel(url, sourceChannel)
  return url.toString()
}
