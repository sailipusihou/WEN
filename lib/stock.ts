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

/**
 * 回补库存：订单全额退款 / 取消时把此前扣掉的库存加回去。
 * 修复 #8：旧代码只有扣减、没有回补，退款和取消都会造成库存虚耗。
 * 调用方需自行保证只回补一次（本项目用 order.returnInfo.stockRestored 标记）。
 */
export function restoreStockForOrder(order: any): StockDeductionResult {
  const repo = getRepository()
  const shortfall: string[] = []
  let restored = 0
  for (const item of order?.items || []) {
    const productId = item.productId || item.id
    if (!productId) continue
    const product = repo.products.getById(productId)
    if (!product) continue
    const qty = Number(item.quantity) || 1
    const current = Number(product.stock) || 0
    repo.products.update(productId, { stock: current + qty })
    restored += qty
  }
  return { deducted: restored, shortfall }
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
