import { getRepository } from './repository'

export interface AINotification {
  id: string
  type: 'new_order' | 'low_stock' | 'daily_brief' | 'shipping_reminder' | 'anomaly' | 'weekly_report'
  title: string
  content: string
  data?: any
  read: boolean
  createdAt: string
  aiAnalysis?: string
}

const NOTIFICATIONS_FILE = 'notifications.json'
let notificationsCache: AINotification[] | null = null
let lastOrderCheckTime = 0
let lastStockCheckTime = 0
let lastDailyBriefDate = ''
let lastWeeklyReportWeek = ''

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function loadNotifications(): AINotification[] {
  if (notificationsCache) return notificationsCache
  try {
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(process.cwd(), 'data', NOTIFICATIONS_FILE)
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '').trim()
      const parsed = JSON.parse(raw)
      notificationsCache = Array.isArray(parsed) ? parsed : []
      return notificationsCache
    }
  } catch {}
  notificationsCache = []
  return notificationsCache
}

function saveNotifications(notifications: AINotification[]) {
  notificationsCache = notifications
  try {
    const fs = require('fs')
    const path = require('path')
    const dataDir = path.join(process.cwd(), 'data')
    const filePath = path.join(dataDir, NOTIFICATIONS_FILE)
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(notifications, null, 2), 'utf-8')
  } catch (e) {
    console.error('[Notifications] Failed to save:', e)
  }
}

export function getNotifications(options?: { limit?: number; unreadOnly?: boolean }): AINotification[] {
  let notifs = loadNotifications()
  if (options?.unreadOnly) {
    notifs = notifs.filter(n => !n.read)
  }
  if (options?.limit) {
    notifs = notifs.slice(0, options.limit)
  }
  return notifs
}

export function getUnreadCount(): number {
  return loadNotifications().filter(n => !n.read).length
}

export function markAsRead(id?: string): void {
  const notifs = loadNotifications()
  if (id) {
    const idx = notifs.findIndex(n => n.id === id)
    if (idx >= 0) {
      notifs[idx].read = true
      saveNotifications(notifs)
    }
  } else {
    for (const n of notifs) n.read = true
    saveNotifications(notifs)
  }
}

export function addNotification(notification: Omit<AINotification, 'id' | 'createdAt' | 'read'>): AINotification {
  const notifs = loadNotifications()
  const newNotif: AINotification = {
    ...notification,
    id: 'NOTIF-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    read: false,
  }
  notifs.unshift(newNotif)
  if (notifs.length > 100) {
    notifs.length = 100
  }
  saveNotifications(notifs)
  return newNotif
}

export async function checkNewOrders(): Promise<AINotification | null> {
  const now = Date.now()
  if (now - lastOrderCheckTime < 30000) return null
  lastOrderCheckTime = now

  try {
    const repo = getRepository()
    const orders = repo.orders.list()

    const checkWindow = 5 * 60 * 1000
    const recentOrders = orders.filter((o: any) => {
      const orderTime = new Date(o.createdAt).getTime()
      return now - orderTime < checkWindow
    })

    if (recentOrders.length === 0) return null

    const lastNotif = loadNotifications().find(n => n.type === 'new_order')
    if (lastNotif) {
      const lastNotifTime = new Date(lastNotif.createdAt).getTime()
      const newSinceLast = recentOrders.filter((o: any) => new Date(o.createdAt).getTime() > lastNotifTime)
      if (newSinceLast.length === 0) return null
      recentOrders.length = 0
      recentOrders.push(...newSinceLast)
    }

    if (recentOrders.length === 0) return null

    const totalAmount = recentOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
    const orderIds = recentOrders.map((o: any) => o.id).join(', ')

    let analysis = ''
    try {
      analysis = await generateOrderAnalysis(recentOrders)
    } catch {}

    const notif = addNotification({
      type: 'new_order',
      title: recentOrders.length > 1
        ? `📦 新订单通知 (${recentOrders.length}单)`
        : '📦 新订单通知',
      content: recentOrders.length > 1
        ? `新增 ${recentOrders.length} 个订单，总金额 $${totalAmount.toFixed(2)}`
        : `订单号 ${recentOrders[0].id}，金额 $${recentOrders[0].total.toFixed(2)}`,
      data: {
        orderIds: recentOrders.map((o: any) => o.id),
        totalAmount,
        count: recentOrders.length,
      },
      aiAnalysis: analysis,
    })

    return notif
  } catch (e) {
    console.error('[Notifications] Check new orders error:', e)
    return null
  }
}

