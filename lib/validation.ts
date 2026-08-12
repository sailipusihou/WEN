export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email) && email.length <= 254
}

export function validateString(value: string, maxLength: number = 1000): boolean {
  return typeof value === 'string' && value.length <= maxLength
}

export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

export function validateSlug(slug: string): boolean {
  const re = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return re.test(slug) && slug.length <= 100
}

export function validatePrice(price: number): boolean {
  return typeof price === 'number' && price >= 0 && price <= 999999
}

export function validateId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 100
}

export function xssEscape(text: string): string {
  if (typeof text !== 'string') return ''
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(text))
  return div.innerHTML
}

export function validateUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    if (allowedDomains && allowedDomains.length > 0) {
      return allowedDomains.some(d => u.hostname === d || u.hostname.endsWith('.' + d))
    }
    return true
  } catch {
    return false
  }
}
