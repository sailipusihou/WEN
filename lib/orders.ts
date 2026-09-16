import fs from "fs"
import path from "path"
import { getCachedData, invalidateCache, CACHE_TTL } from "@/lib/cache"
import type { PayoneerTransaction } from "@/lib/payoneer-transactions"

export interface OrderItem {
  id: string
  productId?: string
  productCode?: string
  name: string
  nameEn: string
  image: string
  price: number
  quantity: number
  qty?: number
}

export interface ShippingInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  street?: string
  city: string
  state: string
  zipCode: string
  zip?: string
  postcode?: string
  country: string
}

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "return_requested" | "return_approved" | "return_shipped" | "return_delivered" | "refunded"

export interface StatusEvent {
  status: OrderStatus
  timestamp: string
  note?: string
}

export interface TrackingInfo {
  carrier: string
  trackingNumber: string
  estimatedDelivery: string
  actualDelivery?: string
  url?: string
  status?: string
  lastEvent?: string
  lastEventTime?: string
  lastLocation?: string
}

export interface ReturnInfo {
  reason: string
  requestedAt: string
  approvedAt?: string
  shippedAt?: string
  deliveredAt?: string
  refundedAt?: string
  refundAmount?: number
  shippingCost?: number
  trackingNumber?: string
  carrier?: string
  notes?: string
  items?: { id: string; name: string; quantity: number; reason: string }[]
}

export interface PayPalTransactionInfo {
  orderId: string
  captureId?: string
  transactionId?: string
  amount: number
  fee: number
  netAmount: number
  currency: string
  status: "CREATED" | "COMPLETED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "FAILED"
  createdAt: string
  updatedAt?: string
  settlementStatus?: "pending" | "settled"
  settlementDate?: string
  refundId?: string
  refundAmount?: number
  // 服务端向 PayPal 验证过该 capture (防伪造)
  verified?: boolean
}

export interface Order {
  assignedTo?: string
  assignedToName?: string
  assignedToAvatar?: string
  id: string
  orderNo?: string
  userId?: string
  items: OrderItem[]
  shipping: ShippingInfo
  billing?: ShippingInfo
  avatar?: string
  subtotal: number
  discount?: number
  couponCode?: string
  shippingCost: number
  total: number
  currency: string
  status: OrderStatus
  createdAt: string
  notes?: string
  statusHistory?: StatusEvent[]
  tracking?: TrackingInfo
  customerEmail?: string
  customerName?: string
  userEmail?: string
  estimatedDeliveryDays?: number
  returnInfo?: ReturnInfo
  paymentStatus?: "paid" | "unpaid" | "pending_verification" | "refunded"
  /**
   * 待付款催付记录。后台「待付款」专区发过催付邮件后写入，
   * 用于 24 小时冷却判断（避免反复轰炸同一个客户）。
   */
  lastReminderAt?: string
  reminderCount?: number
  paypalTransaction?: PayPalTransactionInfo
  payoneerTransaction?: PayoneerTransaction
  paymentMethod?: "paypal" | "stripe" | "bank_transfer" | "other"
  referralCode?: string
  referralId?: string
  referralVisitorId?: string
  referredByStaffId?: string
  referredByStaffName?: string
  attributionClickId?: string
  attributionModel?: "last_click" | "first_click"
  attributionTouchpoints?: number
  attributionLookbackDays?: number
  attributionMatchedBy?: "visitor" | "referral_code"
  attributionFallbackUsed?: boolean
}

const DATA_DIR = path.join(process.cwd(), "data")
const ORDERS_FILE = path.join(DATA_DIR, "orders.json")

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]", "utf-8")
}

function stripBOM(s: string): string {
  return s.replace(/^\uFEFF/, "").trim()
}

export function getAllOrders(): Order[] {
  ensureFile()
  return getCachedData('orders', ORDERS_FILE, () => {
    const raw = stripBOM(fs.readFileSync(ORDERS_FILE, "utf-8"))
    return JSON.parse(raw)
  }, CACHE_TTL.orders)
}

export function getOrdersByStaffId(staffId: string): Order[] {
  return getAllOrders().filter(o => o.assignedTo === staffId)
}

export function getRevenueDaily(days: number = 7): { date: string; revenue: number; count: number }[] {
  const orders = getAllOrders().filter(o => o.status !== "cancelled")
  const result: { date: string; revenue: number; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const dateStr = d.toISOString().split("T")[0]
    const dayOrders = orders.filter(o => o.createdAt.startsWith(dateStr))
    result.push({
      date: dateStr,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      count: dayOrders.length,
    })
  }
  return result
}

