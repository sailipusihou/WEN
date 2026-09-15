export interface CartItem {
  id: string
  name: string
  nameEn: string
  image: string
  price: number
  quantity: number
  category: string
  /**
   * 赠品行标记 —— 买一送一 / 免费搭配带进来的免费商品。
   *
   * ⚠️ 这只是「客户端请求」，不是裁决。真正的免费与否由服务端按 product_gifts 表
   * 独立核算（见 app/api/orders/route.ts 的赠品额度逻辑）：
   * 前端标了但额度不够时照原价计费，所以无法用它白拿东西。
   */
  isGift?: boolean
  /** 赠品属于哪个主商品（主商品从购物车移除时连带清掉赠品） */
  giftFor?: string
}

export type Currency = 'USD' | 'CNY'

export const CNY_TO_USD = 7.2

// 价格基准货币为 USD (商品价格/订单金额均以 USD 存储)。
// convertPrice 把 USD 基础价换算到目标展示币种; CNY 展示 = USD × 7.2
export function convertPrice(usd: number, to: Currency): number {
  if (to === 'CNY') return Math.round(usd * CNY_TO_USD * 100) / 100
  return usd
}

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'USD') return '$' + amount.toFixed(2)
  return '\u00A5' + Math.round(amount).toString()
}

export interface ShippingInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
}