async function generateOrderAnalysis(orders: any[]): Promise<string> {
  const repo = getRepository()
  const settings = repo.settings.get()

  if (!settings.aiEnabled || !settings.aiApiKey) return ''

  const baseUrl = settings.aiBaseUrl || 'https://api.deepseek.com/v1'
  const model = settings.aiModel || 'deepseek-chat'

  const orderSummary = orders.map((o: any) => ({
    id: o.id,
    total: o.total,
    items: o.items?.map((i: any) => ({ name: i.name || i.nameEn, qty: i.quantity })),
    customer: o.customerName || o.shipping?.firstName + ' ' + o.shipping?.lastName,
  }))

  const prompt = `You are a sharp e-commerce operations assistant.
Given these new orders, give a SHORT (2-3 sentences) analysis/highlight for the store owner.
Focus on: notable items, high-value orders, customer insights, or anything worth attention.
Keep it friendly but concise, in Chinese.

Orders: ${JSON.stringify(orderSummary)}`

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature: 0.7,
        max_tokens: 300,
      }),
    })

    if (!res.ok) return ''
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch {
    return ''
  }
}

export async function checkLowStock(): Promise<AINotification | null> {
  const now = Date.now()
  if (now - lastStockCheckTime < 60 * 60 * 1000) return null
  lastStockCheckTime = now

  try {
    const repo = getRepository()
    const products = repo.products.list()

    const lowStock = products.filter((p: any) => {
      const stock = p.stock ?? p.inventory ?? 100
      return stock > 0 && stock < 10
    })

    const outOfStock = products.filter((p: any) => {
      const stock = p.stock ?? p.inventory ?? 100
      return stock <= 0
    })

    if (lowStock.length === 0 && outOfStock.length === 0) return null

    const lastNotif = loadNotifications().find(n => n.type === 'low_stock')
    if (lastNotif) {
      const hoursSince = (now - new Date(lastNotif.createdAt).getTime()) / (1000 * 60 * 60)
      if (hoursSince < 6) return null
    }

    const notif = addNotification({
      type: 'low_stock',
      title: '⚠️ 库存预警',
      content: lowStock.length > 0
        ? `${lowStock.length} 款商品库存不足，${outOfStock.length} 款已售罄`
        : `${outOfStock.length} 款商品已售罄`,
      data: {
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        lowStockItems: lowStock.slice(0, 5).map((p: any) => ({ id: p.id, name: p.name || p.nameEn, stock: p.stock ?? p.inventory })),
      },
    })

    return notif
  } catch (e) {
    console.error('[Notifications] Check low stock error:', e)
    return null
  }
}

