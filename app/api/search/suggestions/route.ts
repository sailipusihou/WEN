import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { rateLimit, getClientIp } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!rateLimit('search_suggestions:' + ip, 30, 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  } catch {}

  const q = req.nextUrl.searchParams.get('q') || ''
  const limit = Math.min(20, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '8', 10) || 8))

  if (!q.trim()) {
    return NextResponse.json([])
  }

  const query = q.toLowerCase().trim()
  const allProducts = getRepository().products.listActive()

  const suggestions = allProducts
    .map(p => {
      const nameMatch = (p.nameEn || p.name).toLowerCase().startsWith(query) ? 3 : 0
      const nameContains = (p.nameEn || p.name).toLowerCase().includes(query) ? 2 : 0
      const subtitleMatch = (p.subtitleEn || p.subtitle).toLowerCase().includes(query) ? 1 : 0
      const tagMatch = (p.tagsEn || p.tags || []).some((t: string) => t.toLowerCase().includes(query)) ? 1 : 0
      const score = nameMatch + nameContains + subtitleMatch + tagMatch
      return { product: p, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => ({
      id: item.product.id,
      name: item.product.nameEn || item.product.name,
      subtitle: item.product.subtitleEn || item.product.subtitle,
      image: item.product.image,
      price: item.product.price,
      category: item.product.category,
    }))

  return NextResponse.json(suggestions)
}