export function getOrderById(id: string): Order | undefined {
  return getAllOrders().find(o => o.id === id)
}

export function getOrdersByUserEmail(email: string): Order[] {
  return getAllOrders().filter(o =>
    o.userEmail === email || o.customerEmail === email || o.shipping?.email === email
  )
}

export function getRecentOrders(days: number = 7): Order[] {
  const since = Date.now() - days * 86400000
  return getAllOrders().filter(o => new Date(o.createdAt).getTime() > since)
}

export function addOrder(order: Order): Order {
  const all = getAllOrders()
  const enriched: Order = {
    ...order,
    statusHistory: [
      { status: "pending", timestamp: new Date().toISOString(), note: "Order placed" },
    ],
  }
  all.unshift(enriched)
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(all, null, 2), "utf-8")
  invalidateCache('orders')
  return enriched
}

export function updateOrder(id: string, updates: Partial<Order>): Order | null {
  const all = getAllOrders()
  const idx = all.findIndex(o => o.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...updates }
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(all, null, 2), "utf-8")
  invalidateCache('orders')
  return all[idx]
}

export function updateOrderStatus(
  id: string,
  status: OrderStatus,
  note?: string,
  tracking?: TrackingInfo
): Order | null {
  const all = getAllOrders()
  const idx = all.findIndex(o => o.id === id)
  if (idx === -1) return null

  all[idx] = {
    ...all[idx],
    status,
    tracking: tracking || all[idx].tracking,
    statusHistory: [
      ...(all[idx].statusHistory || []),
      { status, timestamp: new Date().toISOString(), note: note || getDefaultNote(status) },
    ],
  }
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(all, null, 2), "utf-8")
  invalidateCache('orders')
  return all[idx]
}

export function updateOrderTracking(id: string, tracking: TrackingInfo): Order | null {
  const all = getAllOrders()
  const idx = all.findIndex(o => o.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], tracking }
  if (all[idx].status === "processing" || all[idx].status === "confirmed") {
    all[idx].status = "shipped"
    all[idx].statusHistory = [
      ...(all[idx].statusHistory || []),
      { status: "shipped", timestamp: new Date().toISOString(), note: "Package shipped with " + tracking.carrier },
    ]
  }
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(all, null, 2), "utf-8")
  invalidateCache('orders')
  return all[idx]
}

export function updateOrderNotes(id: string, notes: string): Order | null {
  const all = getAllOrders()
  const idx = all.findIndex(o => o.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], notes }
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(all, null, 2), "utf-8")
  invalidateCache('orders')
  return all[idx]
}

export function getOrderStats() {
  const all = getAllOrders()
  return {
    total: all.length,
    pending: all.filter(o => o.status === "pending").length,
    confirmed: all.filter(o => o.status === "confirmed").length,
    processing: all.filter(o => o.status === "processing").length,
    shipped: all.filter(o => o.status === "shipped").length,
    delivered: all.filter(o => o.status === "delivered").length,
    cancelled: all.filter(o => o.status === "cancelled").length,
    revenue: all.reduce((s, o) => s + (o.status !== "cancelled" ? o.total : 0), 0),
  }
}

export function assignOrderToStaff(id: string, staffId: string, staffName?: string, staffAvatar?: string): Order | null {
  const all = getAllOrders()
  const idx = all.findIndex(o => o.id === id)
  if (idx === -1) return null
  all[idx] = {
    ...all[idx],
    assignedTo: staffId,
    assignedToName: staffName,
    assignedToAvatar: staffAvatar,
    statusHistory: [
      ...(all[idx].statusHistory || []),
      { status: all[idx].status, timestamp: new Date().toISOString(), note: "Assigned to " + staffName },
    ],
  }
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(all, null, 2), "utf-8")
  invalidateCache('orders')
  return all[idx]
}

function getDefaultNote(status: OrderStatus): string {
  const notes: Record<OrderStatus, string> = {
    pending: "Order placed",
    confirmed: "Order confirmed, preparing for shipment",
    processing: "Order is being processed",
    shipped: "Package shipped",
    delivered: "Package delivered",
    cancelled: "Order cancelled",
    return_requested: "Return requested",
    return_approved: "Return approved",
    return_shipped: "Return shipped",
    return_delivered: "Return delivered",
    refunded: "Refund processed",
  }
  return notes[status] || "Status updated"
}