export async function checkDailyBrief(): Promise<AINotification | null> {
  const now = new Date()
  const today = startOfDay(now).toISOString().split('T')[0]

  if (lastDailyBriefDate === today) return null

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const lastNotif = loadNotifications().find(n => n.type === 'daily_brief')
  if (lastNotif) {
    const notifDate = new Date(lastNotif.createdAt).toISOString().split('T')[0]
    if (notifDate === today) {
      lastDailyBriefDate = today
      return null
    }
  }

  if (now.getHours() < 8) return null

  try {
    const repo = getRepository()
    const orders = repo.orders.list()
    const products = repo.products.list()
    const users = repo.users.list()
    const messages = repo.messages.list()

    const dayStart = startOfDay(yesterday).getTime()
    const dayEnd = endOfDay(yesterday).getTime()

    const yesterdaysOrders = orders.filter((o: any) => {
      const t = new Date(o.createdAt).getTime()
      return t >= dayStart && t <= dayEnd
    })

    const totalRevenue = yesterdaysOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
    const avgOrderValue = yesterdaysOrders.length > 0 ? totalRevenue / yesterdaysOrders.length : 0

    const newCustomers = users.filter((u: any) => {
      const t = new Date(u.createdAt || u.registeredAt || 0).getTime()
      return t >= dayStart && t <= dayEnd
    })

    const newMessages = messages.filter((m: any) => {
      const t = new Date(m.createdAt).getTime()
      return t >= dayStart && t <= dayEnd
    })

    const lowStock = products.filter((p: any) => {
      const stock = p.stock ?? p.inventory ?? 100
      return stock > 0 && stock < 10
    })

    const brief = `📅 ${yesterdayStr} 运营日报

📊 概览
• 订单数：${yesterdaysOrders.length} 单
• 销售额：$${totalRevenue.toFixed(2)}
• 客单价：$${avgOrderValue.toFixed(2)}

👥 客户
• 新注册：${newCustomers.length} 人
• 新留言：${newMessages.length} 条

📦 库存
• 商品总数：${products.length} 款
• 库存不足：${lowStock.length} 款`

    let aiAnalysis = ''
    try {
      aiAnalysis = await generateDailyBriefAnalysis({
        orders: yesterdaysOrders.length,
        revenue: totalRevenue,
        avgOrderValue,
        newCustomers: newCustomers.length,
        newMessages: newMessages.length,
        lowStock: lowStock.length,
        date: yesterdayStr,
      })
    } catch {}

    const notif = addNotification({
      type: 'daily_brief',
      title: `📊 每日简报 · ${yesterdayStr}`,
      content: `${yesterdaysOrders.length} 单 · $${totalRevenue.toFixed(2)} · ${newCustomers.length} 位新客户`,
      data: {
        date: yesterdayStr,
        orders: yesterdaysOrders.length,
        revenue: totalRevenue,
        avgOrderValue,
        newCustomers: newCustomers.length,
        newMessages: newMessages.length,
        lowStock: lowStock.length,
      },
      aiAnalysis: aiAnalysis || brief,
    })

    lastDailyBriefDate = today
    return notif
  } catch (e) {
    console.error('[Notifications] Daily brief error:', e)
    return null
  }
}

async function generateDailyBriefAnalysis(stats: any): Promise<string> {
  const repo = getRepository()
  const settings = repo.settings.get()

  if (!settings.aiEnabled || !settings.aiApiKey) return ''

  const baseUrl = settings.aiBaseUrl || 'https://api.deepseek.com/v1'
  const model = settings.aiModel || 'deepseek-chat'

  const prompt = `You are an experienced e-commerce operations analyst.
Given yesterday's store data, write a SHORT (3-5 sentences) operations summary and insight in Chinese.
Focus on: what went well, what needs attention, and 1-2 actionable suggestions.
Keep it friendly, concise, and data-backed.

Yesterday's data:
- Date: ${stats.date}
- Orders: ${stats.orders}
- Revenue: $${stats.revenue.toFixed(2)}
- Average order value: $${stats.avgOrderValue.toFixed(2)}
- New customers: ${stats.newCustomers}
- New messages: ${stats.newMessages}
- Low stock items: ${stats.lowStock}`

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature: 0.7,
        max_tokens: 400,
      }),
    })

    if (!res.ok) return ''
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch {
    return ''
  }
}

