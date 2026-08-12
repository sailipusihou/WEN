import fs from 'fs'
import path from 'path'
import { buildReferralBioLandingUrl } from '@/lib/referral-links'

const DATA_DIR = path.join(process.cwd(), 'data')
const REFERRAL_FILE = path.join(DATA_DIR, 'referrals.json')
const CLICK_FILE = path.join(DATA_DIR, 'referral-clicks.json')

export interface ReferralLink {
  id: string
  staffId: string
  staffName: string
  staffAvatar?: string
  platform: string
  platformUsername?: string
  productId?: string
  productName?: string
  url: string
  code: string
  createdAt: string
  status: 'active' | 'inactive'
  clicks: number
  conversions: number
  revenue: number
  // 发布内容相关字段
  contentTitle?: string
  contentBody?: string
  hashtags?: string
  contentType?: string
  tone?: string
  publishedAt?: string
  preferredSourceChannel?: 'bio' | 'story' | 'post' | 'direct'
}

export interface ReferralClick {
  id: string
  referralId: string
  referralCode: string
  staffId: string
  platform: string
  visitorId: string
  ip: string
  userAgent: string
  page: string
  query?: string
  sourceChannel?: 'bio' | 'story' | 'post' | 'direct'
  createdAt: string
  converted: boolean
  orderId?: string
}

export type AttributionModel = 'last_click' | 'first_click' | 'multi_touch'

export interface AttributedTouchpoint {
  click: ReferralClick
  weight: number
}

export interface ReferralAttributionResult {
  click: ReferralClick // 主归因点击（last/first），在 multi_touch 下为权重最高的那个
  touchpoints: AttributedTouchpoint[] // 支持加权多触点
  model: AttributionModel
  lookbackDays: number
  totalTouchpointsCount: number // 总触点数量
  matchedBy: 'visitor' | 'referral_code' | 'cross_device'
  fallbackUsed: boolean
}

function ensureFile(file: string): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '[]', 'utf-8')
  }
}

export function getAllReferralLinks(): ReferralLink[] {
  ensureFile(REFERRAL_FILE)
  const raw = fs.readFileSync(REFERRAL_FILE, 'utf-8').replace(/^\uFEFF/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.sort((a: ReferralLink, b: ReferralLink) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) : []
  } catch {
    return []
  }
}

export function getReferralLinkById(id: string): ReferralLink | undefined {
  return getAllReferralLinks().find(l => l.id === id)
}

export function getReferralLinkByCode(code: string): ReferralLink | undefined {
  return getAllReferralLinks().find(l => l.code === code && l.status === 'active')
}

export function getReferralLinksByStaffId(staffId: string): ReferralLink[] {
  return getAllReferralLinks().filter(l => l.staffId === staffId)
}

export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const existing = getAllReferralLinks().find(l => l.code === code)
  return existing ? generateReferralCode() : code
}

export function createReferralLink(data: {
  staffId: string
  staffName: string
  staffAvatar?: string
  platform: string
  platformUsername?: string
  productId?: string
  productName?: string
  contentTitle?: string
  contentBody?: string
  hashtags?: string
  contentType?: string
  tone?: string
  publishedAt?: string
  preferredSourceChannel?: 'bio' | 'story' | 'post' | 'direct'
}): ReferralLink {
  ensureFile(REFERRAL_FILE)
  const links = getAllReferralLinks()
  const code = generateReferralCode()
  const link: ReferralLink = {
    id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    staffId: data.staffId,
    staffName: data.staffName,
    staffAvatar: data.staffAvatar,
    platform: data.platform,
    platformUsername: data.platformUsername,
    productId: data.productId,
    productName: data.productName,
    url: buildReferralBioLandingUrl({
      code,
      productId: data.productId,
    }),
    code,
    createdAt: new Date().toISOString(),
    status: 'active',
    clicks: 0,
    conversions: 0,
    revenue: 0,
    contentTitle: data.contentTitle,
    contentBody: data.contentBody,
    hashtags: data.hashtags,
    contentType: data.contentType,
    tone: data.tone,
    publishedAt: data.publishedAt || new Date().toISOString(),
    preferredSourceChannel: data.preferredSourceChannel || 'bio',
  }
  links.unshift(link)
  fs.writeFileSync(REFERRAL_FILE, JSON.stringify(links, null, 2), 'utf-8')
  return link
}

