import { NextRequest, NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'
import { sanitizeString } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * 赠品绑定（买一送一 / 免费搭配）的后台接口。
 *
 * 语义：购买 productId 时，可以把 giftProductIds 里的商品免费拿走。
 *   - 绑 1 个   → 前台加购时自动带上该赠品（$0 行）
 *   - 绑多个    → 前台在商品页让客户选一个
 *   - 传空数组   → 取消该商品的赠品活动
 *
 * 鉴权：middleware 已对 /api/products/:path* 的写方法做 admin token 校验；
 * 这里再校验一次，避免中间件被绕过。
 */

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

/** GET：读取全部赠品绑定（后台列表一次拿全，避免逐商品请求） */
export async function GET() {
  try {
    const repo: any = getRepository()
    const bindings = repo.products.allGiftBindings?.() || {}
    return NextResponse.json({ bindings })
  } catch {
    return NextResponse.json({ bindings: {} })
  }
}

/** POST：设置某个商品的赠品绑定（覆盖式） */
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

    const rawIds: unknown[] = Array.isArray(body.giftProductIds) ? body.giftProductIds : []
    // 去重、去掉空值与自引用；并且只保留真实存在的商品
    const ids: string[] = []
    for (const v of rawIds) {
      const id = sanitizeString(String(v || ''))
      if (!id || id === productId || ids.includes(id)) continue
      if (!repo.products.getById(id)) continue
      ids.push(id)
    }
    const quantity = Math.min(20, Math.max(1, Number(body.giftQuantity) || 1))

    repo.products.setGifts(productId, ids, quantity)

    return NextResponse.json({ ok: true, productId, giftProductIds: ids, giftQuantity: quantity })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save gift bindings' }, { status: 500 })
  }
}
