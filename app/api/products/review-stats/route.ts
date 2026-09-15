import { NextResponse } from 'next/server'
import { getRepository } from '@/lib/repository'

export const dynamic = 'force-dynamic'

/**
 * 全站真实评价统计（给「Shop with Confidence」信任区用）。
 *
 * 只返回**真实聚合出来的数字**：已审核、未隐藏、未删除的评价条数与平均分。
 * 没有评价时返回 0，前端就不显示那一行 —— 绝不编造评分或数量。
 */
export async function GET() {
  try {
    const repo = getRepository()
    const products = repo.products.list()
    let count = 0
    let sum = 0
    for (const p of products) {
      const r = Number((p as any).reviewCount) || 0
      const rating = Number((p as any).rating) || 0
      if (r > 0 && rating > 0) {
        count += r
        sum += rating * r
      }
    }
    const rating = count > 0 ? Math.round((sum / count) * 10) / 10 : 0
    return NextResponse.json({ count, rating }, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch {
    return NextResponse.json({ count: 0, rating: 0 })
  }
}
