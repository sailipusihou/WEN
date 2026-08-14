export interface CartItem {
  id: string
  name: string
  nameEn: string
  image: string
  price: number
  quantity: number
  category: string
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