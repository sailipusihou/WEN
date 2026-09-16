// 商品管理 API — 列表 & 新增
import { NextRequest, NextResponse } from 'next/server'
import { type Product, generateProductCode, isValidProductCode } from '@/lib/db'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { validatePrice, validateString, sanitizeString } from '@/lib/validation'

export async function GET(req: NextRequest) {
  const repo = getRepository()
  const products = repo.products.list()
  const { searchParams } = req.nextUrl

  const category = searchParams.get('category')
  const search = searchParams.get('search') || searchParams.get('q')
  const sort = searchParams.get('sort') || 'default'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSizeRaw = parseInt(searchParams.get('pageSize') || '0', 10) || 0
  const pageSize = pageSizeRaw > 0 ? Math.min(100, Math.max(1, pageSizeRaw)) : 0
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  let filtered = products

  // 按分类筛选
  if (category) {
    filtered = filtered.filter(p => p.category === category)
  }

  // 按价格区间筛选
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  if (minPrice) {
    filtered = filtered.filter(p => p.price >= Number(minPrice))
  }
  if (maxPrice) {
    filtered = filtered.filter(p => p.price <= Number(maxPrice))
  }

  // 按标签筛选
  const tag = searchParams.get('tag')
  if (tag) {
    filtered = filtered.filter(p =>
      (p.tags || []).includes(tag) || (p.tagsEn || []).includes(tag)
    )
  }

  // 按精选筛选
  const featured = searchParams.get('featured')
  if (featured === 'true') {
    filtered = filtered.filter(p => p.featured)
  }

  /**
   * 仅显示「商店可见」的商品（默认）。
   *
   * 两个条件都要：
   *   active !== false          → 可售
   *   listingVisible !== false  → 在列表里露出
   * 只在主商品编辑页里当赠品/搭配用的商品会设 listingVisible=false，
   * 所以不会出现在商店、搜索、分类页；但它仍然可售。
   * 后台管理界面走 ?activeOnly=false，不受这两个条件限制。
   */
  if (activeOnly) {
    filtered = filtered.filter(p => p.active !== false && (p as any).listingVisible !== false)
  }

  // 搜索 — 支持编码、名称、副标题、描述、工艺、材质、标签
  if (search) {
    const q = search.toLowerCase().trim()
    filtered = filtered.filter(p =>
      (p.code || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.nameEn || '').toLowerCase().includes(q) ||
      (p.subtitle || '').toLowerCase().includes(q) ||
      (p.subtitleEn || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.descriptionEn || '').toLowerCase().includes(q) ||
      (p.craft || '').toLowerCase().includes(q) ||
      (p.craftEn || '').toLowerCase().includes(q) ||
      (p.material || '').toLowerCase().includes(q) ||
      (p.origin || '').toLowerCase().includes(q) ||
      (p.tags || []).some((t: string) => t.toLowerCase().includes(q)) ||
      (p.tagsEn || []).some((t: string) => t.toLowerCase().includes(q))
    )
  }

  // 排序
  switch (sort) {
    case 'price-asc':
      filtered = [...filtered].sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      filtered = [...filtered].sort((a, b) => b.price - a.price)
      break
    case 'rating':
      filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0))
      break
    case 'newest':
      filtered = [...filtered].reverse()
      break
    default:
      // 精选商品优先
      filtered = [...filtered].sort((a, b) => Number(b.featured) - Number(a.featured))
  }

  // 分页
  if (pageSize > 0) {
    const total = filtered.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const paginated = filtered.slice(start, start + pageSize)
    return NextResponse.json({
      items: paginated,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  }

  return NextResponse.json(filtered)
}

export async function POST(req: NextRequest) {
  try {
    const auth = requirePermission(req, 'products_manage')
    if ('error' in auth) return auth.error

    const body = await req.json()

    // 输入验证
    if (!validateString(body.name || '', 200)) {
      return NextResponse.json({ error: 'Product name is required and must be under 200 characters' }, { status: 400 })
    }
    if (!validatePrice(Number(body.price) || 0)) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }
    if (body.originalPrice && !validatePrice(Number(body.originalPrice))) {
      return NextResponse.json({ error: 'Invalid original price' }, { status: 400 })
    }
    if (body.subtitle && !validateString(body.subtitle, 500)) {
      return NextResponse.json({ error: 'Subtitle too long' }, { status: 400 })
    }
    if (body.description && !validateString(body.description, 5000)) {
      return NextResponse.json({ error: 'Description too long' }, { status: 400 })
    }

    const id = body.id || slugify(body.name || 'product') + '-' + Date.now().toString(36)

    // 处理商品编码: 用户提供则校验格式+唯一性, 未提供则自动生成规律性编码
    const repo = getRepository()
    const allProducts = repo.products.list()
    const existingCodes = new Set(allProducts.map(p => p.code).filter(Boolean) as string[])
    // 未指定分类时用后台的第一个真实分类 —— 此前默认写死 'cultural-gifts'，
    // 而那个分类早已不存在，新商品会静默落进一个查不到的分类里。
    const defaultCategory = repo.categories.list()[0]?.slug || ''

    let code: string | undefined
    if (body.code !== undefined && body.code !== null && String(body.code).trim() !== '') {
      const candidate = String(body.code).trim().toUpperCase()
      if (!isValidProductCode(candidate)) {
        return NextResponse.json({ error: 'Invalid product code format. Expected format: XX-0000 (e.g. CG-0001)' }, { status: 400 })
      }
      // 唯一性校验 (排除自身, 此处为新建无自身)
      if (existingCodes.has(candidate)) {
        return NextResponse.json({ error: `Product code "${candidate}" already exists` }, { status: 409 })
      }
      code = candidate
    } else {
      // 自动生成规律性编码
      const category = body.category || defaultCategory
      code = generateProductCode(category, existingCodes)
    }

    const product: Product = {
      id,
      code,
      name: sanitizeString(body.name),
      nameEn: body.nameEn ? sanitizeString(body.nameEn) : undefined,
      subtitle: body.subtitle ? sanitizeString(body.subtitle) : '',
      subtitleEn: body.subtitleEn ? sanitizeString(body.subtitleEn) : undefined,
      description: body.description ? sanitizeString(body.description) : '',
      descriptionEn: body.descriptionEn ? sanitizeString(body.descriptionEn) : undefined,
      story: body.story ? sanitizeString(body.story) : '',
      storyEn: body.storyEn ? sanitizeString(body.storyEn) : undefined,
      price: Number(body.price) || 0,
      originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
      costPrice: body.costPrice ? Number(body.costPrice) : undefined,
      stock: Number(body.stock) || 0,
      supplierId: body.supplierId || undefined,
      category: body.category || defaultCategory,
      tags: Array.isArray(body.tags) ? body.tags : [],
      tagsEn: Array.isArray(body.tagsEn) ? body.tagsEn : undefined,
      image: body.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
      detailImages: Array.isArray(body.detailImages) ? body.detailImages : [],
      video: body.video || undefined,
      videoEnabled: Boolean(body.videoEnabled),
      craft: body.craft || '',
      craftEn: body.craftEn || undefined,
      material: body.material || '',
      origin: body.origin || '',
      rating: Math.min(5, Math.max(0, Number(body.rating) || 0)),
      reviewCount: Math.max(0, Number(body.reviewCount) || 0),
      featured: Boolean(body.featured),
      active: body.active !== undefined ? Boolean(body.active) : true,
      // 是否在商店列表露出。默认 true；设为 false 的商品只在主商品编辑页里
      // 当赠品/搭配用，不出现在商店、搜索、分类页，但依然可售。
      listingVisible: body.listingVisible !== undefined ? Boolean(body.listingVisible) : true,
    }

    const created = repo.products.add(product)
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 400 })
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}
