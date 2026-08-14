// 库存扣减辅助 (修复 M4): 仅在支付确认 (服务端验证通过) 时扣减, 防止超卖
import { getRepository } from '@/lib/repository'

export interface StockDeductionResult {
  deducted: number
  shortfall: string[]
}

export function deductStockForOrder(order: any): StockDeductionResult {
  const repo = getRepository()
  const shortfall: string[] = []
  let deducted = 0
  for (const item of order?.items || []) {
    const productId = item.productId || item.id
    if (!productId) continue
    const product = repo.products.getById(productId)
    if (!product) continue
    const qty = Number(item.quantity) || 1
    const current = Number(product.stock) || 0
    if (current < qty) {
      shortfall.push(`${item.name || productId} (need ${qty}, have ${current})`)
      continue
    }
    repo.products.update(productId, { stock: current - qty })
    deducted += qty
  }
  return { deducted, shortfall }
}

export function hasStockShortfall(order: any): string[] {
  const repo = getRepository()
  const shortfall: string[] = []
  for (const item of order?.items || []) {
    const productId = item.productId || item.id
    if (!productId) continue
    const product = repo.products.getById(productId)
    const qty = Number(item.quantity) || 1
    const current = product ? Number(product.stock) || 0 : 0
    if (current < qty) {
      shortfall.push(`${item.name || productId} (need ${qty}, have ${current})`)
    }
  }
  return shortfall
}
