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

export function convertPrice(cny: number, to: Currency): number {
  if (to === 'USD') return Math.round((cny / CNY_TO_USD) * 100) / 100
  return cny
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