export async function checkOrderAnomalies(): Promise<AINotification | null> {
  const repo = getRepository()
  const orders = repo.orders.list()

  if (orders.length === 0) return null

  const now = Date.now()
  const anomalies: any[] = []

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
  const avgOrderValue = totalRevenue / orders.length
  const highValueThreshold = avgOrderValue * 5

  const customerOrderCount: Record<string, number> = {}
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

  for (const order of orders) {
    const o = order as any
    const customerEmail = o.customerEmail || o.userEmail || 'unknown'
    const orderTime = new Date(o.createdAt).getTime()

    if (o.total > highValueThreshold) {
      anomalies.push({
        type: 'high_value',
        orderId: o.id,
        description: `超高金额订单：$${o.total?.toFixed(2)}（平均客单价 $${avgOrderValue.toFixed(2)}）`,
        total: o.total,
        customer: customerEmail,
      })
    }

    if (orderTime >= twentyFourHoursAgo) {
      customerOrderCount[customerEmail] = (customerOrderCount[customerEmail] || 0) + 1
    }
  }

  for (const [email, count] of Object.entries(customerOrderCount)) {
    if (count >= 3) {
      const customerOrders = orders.filter((o: any) => {
        const oe = o.customerEmail || o.userEmail
        return oe === email && new Date(o.createdAt).getTime() >= twentyFourHoursAgo
      })
      anomalies.push({
        type: 'frequent_orders',
        customer: email,
        count,
        description: `客户 ${email} 24 小时内下单 ${count} 次`,
        orderIds: customerOrders.map((o: any) => o.id),
      })
    }
  }

  const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled' && new Date(o.createdAt).getTime() >= twentyFourHoursAgo)
  if (cancelledOrders.length >= 2) {
    anomalies.push({
      type: 'high_cancellation',
      count: cancelledOrders.length,
      description: `24 小时内有 ${cancelledOrders.length} 个取消订单`,
      orderIds: cancelledOrders.map((o: any) => o.id),
    })
  }

  if (anomalies.length === 0) return null

  const lastAnomalyNotif = loadNotifications().find(
    (n: AINotification) => n.type === 'anomaly'
  )
  if (lastAnomalyNotif) {
    const lastTime = new Date(lastAnomalyNotif.createdAt).getTime()
    if (now - lastTime < 12 * 60 * 60 * 1000) {
      return null
    }
  }

  const notif = addNotification({
    type: 'anomaly',
    title: `🚨 检测到 ${anomalies.length} 个订单异常`,
    content: anomalies.map((a: any) => a.description).join('；'),
    data: { anomalies },
    aiAnalysis: await generateAnomalyAnalysis(anomalies, avgOrderValue),
  })

  return notif
}

async function generateAnomalyAnalysis(anomalies: any[], avgOrderValue: number): Promise<string> {
  try {
    const settings = getRepository().settings.get()
    if (!settings.aiEnabled || !settings.aiApiKey) return ''

    const baseUrl = settings.aiBaseUrl || getProviderBaseUrl(settings.aiProvider)
    const model = settings.aiModel || getDefaultModel(settings.aiProvider)

    const prompt = `You are an e-commerce operations analyst.
Analyze these order anomalies and provide a brief (3-5 sentence) Chinese analysis with actionable suggestions.

Anomalies found: ${anomalies.length}
Average order value: $${avgOrderValue.toFixed(2)}

Anomaly details:
${anomalies.map((a, i) => `${i + 1}. [${a.type}] ${a.description}`).join('\n')}

Provide your analysis in Chinese, be concise and practical.`

    const res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      }),
    })

    if (!res.ok) return ''
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch {
    return ''
  }
}

function getProviderBaseUrl(provider: string): string {
  const map: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  }
  return map[provider] || map.openai
}

function getDefaultModel(provider: string): string {
  const map: Record<string, string> = {
    openai: 'gpt-4o-mini',
    deepseek: 'deepseek-chat',
    anthropic: 'claude-3-sonnet-20240229',
    qwen: 'qwen-plus',
    zhipu: 'glm-4-flash',
  }
  return map[provider] || map.openai
}

