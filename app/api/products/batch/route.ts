import { NextRequest, NextResponse } from 'next/server'
import { type Product, generateProductCode, isValidProductCode } from '@/lib/db'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()
    const products = body.products as any[]
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 })
    }

    const repo = getRepository()
    const results = { imported: 0, updated: 0, skipped: 0, errors: [] as string[] }
    const existing = repo.products.list()
    const existingIds = new Set(existing.map(p => p.id))
    // 收集所有已存在的商品编码, 用于唯一性校验和自动生成
    const existingCodes = new Set<string>(existing.map(p => p.code).filter(Boolean) as string[])
    // 批量导入时若某行没给分类，用后台的第一个真实分类兜底
    // （此前写死 'cultural-gifts'，那是个早已不存在的分类）
    const defaultCategory = repo.categories.list()[0]?.slug || ''

    const parseArr = (val: any): string[] => {
      if (Array.isArray(val)) return val
      if (typeof val === 'string') return val.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean)
      return []
    }

    for (let i = 0; i < products.length; i++) {
      const item = products[i]
      try {
        if (!item.name && !item.nameEn) {
          results.errors.push('Row ' + (i + 2) + ': Missing product name')
          results.skipped++
          continue
        }

        const id = item.id || (item.nameEn || item.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36) + '-' + i

        // 已存在则更新，不存在则创建
        if (existingIds.has(id)) {
          const updates: Partial<Product> = {}
          // 处理编码: 若提供则校验格式+唯一性 (排除自身)
          if (item.code !== undefined && item.code !== null && String(item.code).trim() !== '') {
            const candidate = String(item.code).trim().toUpperCase()
            if (!isValidProductCode(candidate)) {
              results.errors.push('Row ' + (i + 2) + ': Invalid product code format "' + candidate + '"')
              results.skipped++
              continue
            }
            const conflict = existing.find(p => p.code === candidate && p.id !== id)
            if (conflict) {
              results.errors.push('Row ' + (i + 2) + ': Product code "' + candidate + '" already exists')
              results.skipped++
              continue
            }
            updates.code = candidate
            existingCodes.add(candidate)
          }
          if (item.name !== undefined) updates.name = item.name
          if (item.nameEn !== undefined) updates.nameEn = item.nameEn
          if (item.subtitle !== undefined) updates.subtitle = item.subtitle
          if (item.subtitleEn !== undefined) updates.subtitleEn = item.subtitleEn
          if (item.description !== undefined) updates.description = item.description
          if (item.descriptionEn !== undefined) updates.descriptionEn = item.descriptionEn
          if (item.story !== undefined) updates.story = item.story
          if (item.storyEn !== undefined) updates.storyEn = item.storyEn
          if (item.price !== undefined) updates.price = Number(item.price) || 0
          if (item.originalPrice !== undefined) updates.originalPrice = item.originalPrice ? Number(item.originalPrice) : undefined
          if (item.costPrice !== undefined) updates.costPrice = item.costPrice ? Number(item.costPrice) : undefined
          if (item.stock !== undefined) updates.stock = Number(item.stock) || 0
          if (item.supplierId !== undefined) updates.supplierId = item.supplierId || undefined
          if (item.category !== undefined) updates.category = item.category || defaultCategory
          if (item.tags !== undefined) updates.tags = parseArr(item.tags)
          if (item.tagsEn !== undefined) updates.tagsEn = parseArr(item.tagsEn)
          if (item.image !== undefined) updates.image = item.image
          if (item.detailImages !== undefined) updates.detailImages = parseArr(item.detailImages)
          if (item.craft !== undefined) updates.craft = item.craft
          if (item.craftEn !== undefined) updates.craftEn = item.craftEn
          if (item.material !== undefined) updates.material = item.material
          if (item.origin !== undefined) updates.origin = item.origin
          if (item.rating !== undefined) updates.rating = Number(item.rating) || 0
          if (item.reviewCount !== undefined) updates.reviewCount = Number(item.reviewCount) || 0
          if (item.featured !== undefined) updates.featured = item.featured === 'true' || item.featured === true
          if (item.active !== undefined) updates.active = item.active !== 'false' && item.active !== false

          repo.products.update(id, updates)
          results.updated++
        } else {
          // 新建商品: 处理编码 (提供则校验, 否则自动生成)
          let code: string | undefined
          if (item.code !== undefined && item.code !== null && String(item.code).trim() !== '') {
            const candidate = String(item.code).trim().toUpperCase()
            if (!isValidProductCode(candidate)) {
              results.errors.push('Row ' + (i + 2) + ': Invalid product code format "' + candidate + '"')
              results.skipped++
              continue
            }
            if (existingCodes.has(candidate)) {
              results.errors.push('Row ' + (i + 2) + ': Product code "' + candidate + '" already exists')
              results.skipped++
              continue
            }
            code = candidate
          } else {
            code = generateProductCode(item.category || defaultCategory, existingCodes)
          }
          existingCodes.add(code)

          const product: Product = {
            id,
            code,
            name: item.name || '',
            nameEn: item.nameEn || undefined,
            subtitle: item.subtitle || '',
            subtitleEn: item.subtitleEn || undefined,
            description: item.description || '',
            descriptionEn: item.descriptionEn || undefined,
            story: item.story || '',
            storyEn: item.storyEn || undefined,
            price: Number(item.price) || 0,
            originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
            costPrice: item.costPrice ? Number(item.costPrice) : undefined,
            stock: Number(item.stock) || 0,
            supplierId: item.supplierId || undefined,
            category: item.category || defaultCategory,
            tags: parseArr(item.tags),
            tagsEn: item.tagsEn ? parseArr(item.tagsEn) : undefined,
            image: item.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
            detailImages: item.detailImages ? parseArr(item.detailImages) : [],
            craft: item.craft || '',
            craftEn: item.craftEn || undefined,
            material: item.material || '',
            origin: item.origin || '',
            rating: Number(item.rating) || 0,
            reviewCount: Number(item.reviewCount) || 0,
            featured: item.featured === 'true' || item.featured === true || false,
            active: item.active !== 'false' && item.active !== false,
          }

          repo.products.add(product)
          results.imported++
          existingIds.add(id)
        }
      } catch (e: any) {
        results.errors.push('Row ' + (i + 2) + ': ' + (e.message || 'Unknown error'))
        results.skipped++
      }
    }

    return NextResponse.json(results)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Batch import failed' }, { status: 500 })
  }
}