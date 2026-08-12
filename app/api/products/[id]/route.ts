// 商品管理 API — 单个商品的增删改查
import { NextRequest, NextResponse } from 'next/server'
import { type Product, isValidProductCode } from '@/lib/db'
import { getRepository } from '@/lib/repository'
import { requirePermission } from '@/lib/auth'
import { validateId, validateString, sanitizeString, validatePrice } from '@/lib/validation'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!validateId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  const repo = getRepository()
  const product = repo.products.getById(id)
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  return NextResponse.json(product)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  const { id } = await params
  if (!validateId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  try {
    const body = await req.json()
    const updates: Partial<Product> = {}

    // 商品编码: 支持更新, 校验格式+唯一性 (排除自身)
    if (body.code !== undefined) {
      const codeRaw = body.code === null ? '' : String(body.code).trim()
      if (codeRaw === '') {
        // 允许清空编码 (置为 undefined)
        ;(updates as Record<string, unknown>).code = undefined
      } else {
        const candidate = codeRaw.toUpperCase()
        if (!isValidProductCode(candidate)) {
          return NextResponse.json({ error: 'Invalid product code format. Expected format: XX-0000 (e.g. CG-0001)' }, { status: 400 })
        }
        const repo = getRepository()
        const conflict = repo.products.list().find(p => p.code === candidate && p.id !== id)
        if (conflict) {
          return NextResponse.json({ error: `Product code "${candidate}" already exists` }, { status: 409 })
        }
        ;(updates as Record<string, unknown>).code = candidate
      }
    }

    // 字符串字段最大长度
    const stringFields: Record<string, number> = {
      name: 200, nameEn: 200, subtitle: 300, subtitleEn: 300,
      description: 5000, descriptionEn: 5000, story: 5000, storyEn: 5000,
      category: 100, craft: 100, craftEn: 100, material: 200, origin: 200,
      image: 1000, video: 1000,
    }
    for (const [field, maxLen] of Object.entries(stringFields)) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== 'string' || !validateString(body[field], maxLen)) {
          return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
        }
        ;(updates as Record<string, unknown>)[field] = sanitizeString(body[field])
      }
    }

    // 数组字段
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) return NextResponse.json({ error: 'tags must be array' }, { status: 400 })
      updates.tags = body.tags.slice(0, 20).map((t: any) => sanitizeString(String(t).slice(0, 50)))
    }
    if (body.tagsEn !== undefined) {
      if (!Array.isArray(body.tagsEn)) return NextResponse.json({ error: 'tagsEn must be array' }, { status: 400 })
      updates.tagsEn = body.tagsEn.slice(0, 20).map((t: any) => sanitizeString(String(t).slice(0, 50)))
    }
    if (body.detailImages !== undefined) {
      if (!Array.isArray(body.detailImages)) return NextResponse.json({ error: 'detailImages must be array' }, { status: 400 })
      updates.detailImages = body.detailImages.slice(0, 20).filter((u: any) => typeof u === 'string' && u.length < 1000)
    }

    // 数值字段
    if (body.price !== undefined) {
      if (!validatePrice(body.price)) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
      updates.price = Number(body.price)
    }
    if (body.originalPrice !== undefined) {
      if (body.originalPrice !== null && !validatePrice(body.originalPrice)) {
        return NextResponse.json({ error: 'Invalid originalPrice' }, { status: 400 })
      }
      updates.originalPrice = body.originalPrice === null ? undefined : Number(body.originalPrice)
    }
    if (body.costPrice !== undefined) {
      if (body.costPrice !== null && !validatePrice(body.costPrice)) {
        return NextResponse.json({ error: 'Invalid costPrice' }, { status: 400 })
      }
      updates.costPrice = body.costPrice === null ? undefined : Number(body.costPrice)
    }
    if (body.stock !== undefined) {
      const stock = Number(body.stock)
      if (Number.isNaN(stock) || stock < 0 || stock > 999999) return NextResponse.json({ error: 'Invalid stock' }, { status: 400 })
      updates.stock = stock
    }
    if (body.supplierId !== undefined) {
      updates.supplierId = body.supplierId === null || body.supplierId === '' ? undefined : String(body.supplierId)
    }
    if (body.reviewCount !== undefined) {
      const rc = Number(body.reviewCount)
      if (Number.isNaN(rc) || rc < 0 || rc > 999999) return NextResponse.json({ error: 'Invalid reviewCount' }, { status: 400 })
      updates.reviewCount = rc
    }
    if (body.rating !== undefined) {
      const r = Number(body.rating)
      if (Number.isNaN(r) || r < 0 || r > 5) return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
      updates.rating = r
    }

    // 布尔字段
    if (body.featured !== undefined) updates.featured = Boolean(body.featured)
    if (body.active !== undefined) updates.active = Boolean(body.active)
    if (body.videoEnabled !== undefined) updates.videoEnabled = Boolean(body.videoEnabled)

    const repo = getRepository()
    const updated = repo.products.update(id, updates)
    if (!updated) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePermission(req, 'products_manage')
  if ('error' in auth) return auth.error
  const { id } = await params
  if (!validateId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  const repo = getRepository()
  const ok = repo.products.delete(id)
  if (!ok) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
