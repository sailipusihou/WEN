import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { sanitizeString } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * 配套商品 / 搭配购买（bundle）后台接口。
 *
 * 语义：买某商品时，可以一起加购其它商品，组合成一个套餐价。
 * 前台在商品页右侧展示「Frequently bought together」：
 *   单品价 / 组合优惠 / 总价实时计算，一键把多件一起加进购物车。
 *
 * 与赠品的区别：
 *   赠品（product_gifts）是**免费送**；
 *   搭配（product_bundles）仍然计价，只是组合起来有一个 discount。
 *
 * 鉴权：middleware 已对 /api/products/:path* 的写方法做 admin token 校验，
 * 这里再校验一次，避免中间件被绕过。
 */

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

/** GET：传 productId 取单个商品的搭配；不传返回全部 */
export async function GET(req: NextRequest) {
  try {
    const repo: any = getRepository()
    const productId = new URL(req.url).searchParams.get('productId')
    if (productId) {
      return NextResponse.json({ productId, bundles: repo.products.listBundles(productId) || [] })
    }
    return NextResponse.json({ bundles: repo.products.allBundles?.() || {} })
  } catch {
    return NextResponse.json({ bundles: [] })
  }
}

/**
 * POST：覆盖式保存某商品的搭配。
 * body: { productId, bundles: [{ bundleProductId, title?, description?, image?, price?, discount? }] }
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

    const raw = Array.isArray(body.bundles) ? body.bundles : []
    const cleaned: any[] = []
    const seen = new Set<string>()
    for (const b of raw) {
      const bid = sanitizeString(String(b?.bundleProductId || ''))
      // 不给自己搭配；只保留真实存在的商品
      if (!bid || bid === productId || seen.has(bid)) continue
      if (!repo.products.getById(bid)) continue
      seen.add(bid)

      const price = b?.price === '' || b?.price === null || b?.price === undefined ? undefined : Number(b.price)
      if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
        return NextResponse.json({ error: `Invalid price for bundle item "${bid}"` }, { status: 400 })
      }
      const discount = Number(b?.discount) || 0
      if (discount < 0) {
        return NextResponse.json({ error: `Discount cannot be negative for "${bid}"` }, { status: 400 })
      }

      cleaned.push({
        bundleProductId: bid,
        title: b?.title ? sanitizeString(String(b.title)).slice(0, 80) : '',
        description: b?.description ? sanitizeString(String(b.description)).slice(0, 400) : '',
        image: b?.image ? sanitizeString(String(b.image)) : undefined,
        price,
        discount,
      })
    }

    repo.products.setBundles(productId, cleaned)
    return NextResponse.json({ ok: true, productId, bundles: repo.products.listBundles(productId) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save bundles' }, { status: 500 })
  }
}
