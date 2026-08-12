export interface InsightReferralLink {
  id: string
  clicks: number
  conversions: number
  revenue: number
}

export interface InsightSocialContentRecord {
  id: string
  platform: string
  status: 'draft' | 'published' | 'manual_action_required' | 'failed'
  contentTitle: string
  contentBody: string
  productName?: string
  referralLinkId?: string
  publishedAt?: string
}

export function getInstagramInsightsSummary(
  records: InsightSocialContentRecord[],
  referralLinks: InsightReferralLink[]
) {
  const instagramRecords = records.filter(record => record.platform === 'instagram')
  const publishedRecords = instagramRecords.filter(record => record.status === 'published')

  const recordsWithMetrics = publishedRecords.map(record => {
    const link = referralLinks.find(item => item.id === record.referralLinkId)
    const clicks = link?.clicks || 0
    const conversions = link?.conversions || 0
    const revenue = link?.revenue || 0
    return {
      ...record,
      clicks,
      conversions,
      revenue,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      revenuePerClick: clicks > 0 ? revenue / clicks : 0,
    }
  })

  const totals = recordsWithMetrics.reduce(
    (acc, record) => {
      acc.clicks += record.clicks
      acc.conversions += record.conversions
      acc.revenue += record.revenue
      return acc
    },
    { clicks: 0, conversions: 0, revenue: 0 }
  )

  const rankedByRevenue = [...recordsWithMetrics].sort((a, b) => b.revenue - a.revenue)
  const rankedByClicks = [...recordsWithMetrics].sort((a, b) => b.clicks - a.clicks)

  return {
    totalRecords: instagramRecords.length,
    publishedRecords: publishedRecords.length,
    recordsWithTraffic: recordsWithMetrics.filter(record => record.clicks > 0).length,
    totalClicks: totals.clicks,
    totalConversions: totals.conversions,
    totalRevenue: totals.revenue,
    avgClicksPerPost: publishedRecords.length > 0 ? totals.clicks / publishedRecords.length : 0,
    avgRevenuePerPost: publishedRecords.length > 0 ? totals.revenue / publishedRecords.length : 0,
    conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
    topRevenueRecord: rankedByRevenue[0] || null,
    topTrafficRecord: rankedByClicks[0] || null,
    recordsWithMetrics: rankedByRevenue,
  }
}
