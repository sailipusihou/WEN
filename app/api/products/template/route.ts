import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

export async function GET() {
  // 模板示例行的分类必须是真实存在的分类，否则用户照模板导入，
  // 商品会全部落进一个查不到的分类。此前这里写死 'cultural-gifts'（早已废弃）。
  let sampleCategory = 'tea-ceremony'
  try {
    const first = getRepository().categories.list()[0]?.slug
    if (first) sampleCategory = first
  } catch {
    // 读不到分类时用上面的静态兜底值，保证模板仍可下载
  }

  const headers = [
    'name', 'nameEn', 'subtitle', 'subtitleEn', 'description', 'descriptionEn',
    'price', 'originalPrice', 'costPrice', 'stock', 'supplierId', 'category', 'tags', 'tagsEn',
    'image', 'craft', 'craftEn', 'material', 'origin',
    'featured', 'active'
  ]

  const sampleRow = [
    'Qing Ci Tea Set', 'Celadon Tea Set', 'Longquan Celadon', 'Longquan Celadon - Sky-Blue Glaze',
    'Hand-thrown Longquan celadon tea set', 'Hand-thrown Longquan celadon...',
    '680', '880', '420', '15', 'SUP-xxx', sampleCategory, 'Master Craft|Heritage', 'Master Craft|Intangible Heritage',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80',
    'Hand-thrown at 1280C', 'Hand-thrown - Fired at 1280C', 'Celadon clay', 'Zhejiang',
    'true', 'true'
  ]

  const csvContent = headers.join(',') + '\n' + sampleRow.map(v => '"' + v.replace(/"/g, '""') + '"').join(',') + '\n'

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': 'attachment; filename="product-import-template.csv"',
    },
  })
}
