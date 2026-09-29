import type { Product } from '@/lib/db'

/**
 * 前台可见的商品字段投影。
 *
 * 商品对象里带着只有后台该看的字段：
 *   costPrice   成本价（进货价）
 *   supplierId  供应商 ID
 *   supplier    供应商整条记录 —— 公司名、联系人、电话、邮箱
 *
 * 这些字段前台一个组件都不需要，但详情页是把 repo.products.getById() 的结果
 * **整个**交给客户端组件的，于是会被序列化进 RSC payload、出现在页面源码里：
 * 任何人「查看源代码」就能拿到你的进价和整个供应商名录（含联系方式）。
 * 3 个免认证接口（/api/products、/api/products/[id]、/api/search）同样直接吐。
 *
 * 所以数据在离开服务端之前必须过这一层。**新增前台出口时记得也过一遍。**
 *
 * 注意：stock 保留 —— 前台用它显示库存/可售状态。
 */
const INTERNAL_KEYS = ['costPrice', 'supplierId', 'supplier'] as const

export function toPublicProduct<T>(p: T): T {
  if (!p || typeof p !== 'object') return p
  const out: any = { ...(p as any) }
  for (const k of INTERNAL_KEYS) delete out[k]
  // 搭配商品是嵌套在 bundles[].product 里的对象 —— 不一起剥的话，
  // 详情页仍然会从这一层把成本价带出去。
  if (Array.isArray(out.bundles)) {
    out.bundles = out.bundles.map((b: any) =>
      b && typeof b === 'object' && b.product ? { ...b, product: toPublicProduct(b.product) } : b
    )
  }
  return out
}

export function toPublicProducts<T>(list: T[]): T[] {
  return Array.isArray(list) ? list.map(toPublicProduct) : list
}