export function updateReferralLink(id: string, updates: Partial<ReferralLink>): ReferralLink | null {
  ensureFile(REFERRAL_FILE)
  const links = getAllReferralLinks()
  const idx = links.findIndex(l => l.id === id)
  if (idx < 0) return null
  links[idx] = {
    ...links[idx],
    ...updates,
    id: links[idx].id,
    createdAt: links[idx].createdAt,
  }
  fs.writeFileSync(REFERRAL_FILE, JSON.stringify(links, null, 2), 'utf-8')
  return links[idx]
}

export function deleteReferralLink(id: string): boolean {
  ensureFile(REFERRAL_FILE)
  const links = getAllReferralLinks()
  const next = links.filter(l => l.id !== id)
  if (next.length === links.length) return false
  fs.writeFileSync(REFERRAL_FILE, JSON.stringify(next, null, 2), 'utf-8')
  return true
}

export function recordReferralClick(data: {
  referralId: string
  referralCode: string
  staffId: string
  platform: string
  visitorId: string
  ip: string
  userAgent: string
  page: string
  query?: string
  sourceChannel?: 'bio' | 'story' | 'post' | 'direct'
}): ReferralClick {
  ensureFile(CLICK_FILE)
  const clicks = getAllReferralClicks()
  const click: ReferralClick = {
    id: `click_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    referralId: data.referralId,
    referralCode: data.referralCode,
    staffId: data.staffId,
    platform: data.platform,
    visitorId: data.visitorId,
    ip: data.ip,
    userAgent: data.userAgent,
    page: data.page,
    query: data.query,
    sourceChannel: data.sourceChannel || 'direct',
    createdAt: new Date().toISOString(),
    converted: false,
  }
  clicks.unshift(click)
  fs.writeFileSync(CLICK_FILE, JSON.stringify(clicks, null, 2), 'utf-8')
  const link = getReferralLinkById(data.referralId)
  if (link) {
    updateReferralLink(data.referralId, { clicks: link.clicks + 1 })
  }
  return click
}

export function getAllReferralClicks(): ReferralClick[] {
  ensureFile(CLICK_FILE)
  const raw = fs.readFileSync(CLICK_FILE, 'utf-8').replace(/^\uFEFF/, '')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.sort((a: ReferralClick, b: ReferralClick) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) : []
  } catch {
    return []
  }
}

export function getReferralClickByOrderId(orderId: string): ReferralClick | undefined {
  return getAllReferralClicks().find(click => click.orderId === orderId)
}

export function findAttributableReferralClick(data: {
  referralCode: string
  visitorId?: string
  userId?: string // 用于 cross_device 归因
  lookbackDays?: number
  model?: AttributionModel
  requireVisitorMatch?: boolean
  allowReferralFallback?: boolean
}): ReferralAttributionResult | undefined {
  const lookbackDays = data.lookbackDays || 7
  const minCreatedAt = Date.now() - lookbackDays * 24 * 60 * 60 * 1000

  // 1. 获取所有符合时间窗、未转化的点击，不局限于 referralCode（如果是跨设备/多触点，可能会找到其它 code，但目前先根据 code 过滤或扩展）
  // 注意：在完整多触点中，应该查出该 visitor 的所有点击。这里按原逻辑保留，但扩展匹配。
  // 为了真正的多触点，我们查找该 visitor/user 的所有近期点击
  let baseClicks = getAllReferralClicks().filter(click =>
    !click.converted &&
    new Date(click.createdAt).getTime() >= minCreatedAt
  )

  // 筛选出匹配该次购买的点击
  let eligibleClicks = baseClicks.filter(click => {
    // 跨设备：如果传了 userId 且在系统里能关联，可以查 cross_device。简化版：只要传了 referralCode 就优先匹配
    // 这里我们依然以传上来的 referralCode 或 visitorId 为主
    const matchCode = data.referralCode && click.referralCode === data.referralCode
    const matchVisitor = data.visitorId && click.visitorId === data.visitorId
    // 如果没有 requireVisitorMatch，匹配 code 也可以；如果 requireVisitorMatch，必须 matchVisitor
    if (data.requireVisitorMatch && !data.allowReferralFallback) {
      return matchVisitor
    }
    return matchCode || matchVisitor
  })

  if (eligibleClicks.length === 0) return undefined

  const model: AttributionModel = data.model || 'last_click'
  
  // 按时间降序排序（最新的在最前，[0] 是 last_click, [length-1] 是 first_click）
  eligibleClicks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  let matchedBy: 'visitor' | 'referral_code' | 'cross_device' = 'referral_code'
  let fallbackUsed = false

  // 判断主要匹配方式
  const hasVisitorMatch = eligibleClicks.some(c => c.visitorId === data.visitorId)
  if (hasVisitorMatch) {
    matchedBy = 'visitor'
    // 这里未来可以扩展：如果 visitorId 不匹配但 userId 匹配，则为 cross_device
  } else {
    fallbackUsed = !!data.visitorId
  }

  // 仅针对 match 的点击集合做权重分配
  const targetClicks = hasVisitorMatch ? eligibleClicks.filter(c => c.visitorId === data.visitorId) : eligibleClicks

  let touchpoints: AttributedTouchpoint[] = []
  let primaryClick = targetClicks[0]

  if (model === 'last_click') {
    primaryClick = targetClicks[0]
    touchpoints = [{ click: primaryClick, weight: 1.0 }]
  } else if (model === 'first_click') {
    primaryClick = targetClicks[targetClicks.length - 1]
    touchpoints = [{ click: primaryClick, weight: 1.0 }]
  } else if (model === 'multi_touch') {
    const n = targetClicks.length
    if (n === 1) {
      primaryClick = targetClicks[0]
      touchpoints = [{ click: primaryClick, weight: 1.0 }]
    } else if (n === 2) {
      primaryClick = targetClicks[0]
      touchpoints = [
        { click: targetClicks[0], weight: 0.5 },
        { click: targetClicks[1], weight: 0.5 }
      ]
    } else {
      primaryClick = targetClicks[0]
      // U型归因：first 40%, last 40%, middle 20%
      // targetClicks 是降序，[0] 是 last, [n-1] 是 first
      touchpoints = targetClicks.map((click, index) => {
        if (index === 0) return { click, weight: 0.4 } // last click
        if (index === n - 1) return { click, weight: 0.4 } // first click
        return { click, weight: 0.2 / (n - 2) } // middle clicks
      })
    }
  }

  return {
    click: primaryClick,
    touchpoints,
    model,
    lookbackDays,
    totalTouchpointsCount: targetClicks.length,
    matchedBy,
    fallbackUsed,
  }
}

export function getClicksByReferralId(referralId: string): ReferralClick[] {
  return getAllReferralClicks().filter(c => c.referralId === referralId)
}

export function getClicksByStaffId(staffId: string): ReferralClick[] {
  return getAllReferralClicks().filter(c => c.staffId === staffId)
}

export function markTouchpointsAsConverted(touchpoints: AttributedTouchpoint[], orderId: string, totalRevenue: number): boolean {
  ensureFile(CLICK_FILE)
  const clicks = getAllReferralClicks()
  let anyUpdated = false

  for (const tp of touchpoints) {
    const idx = clicks.findIndex(c => c.id === tp.click.id)
    if (idx < 0 || clicks[idx].converted) continue

    clicks[idx] = {
      ...clicks[idx],
      converted: true,
      orderId,
    }
    anyUpdated = true

    const link = getReferralLinkById(clicks[idx].referralId)
    if (link) {
      updateReferralLink(clicks[idx].referralId, {
        conversions: link.conversions + tp.weight, // conversion can be fractional in multi-touch
        revenue: link.revenue + totalRevenue * tp.weight,
      })
    }
  }

  if (anyUpdated) {
    fs.writeFileSync(CLICK_FILE, JSON.stringify(clicks, null, 2), 'utf-8')
  }
  return anyUpdated
}

// 保持向下兼容
export function markClickAsConverted(clickId: string, orderId: string, revenue: number): boolean {
  const click = getAllReferralClicks().find(c => c.id === clickId)
  if (!click) return false
  return markTouchpointsAsConverted([{ click, weight: 1.0 }], orderId, revenue)
}

export function getReferralStats(staffId?: string): {
  totalLinks: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  conversionRate: number
  clicksByPlatform: Record<string, number>
  clicksByChannel: Record<string, number>
  conversionsByChannel: Record<string, number>
  conversionsByPlatform: Record<string, number>
  revenueByPlatform: Record<string, number>
  clicksByStaff: Record<string, { clicks: number; conversions: number; revenue: number; name: string; avatar?: string }>
  recentClicks: ReferralClick[]
  allClicks: ReferralClick[]
  topLinks: ReferralLink[]
  allLinks: ReferralLink[]
} {
  const links = staffId ? getReferralLinksByStaffId(staffId) : getAllReferralLinks()
  const clicks = staffId ? getClicksByStaffId(staffId) : getAllReferralClicks()

  const totalLinks = links.length
  const totalClicks = clicks.length
  const convertedClicks = clicks.filter(c => c.converted)
  const totalConversions = convertedClicks.length
  const totalRevenue = links.reduce((s, l) => s + l.revenue, 0)
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

  const clicksByPlatform: Record<string, number> = {}
  const clicksByChannel: Record<string, number> = {}
  const conversionsByChannel: Record<string, number> = {}
  const conversionsByPlatform: Record<string, number> = {}
  const revenueByPlatform: Record<string, number> = {}
  const clicksByStaff: Record<string, { clicks: number; conversions: number; revenue: number; name: string; avatar?: string }> = {}

  clicks.forEach(c => {
    clicksByPlatform[c.platform] = (clicksByPlatform[c.platform] || 0) + 1
    const channel = c.sourceChannel || 'direct'
    clicksByChannel[channel] = (clicksByChannel[channel] || 0) + 1
    if (c.converted) {
      conversionsByPlatform[c.platform] = (conversionsByPlatform[c.platform] || 0) + 1
      conversionsByChannel[channel] = (conversionsByChannel[channel] || 0) + 1
    }
    const staffData = clicksByStaff[c.staffId]
    if (!staffData) {
      const link = getReferralLinkById(c.referralId)
      clicksByStaff[c.staffId] = {
        clicks: 1,
        conversions: c.converted ? 1 : 0,
        revenue: 0,
        name: link?.staffName || 'Unknown',
        avatar: link?.staffAvatar,
      }
    } else {
      staffData.clicks++
      if (c.converted) staffData.conversions++
    }
  })

  links.forEach(l => {
    revenueByPlatform[l.platform] = (revenueByPlatform[l.platform] || 0) + l.revenue
    const staffData = clicksByStaff[l.staffId]
    if (staffData) {
      staffData.revenue += l.revenue
    }
  })

  const sortedLinks = [...links].sort((a, b) => b.clicks - a.clicks)

  return {
    totalLinks,
    totalClicks,
    totalConversions,
    totalRevenue,
    conversionRate: Math.round(conversionRate * 100) / 100,
    clicksByPlatform,
    clicksByChannel,
    conversionsByChannel,
    conversionsByPlatform,
    revenueByPlatform,
    clicksByStaff,
    recentClicks: clicks.slice(0, 20),
    allClicks: clicks,
    topLinks: sortedLinks.slice(0, 10),
    allLinks: links,
  }
}

export function getStaffReferralStats(staffId: string): {
  totalLinks: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  conversionRate: number
  clicksByPlatform: Record<string, number>
  clicksByChannel: Record<string, number>
  topLinks: ReferralLink[]
} {
  const links = getReferralLinksByStaffId(staffId)
  const clicks = getClicksByStaffId(staffId)

  const totalLinks = links.length
  const totalClicks = clicks.length
  const totalConversions = clicks.filter(c => c.converted).length
  const totalRevenue = links.reduce((s, l) => s + l.revenue, 0)
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

  const clicksByPlatform: Record<string, number> = {}
  const clicksByChannel: Record<string, number> = {}
  clicks.forEach(c => {
    clicksByPlatform[c.platform] = (clicksByPlatform[c.platform] || 0) + 1
    const channel = c.sourceChannel || 'direct'
    clicksByChannel[channel] = (clicksByChannel[channel] || 0) + 1
  })

  const sortedLinks = [...links].sort((a, b) => b.clicks - a.clicks)

  return {
    totalLinks,
    totalClicks,
    totalConversions,
    totalRevenue,
    conversionRate: Math.round(conversionRate * 100) / 100,
    clicksByPlatform,
    clicksByChannel,
    topLinks: sortedLinks.slice(0, 5),
  }
}
