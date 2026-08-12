import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const activeOnly = searchParams.get('active') === 'true'

  let products = getRepository().products.list()
  if (category) products = products.filter(p => p.category === category)
  if (activeOnly) products = products.filter(p => p.active !== false)

  const headers = [
    'id', 'name', 'nameEn', 'subtitle', 'subtitleEn', 'description', 'descriptionEn',
    'price', 'originalPrice', 'costPrice', 'stock', 'supplierId', 'category', 'tags', 'tagsEn',
    'image', 'detailImages', 'craft', 'craftEn', 'material', 'origin',
    'rating', 'reviewCount', 'featured', 'active'
  ]

  const rows = products.map(p => [
    p.id,
    p.name,
    p.nameEn || '',
    p.subtitle,
    p.subtitleEn || '',
    p.description,
    p.descriptionEn || '',
    p.price,
    p.originalPrice || '',
    p.costPrice || '',
    p.stock || 0,
    p.supplierId || '',
    p.category,
    (p.tags || []).join('|'),
    (p.tagsEn || []).join('|'),
    p.image,
    (p.detailImages || []).join('|'),
    p.craft,
    p.craftEn || '',
    p.material,
    p.origin,
    p.rating,
    p.reviewCount,
    p.featured ? 'true' : 'false',
    p.active !== false ? 'true' : 'false',
  ].map(escapeCsv).join(','))

  const csvContent = [headers.join(','), ...rows].join('\n')
  const BOM = '\uFEFF'

  return new NextResponse(BOM + csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