export async function checkWeeklyReport(): Promise<AINotification | null> {
  const now = new Date()
  const dayOfWeek = now.getDay()

  if (dayOfWeek !== 1) return null

  const year = now.getFullYear()
  const month = now.getMonth()
  const date = now.getDate()
  const weekKey = `${year}-${month}-${date}`

  if (lastWeeklyReportWeek === weekKey) return null
  if (now.getHours() < 9) return null

  const repo = getRepository()
  const orders = repo.orders.list()
  const products = repo.products.list()
  const users = repo.users.list()
  const messages = repo.messages.list()

  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(now)
  weekEnd.setHours(23, 59, 59, 999)

  const weekStartTs = weekStart.getTime()
  const weekEndTs = weekEnd.getTime()

  const weekOrders = orders.filter((o: any) => {
    const t = new Date(o.createdAt).getTime()
    return t >= weekStartTs && t <= weekEndTs
  })

  const totalRevenue = weekOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
  const avgOrderValue = weekOrders.length > 0 ? totalRevenue / weekOrders.length : 0

  const productSales: Record<string, { name: string; quantity: number }> = {}
  for (const o of weekOrders) {
    for (const item of (o as any).items || []) {
      const pid = item.productId || item.id
      const name = item.name || item.nameEn || pid
      if (!productSales[pid]) productSales[pid] = { name, quantity: 0 }
      productSales[pid].quantity += item.quantity || 0
    }
  }
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  const newCustomers = users.filter((u: any) => {
    const t = new Date(u.createdAt).getTime()
    return t >= weekStartTs && t <= weekEndTs
  }).length

  const newMessages = messages.filter((m: any) => {
    const t = new Date(m.createdAt).getTime()
    return t >= weekStartTs && t <= weekEndTs
  }).length

  const lowStockProducts = products.filter((p: any) => {
    const stock = p.stock ?? p.inventory ?? 0
    return stock < 10 && stock > 0
  }).length
  const outOfStockProducts = products.filter((p: any) => {
    const stock = p.stock ?? p.inventory ?? 0
    return stock === 0
  }).length

  const startDateStr = weekStart.toISOString().split('T')[0]
  const endDateStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const notif = addNotification({
    type: 'weekly_report',
    title: `📊 周报 · ${startDateStr} ~ ${endDateStr}`,
    content: `${weekOrders.length} 单 · $${totalRevenue.toFixed(2)} · 新客 ${newCustomers} 人`,
    data: {
      period: { start: startDateStr, end: endDateStr },
      orders: weekOrders.length,
      revenue: totalRevenue,
      avgOrderValue,
      topProducts,
      newCustomers,
      newMessages,
      inventory: { lowStock: lowStockProducts, outOfStock: outOfStockProducts },
    },
    aiAnalysis: await generateWeeklyReportAnalysis({
      orders: weekOrders.length,
      revenue: totalRevenue,
      avgOrderValue,
      topProducts,
      newCustomers,
      newMessages,
      inventory: { lowStock: lowStockProducts, outOfStock: outOfStockProducts },
    }),
  })

  lastWeeklyReportWeek = weekKey
  return notif
}

async function generateWeeklyReportAnalysis(data: any): Promise<string> {
  try {
    const settings = getRepository().settings.get()
    if (!settings.aiEnabled || !settings.aiApiKey) return ''

    const baseUrl = settings.aiBaseUrl || getProviderBaseUrl(settings.aiProvider)
    const model = settings.aiModel || getDefaultModel(settings.aiProvider)

    const prompt = `You are an experienced e-commerce operations analyst.
Write a brief weekly operations report analysis in Chinese (150-200 words).

Weekly summary:
- Orders: ${data.orders}
- Revenue: $${data.revenue.toFixed(2)}
- AOV: $${data.avgOrderValue.toFixed(2)}
- New customers: ${data.newCustomers}
- New messages: ${data.newMessages}
- Top products: ${data.topProducts.map((p: any) => `${p.name}(${p.quantity})`).join(', ') || 'N/A'}
- Low stock: ${data.inventory.lowStock}, Out of stock: ${data.inventory.outOfStock}

Structure:
1. Brief performance summary
2. 2-3 key highlights/positives
3. 1-2 areas for attention or improvement
4. 1 concrete actionable suggestion

Keep it concise, data-driven, and practical. Write in Chinese.`

    const res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
      }),
    })

    if (!res.ok) return ''
    const data2 = await res.json()
    return data2.choices?.[0]?.message?.content || ''
  } catch {
    return ''
  }
}

export async function checkAll(): Promise<AINotification[]> {
  const newNotifs: AINotification[] = []

  const orderNotif = await checkNewOrders()
  if (orderNotif) newNotifs.push(orderNotif)

  const stockNotif = await checkLowStock()
  if (stockNotif) newNotifs.push(stockNotif)

  const briefNotif = await checkDailyBrief()
  if (briefNotif) newNotifs.push(briefNotif)

  const anomalyNotif = await checkOrderAnomalies()
  if (anomalyNotif) newNotifs.push(anomalyNotif)

  const weeklyNotif = await checkWeeklyReport()
  if (weeklyNotif) newNotifs.push(weeklyNotif)

  return newNotifs
}
