import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { sanitizeString } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * 商品规格 / 款式（variants）后台接口。
 *
 * 语义：一个商品可以有多个款式（如 "Zen Black" / "Soft Ivory White"），
 * 每个款式可以有自己的价格、主图、库存、货号。
 * 前台选不同款式时图片与价格联动切换。
 *
 * 鉴权：middleware 已对 /api/products/:path* 的写方法做 admin token 校验，
 * 这里再校验一次，避免中间件被绕过。
 */

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

/** GET：读取规格。传 productId 只取该商品；不传则返回全部（后台列表用） */
export async function GET(req: NextRequest) {
  try {
    const repo: any = getRepository()
    const productId = new URL(req.url).searchParams.get('productId')
    if (productId) {
      return NextResponse.json({ productId, variants: repo.products.listVariants(productId) || [] })
    }
    return NextResponse.json({ variants: repo.products.allVariants?.() || {} })
  } catch {
    return NextResponse.json({ variants: [] })
  }
}

/**
 * POST：覆盖式保存某商品的规格。
 * body: { productId, optionName?, variants: [{ id?, label, valueCode?, price?, image?, stock?, active? }] }
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json().catch(() => ({}))
    const productId = sanitizeString(String(body.productId || ''))
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })

    const repo: any = getRepository()
    if (!repo.products.getById(productId)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const optionName = sanitizeString(String(body.optionName || '')).slice(0, 40) || 'Style'
    const raw = Array.isArray(body.variants) ? body.variants : []

    // 清洗：label 必填且去重（去重逻辑同时在仓库层兜一次）
    const cleaned: any[] = []
    const seen = new Set<string>()
    for (const v of raw) {
      const label = sanitizeString(String(v?.label || '')).slice(0, 80)
      if (!label || seen.has(label)) continue
      seen.add(label)
      const price = v?.price === '' || v?.price === null || v?.price === undefined ? undefined : Number(v.price)
      if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
        return NextResponse.json({ error: `Invalid price for variant "${label}"` }, { status: 400 })
      }
      cleaned.push({
        id: v?.id ? sanitizeString(String(v.id)) : undefined,
        optionName,
        label,
        valueCode: v?.valueCode ? sanitizeString(String(v.valueCode)).slice(0, 60) : '',
        price,
        image: v?.image ? sanitizeString(String(v.image)) : undefined,
        stock: v?.stock === '' || v?.stock === null || v?.stock === undefined ? undefined : Number(v.stock),
        active: v?.active !== false,
      })
    }

    repo.products.setVariants(productId, cleaned)
    return NextResponse.json({
      ok: true,
      productId,
      optionName,
      variants: repo.products.listVariants(productId),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save variants' }, { status: 500 })
  }
}
